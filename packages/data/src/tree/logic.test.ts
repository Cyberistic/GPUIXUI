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
  expandedSet,
  flattenTree,
  isExpanded,
  paintedRows,
  setExpanded,
  toggleExpanded,
  treeCursorMove,
  treeName,
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

    expect(keys(rows)).toEqual(["a", "b", "loop"]);
    expect(Arr.filter(rows, (row) => row.key === "a")).toHaveLength(1);
  });

  it("reads a node's children list as a list, not as the value it was stored with", () => {
    interface Stored {
      readonly name: string;
      readonly children?: ReadonlyArray<Stored> | null;
    }
    const stored: TreeSpec<Stored> = {
      keyOf: (value) => value.name,
      childrenOf: (value) => value.children,
    };
    const roots: ReadonlyArray<Stored> = [
      {
        name: "src",
        children: [{ name: "index.ts", children: null }, { name: "readme.md" }],
      },
      { name: "empty", children: null },
    ];
    const rows = flattenTree(roots, stored, open("src"));
    expect(Arr.map(rows, (row) => row.key)).toEqual([
      "src",
      "index.ts",
      "readme.md",
      "empty",
    ]);
    expect(Arr.map(rows, (row) => row.hasChildren)).toEqual([
      true,
      false,
      false,
      false,
    ]);

    expect(branchKeys(roots, stored)).toEqual(["src"]);
    expect(expandedPath(roots, stored, "index.ts")).toEqual(
      Option.some(["src", "index.ts"]),
    );

    expect(flattenTree(null, stored, open("src"))).toEqual([]);
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

    const parent = treeCursorMove(rows, onChild, "left");
    expect(parent.active).toEqual(Option.some("components"));
    expect(isExpanded(parent.expanded, "components")).toBe(true);

    const collapsed = treeCursorMove(rows, parent, "left");
    expect(isExpanded(collapsed.expanded, "components")).toBe(false);
    expect(treeCursorMove(rows, collapsed, "left").active).toEqual(
      Option.some("src"),
    );
  });

  it("keeps a root in place on Left, because it has no parent to step out to", () => {
    const onRoot = {
      expanded: open("src", "components"),
      active: Option.some("readme.md"),
    };

    expect(treeCursorMove(rows, onRoot, "left")).toEqual(onRoot);

    const onClosedBranch = {
      expanded: open("components"),
      active: Option.some("src"),
    };
    expect(treeCursorMove(rows, onClosedBranch, "left")).toEqual(
      onClosedBranch,
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
  const row = (key: string, label: string): TreeRow<string> => ({
    node: label,
    key,
    depth: 0,
    parent: Option.none(),
    hasChildren: false,
    expanded: false,
  });
  const rows = [
    row("k1", "readme.md"),
    row("k2", "src"),
    row("k3", "row.tsx"),
    row("k4", "  row.child.tsx"),
    row("k5", "index.ts"),
  ];
  const labelOf = (candidate: TreeRow<string>): string => candidate.node;

  it("matches the row's label rather than its key", () => {
    expect(typeAheadRow(rows, Option.none(), "s", labelOf)).toEqual(
      Option.some("k2"),
    );

    expect(typeAheadRow(rows, Option.none(), "k", labelOf)).toEqual(
      Option.none(),
    );
  });

  it("finds the first row after the cursor and wraps", () => {
    expect(typeAheadRow(rows, Option.some("k1"), "r", labelOf)).toEqual(
      Option.some("k3"),
    );

    expect(typeAheadRow(rows, Option.some("k3"), "s", labelOf)).toEqual(
      Option.some("k2"),
    );
  });

  it("trims the label it matches, the way the published seam does", () => {
    expect(typeAheadRow(rows, Option.some("k1"), "row.c", labelOf)).toEqual(
      Option.some("k4"),
    );
  });

  it("keeps the cursor when nothing matches or the prefix is blank", () => {
    expect(typeAheadRow(rows, Option.some("k1"), "zz", labelOf)).toEqual(
      Option.none(),
    );
    expect(typeAheadRow(rows, Option.some("k1"), "   ", labelOf)).toEqual(
      Option.none(),
    );
  });

  it("searches a blank label by the key the row is painted and named by", () => {
    const blank = [row("alpha", ""), row("beta", "   ")];
    expect(typeAheadRow(blank, Option.none(), "a", labelOf)).toEqual(
      Option.some("alpha"),
    );
    expect(typeAheadRow(blank, Option.none(), "bet", labelOf)).toEqual(
      Option.some("beta"),
    );

    const named = [row("gamma", "Row")];
    expect(typeAheadRow(named, Option.none(), "g", labelOf)).toEqual(
      Option.none(),
    );
    expect(typeAheadRow(named, Option.none(), "r", labelOf)).toEqual(
      Option.some("gamma"),
    );
  });
});

describe("the rows a folding branch still paints", () => {
  const keys = (
    nodes: ReadonlyArray<
      { readonly key: string } | { readonly row: { readonly key: string } }
    >,
  ): string[] =>
    Arr.map(nodes, (entry) => ("row" in entry ? entry.row.key : entry.key));

  it("puts each leaving row back before the row it stood against", () => {
    const open = expandAll(tree, spec);
    const before = flattenTree(tree, spec, open);
    const after = flattenTree(tree, spec, toggleExpanded(open, "components"));
    const visible = HashSet.fromIterable(Arr.map(after, (row) => row.key));
    const leaving = Arr.filter(before, (row) => !HashSet.has(visible, row.key));

    const painted = paintedRows(after, leaving, before);

    expect(keys(Arr.filter(painted, (row) => !row.leaving))).toEqual(
      keys(after),
    );

    expect(keys(painted)).toEqual([
      "src",
      "components",
      "button.tsx",
      "table",
      "row.tsx",
      "index.ts",
      "readme.md",
    ]);
    expect(
      Arr.map(
        Arr.filter(painted, (row) => row.leaving),
        (row) => row.row.key,
      ),
    ).toEqual(["button.tsx", "table", "row.tsx"]);
  });

  it("closes a branch at the end of the tree at the end", () => {
    const tail: ReadonlyArray<Node> = [
      node("src"),
      node("docs", [node("theming.mdx")]),
    ];
    const open = expandAll(tail, spec);
    const before = flattenTree(tail, spec, open);
    const after = flattenTree(tail, spec, toggleExpanded(open, "docs"));
    const visible = HashSet.fromIterable(Arr.map(after, (row) => row.key));
    const leaving = Arr.filter(before, (row) => !HashSet.has(visible, row.key));

    expect(keys(paintedRows(after, leaving, before))).toEqual([
      "src",
      "docs",
      "theming.mdx",
    ]);
  });
});

describe("the name a row is painted by", () => {
  it("reads a blank label as the key the row is stored by", () => {
    expect(treeName("", "readme.md")).toBe("readme.md");
    expect(treeName("   ", "src")).toBe("src");
    expect(treeName("  readme.md  ", "readme.md")).toBe("readme.md");
  });
});

describe("an expansion set a store restored", () => {
  it("reads a list or a set of text keys", () => {
    const saved = Arr.fromIterable(expandedSet(["src", "docs"]));
    expect(saved).toHaveLength(2);
    expect(saved).toEqual(expect.arrayContaining(["src", "docs"]));
    expect(Arr.fromIterable(expandedSet(new Set(["src"])))).toEqual(["src"]);
  });

  it("is no expansion when the store wrote something that is not iterable", () => {
    expect(HashSet.size(expandedSet(null))).toBe(0);
    expect(HashSet.size(expandedSet(42))).toBe(0);
    expect(HashSet.size(expandedSet({ src: true }))).toBe(0);
    expect(HashSet.size(expandedSet(undefined))).toBe(0);
  });

  it("drops an entry that is not a text key", () => {
    const keys = Arr.fromIterable(expandedSet(["src", 7, null, "docs"]));
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(expect.arrayContaining(["src", "docs"]));
  });
});
