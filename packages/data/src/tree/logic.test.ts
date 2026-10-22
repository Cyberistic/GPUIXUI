/**
 * The tree model: what paints, what a key does, and what a typed prefix means.
 *
 * The bugs these guard are the ones a tree view ships with:
 *
 * - a nested branch painting because its parent is open, when its own entry is
 *   closed (expansion is per node, not inherited);
 * - a caller's cycle hanging the flatten, or a duplicated key painting two rows
 *   that answer to one cursor;
 * - Right opening a branch but never stepping into it, so a keyboard reader can
 *   never reach a child;
 * - Left stepping to a parent while the branch is still open, which loses the
 *   reader's place;
 * - a type-ahead that finds the row it is already on, so a second letter never
 *   advances.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import {
  branchKeys,
  collapseAll,
  emptyCursor,
  expandAll,
  expandTo,
  expandedPath,
  flattenTree,
  idleTypeAhead,
  isExpanded,
  setExpanded,
  toggleExpanded,
  treeCursorMove,
  typeAheadPress,
  typeAheadRow,
  type TreeRow,
  type TreeSpec,
} from "./logic.js";

interface Node {
  readonly name: string;
  readonly children?: ReadonlyArray<Node>;
}

const node = (name: string, children?: ReadonlyArray<Node>): Node => ({
  name,
  ...(children === undefined ? {} : { children }),
});

const tree: ReadonlyArray<Node> = [
  node("src", [
    node("components", [node("button.tsx"), node("table", [node("row.tsx")])]),
    node("index.ts"),
  ]),
  node("readme.md"),
];

const spec: TreeSpec<Node> = {
  keyOf: (value) => value.name,
  childrenOf: (value) => value.children ?? [],
};

const keys = (rows: ReadonlyArray<TreeRow<Node>>): ReadonlyArray<string> =>
  Arr.map(rows, (row) => row.key);

const open = (...values: ReadonlyArray<string>): HashSet.HashSet<string> =>
  HashSet.fromIterable(values);

describe("the flattened tree", () => {
  it("paints only the roots while nothing is open", () => {
    const rows = flattenTree(tree, spec, collapseAll());
    expect(keys(rows)).toEqual(["src", "readme.md"]);
    expect(Arr.map(rows, (row) => row.depth)).toEqual([0, 0]);
    expect(rows[0]?.parent).toEqual(Option.none());
  });

  it("opens one node without opening its children", () => {
    const rows = flattenTree(tree, spec, open("src"));
    expect(keys(rows)).toEqual(["src", "components", "index.ts", "readme.md"]);
    // `components` is a branch, but it is closed: its own entry decides, not
    // its parent's.
    const components = rows[1];
    expect(components?.depth).toBe(1);
    expect(components?.hasChildren).toBe(true);
    expect(components?.expanded).toBe(false);
    expect(components?.parent).toEqual(Option.some("src"));
  });

  it("paints a duplicated key once and survives a cycle", () => {
    const cyclic = node("loop", [node("loop")]);
    const rows = flattenTree(
      [node("a", [node("a"), node("b")]), cyclic],
      spec,
      open("a", "loop"),
    );
    // A key is one row: a repeated sibling and a node under itself both stop.
    expect(keys(rows)).toEqual(["a", "b", "loop"]);
    expect(Arr.filter(rows, (row) => row.key === "a")).toHaveLength(1);
  });

  it("lists every branch, opens all of them, and closes them again", () => {
    expect(branchKeys(tree, spec)).toEqual(["src", "components", "table"]);
    const all = expandAll(tree, spec);
    expect(keys(flattenTree(tree, spec, all))).toEqual([
      "src",
      "components",
      "button.tsx",
      "table",
      "row.tsx",
      "index.ts",
      "readme.md",
    ]);
    expect(HashSet.size(collapseAll())).toBe(0);
  });

  it("flips one node without touching its siblings", () => {
    const once = toggleExpanded(emptyCursor.expanded, "src");
    expect(isExpanded(once, "src")).toBe(true);
    expect(isExpanded(once, "components")).toBe(false);
    expect(isExpanded(toggleExpanded(once, "src"), "src")).toBe(false);
    expect(isExpanded(setExpanded(collapseAll(), "src", true), "src")).toBe(
      true,
    );
  });

  it("opens the path to a deep row, so a reveal can find it", () => {
    expect(expandedPath(tree, spec, "row.tsx")).toEqual(
      Option.some(["src", "components", "table", "row.tsx"]),
    );
    const revealed = expandTo(collapseAll(), tree, spec, "row.tsx");
    expect(keys(flattenTree(tree, spec, revealed))).toContain("row.tsx");
    // A key the tree does not hold leaves the caller's set alone.
    const none = expandTo(revealed, tree, spec, "missing.ts");
    expect(HashSet.size(none)).toBe(HashSet.size(revealed));
  });
});

describe("the tree cursor", () => {
  const rows = flattenTree(tree, spec, open("src", "components"));

  it("walks the painted rows and clamps at both ends", () => {
    const first = treeCursorMove(rows, emptyCursor, "home");
    expect(first.active).toEqual(Option.some("src"));
    expect(treeCursorMove(rows, first, "up").active).toEqual(
      Option.some("src"),
    );
    const down = treeCursorMove(rows, first, "down");
    expect(down.active).toEqual(Option.some("components"));
    const last = treeCursorMove(rows, first, "end");
    expect(last.active).toEqual(Option.some("readme.md"));
    expect(treeCursorMove(rows, last, "down").active).toEqual(
      Option.some("readme.md"),
    );
  });

  it("opens a branch on Right, then steps into it", () => {
    const onSrc = {
      expanded: open("src", "components"),
      active: Option.some("components"),
    };
    // `components` has a child (`button.tsx`) that is closed away: Right opens
    // it, and a second Right steps to the child that now paints.
    const opened = treeCursorMove(
      rows,
      { ...onSrc, active: Option.some("src") },
      "right",
    );
    expect(isExpanded(opened.expanded, "src")).toBe(true);
    const firstChild = treeCursorMove(
      rows,
      { ...opened, active: Option.some("src") },
      "right",
    );
    expect(firstChild.expanded).toEqual(opened.expanded);
    expect(firstChild.active).toEqual(Option.some("components"));
  });

  it("steps out of a child on Left, and closes a branch before leaving it", () => {
    const onChild = {
      expanded: open("src", "components"),
      active: Option.some("button.tsx"),
    };
    // A leaf has nothing to close, so Left steps to its parent…
    const parent = treeCursorMove(rows, onChild, "left");
    expect(parent.active).toEqual(Option.some("components"));
    expect(isExpanded(parent.expanded, "components")).toBe(true);
    // …and the branch itself closes before a second Left leaves it.
    const collapsed = treeCursorMove(rows, parent, "left");
    expect(isExpanded(collapsed.expanded, "components")).toBe(false);
    expect(treeCursorMove(rows, collapsed, "left").active).toEqual(
      Option.some("src"),
    );
  });

  it("toggles the branch under Enter or Space and leaves a leaf alone", () => {
    const onSrc = {
      ...emptyCursor,
      expanded: open("src"),
      active: Option.some("src"),
    };
    expect(
      isExpanded(treeCursorMove(rows, onSrc, "enter").expanded, "src"),
    ).toBe(false);
    expect(
      isExpanded(treeCursorMove(rows, onSrc, "space").expanded, "src"),
    ).toBe(false);
    const onLeaf = { ...onSrc, active: Option.some("readme.md") };
    expect(treeCursorMove(rows, onLeaf, "enter")).toEqual(onLeaf);
    expect(treeCursorMove(rows, onLeaf, "right")).toEqual(onLeaf);
  });
});

describe("the typed prefix", () => {
  const rows = flattenTree(tree, spec, expandAll(tree, spec));
  const labelOf = (row: TreeRow<Node>): string => row.node.name;

  it("finds the first row after the cursor and wraps", () => {
    expect(typeAheadRow(rows, Option.none(), "t", labelOf)).toEqual(
      Option.some("table"),
    );
    // After `table`, the next `t` wraps to the same one — the only match.
    expect(typeAheadRow(rows, Option.some("table"), "t", labelOf)).toEqual(
      Option.some("table"),
    );
    // Case-insensitive, and the first match in paint order.
    expect(typeAheadRow(rows, Option.none(), "R", labelOf)).toEqual(
      Option.some("row.tsx"),
    );
    // From that row the same prefix advances, which is what a repeated letter
    // needs.
    expect(typeAheadRow(rows, Option.some("row.tsx"), "r", labelOf)).toEqual(
      Option.some("readme.md"),
    );
  });

  it("keeps the cursor when nothing matches", () => {
    expect(typeAheadRow(rows, Option.some("src"), "zz", labelOf)).toEqual(
      Option.none(),
    );
    expect(typeAheadRow(rows, Option.some("src"), "   ", labelOf)).toEqual(
      Option.none(),
    );
  });

  it("starts over after the window and keeps a repeated letter", () => {
    const first = typeAheadPress(idleTypeAhead, "t", 1_000);
    expect(first.text).toBe("t");
    // Inside the window a second letter narrows the prefix…
    expect(typeAheadPress(first, "a", 1_100).text).toBe("ta");
    // …but a repeated letter is one search the next press advances.
    expect(typeAheadPress(first, "t", 1_100).text).toBe("t");
    // After the window the prefix starts again.
    expect(typeAheadPress(first, "r", 1_600).text).toBe("r");
  });
});
