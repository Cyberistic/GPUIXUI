/**
 * The tree in the real GPUix renderer, mounted through the shipped example.
 *
 * The bugs these guard are the ones the window probes found and a pure reducer
 * cannot see:
 *
 * - a nested row that does not inset, so the hierarchy reads as a flat list;
 * - an arrow key that moves the cursor without moving native focus, so the next
 *   key goes to the row the reader left;
 * - a press on a folder that reports the row but never opens it;
 * - Left closing a branch and leaving it in the same press, which loses the
 *   reader's place;
 * - a reveal that moves the cursor without opening the path to it, so the row
 *   it names is not painted.
 */

import { Input } from "@gpuixui/primitives";
import { darkTheme, pointerWash } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { TreeExample } from "../../examples/tree.example.js";
import { decodeA11yTree } from "../internal/a11y.js";
import {
  after,
  clickCentreOf,
  focusedTestId,
  paintedText,
  pressKey,
  requireBounds,
  requireStyle,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { TREE_INDENT } from "../tree/logic.js";
import { TreeView, useExpandedRows } from "../index.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<TreeExample />);
  settle(root);
  return root;
};

const readout = (root: DataTestRoot): string =>
  root.renderer.getAllText().join(" ");

afterEach(() => {
  root?.unmount();
  root = undefined;
});

interface TreeNode {
  readonly name: string;
  readonly children?: ReadonlyArray<TreeNode>;
}

const fieldTree: ReadonlyArray<TreeNode> = [
  { name: "src", children: [{ name: "child.ts" }] },
  { name: "readme.md" },
];

const fieldKeyOf = (node: TreeNode): string => node.name;
const fieldChildrenOf = (node: TreeNode): ReadonlyArray<TreeNode> =>
  node.children ?? [];

/**
 * A tree whose active branch holds a field.
 *
 * A key is dispatched along the **focus path** (`press-routing-lifecycle`'s
 * `field-cell` route), so a key typed in a field inside a tree row still reaches
 * the row's `onKeyDown`: an unguarded tree toggles the branch on a space and
 * moves the cursor on a typed character while the reader edits the field.
 */
const TreeFieldFixture = () => {
  const [note, setNote] = useState("");
  const tree = useExpandedRows({
    roots: fieldTree,
    keyOf: fieldKeyOf,
    childrenOf: fieldChildrenOf,
    labelOf: fieldKeyOf,
    initialActive: "src",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <text testId="field-tree-readout">
        {`active=${Option.getOrElse(tree.active, () => "-")} note=${note}`}
      </text>
      <TreeView
        testId="field-tree"
        aria-label="Files with a field"
        height={200}
        rows={tree.rows}
        cursor={tree.cursor}
        onCursorChange={tree.setCursor}
        labelOf={fieldKeyOf}
        renderRow={(row) =>
          row.key === "src" ? (
            <Input
              label="Rename"
              value={note}
              onValueChange={setNote}
              size="sm"
              testId="field-note"
            />
          ) : (
            <text>{row.key}</text>
          )
        }
      />
    </div>
  );
};

/**
 * A tree whose node names never arrived — the accessor answers blank for every
 * node, which is what a listing that could not read a name hands over.
 */
const BlankNameTree = () => {
  const tree = useExpandedRows({
    roots: [{ name: "alpha" }, { name: "beta" }],
    keyOf: (node) => node.name,
    childrenOf: () => [],
    labelOf: () => "",
  });
  return (
    <TreeView
      testId="blank-tree"
      aria-label="Files"
      height={120}
      rows={tree.rows}
      cursor={tree.cursor}
      onCursorChange={tree.setCursor}
      labelOf={() => ""}
    />
  );
};

/**
 * A tree whose saved expansion set the store wrote as something else.
 *
 * A workspace records its open folders, and JSON has no `Set`: a record saved
 * by one release and read by another can hand back an object (`{ "src": true }`)
 * or any other value where the expansion list belongs.
 */
const StoredExpansionTree = () => {
  const tree = useExpandedRows({
    roots: fieldTree,
    keyOf: fieldKeyOf,
    childrenOf: fieldChildrenOf,
    labelOf: fieldKeyOf,
    // @ts-expect-error — an expansion a store wrote as something else.
    initialExpanded: { src: true },
  });
  return (
    <TreeView
      testId="stored-tree"
      aria-label="Files"
      height={120}
      rows={tree.rows}
      cursor={tree.cursor}
      onCursorChange={tree.setCursor}
      labelOf={fieldKeyOf}
    />
  );
};

/**
 * A saved tree whose leaves carry no children list.
 *
 * JSON writes `null` (or drops the key) for a field a record never set, so a
 * stored hierarchy is a branch with a list of children and a leaf with `null`
 * where its list belongs — the ordinary shape a file tree arrives in.
 */
interface StoredNode {
  readonly name: string;
  readonly children?: ReadonlyArray<StoredNode> | null;
}

const StoredChildrenTree = () => {
  const roots: ReadonlyArray<StoredNode> = [
    { name: "src", children: [{ name: "index.ts", children: null }] },
    { name: "readme.md", children: null },
  ];
  const tree = useExpandedRows({
    roots,
    keyOf: (node) => node.name,
    childrenOf: (node) => node.children,
    labelOf: (node) => node.name,
  });
  return (
    <TreeView
      testId="stored-children"
      aria-label="Saved files"
      height={120}
      rows={tree.rows}
      cursor={tree.cursor}
      onCursorChange={tree.setCursor}
      labelOf={(node) => node.name}
    />
  );
};

describe("the file tree", () => {
  it("opens the folder a press lands on, and reports the row", () => {
    const root = mount();

    // `src` starts open, so its two children paint and `docs` stays shut.
    expect(readout(root)).toContain("5 rows · active=src");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeUndefined();

    clickCentreOf(root, "tree-row-docs");
    root.renderer.flush();

    expect(readout(root)).toContain("7 rows · active=docs");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeDefined();
  });

  it("insets a child row one step under its parent", () => {
    const root = mount();

    // `src` starts open and `components` shut, so open it to paint the
    // grandchild the second step is measured on.
    clickCentreOf(root, "tree-row-components");
    root.renderer.flush();

    const parent = requireBounds(root, "tree-row-src-slot");
    const child = requireBounds(root, "tree-row-components-slot");
    const grandchild = requireBounds(root, "tree-row-table-slot");

    // The chevron slot is the row's own inset, so a child starts one step in
    // and a grandchild two — the measured 16px per level.
    expect(child.x - parent.x).toBe(TREE_INDENT);
    expect(grandchild.x - parent.x).toBe(TREE_INDENT * 2);
  });

  it("walks the rows with the arrow keys and moves native focus with them", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "down");
    root.renderer.flush();

    // The cursor moved…
    expect(readout(root)).toContain("active=components");
    // …and so did the platform focus, which is what the next key needs.
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-components"));
  });

  it("opens a branch on Right and closes it on Left, keeping the row", () => {
    const root = mount();

    // `components` is closed under an open `src`: Right opens it…
    pressKey(root, "tree-row-src", "right");
    pressKey(root, "tree-row-components", "right");
    root.renderer.flush();
    expect(root.renderer.findByTestId("tree-row-button.tsx")).toBeDefined();

    // …and Left closes it without leaving the row.
    pressKey(root, "tree-row-components", "left");
    root.renderer.flush();
    expect(readout(root)).toContain("active=components");
    expect(root.renderer.findByTestId("tree-row-button.tsx")).toBeUndefined();
  });

  it("paints the active row in the selection pair", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "down");
    root.renderer.flush();

    expect(requireStyle(root, "tree-row-components").backgroundColor).toBe(
      darkTheme.colors.selected,
    );
    expect(requireStyle(root, "tree-row-src").backgroundColor).not.toBe(
      darkTheme.colors.selected,
    );
  });

  it("answers the pointer's press one step past the wash it replaces", () => {
    const root = mount();

    // A row that painted its press like its hover answers only half the
    // pointer. The cursor starts on `src`, so the two rows show both states:
    // chosen (`accent` under the pointer) and unchosen (`hover`).
    expect(requireStyle(root, "tree-row-src").hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });
    expect(requireStyle(root, "tree-row-src").active).toMatchObject({
      backgroundColor:
        pointerWash(darkTheme, "active", "accent") ?? darkTheme.colors.active,
    });

    expect(requireStyle(root, "tree-row-docs").hover).toMatchObject({
      backgroundColor: darkTheme.colors.hover,
    });
    expect(requireStyle(root, "tree-row-docs").active).toMatchObject({
      backgroundColor:
        pointerWash(darkTheme, "active", "hover") ?? darkTheme.colors.active,
    });

    // A press chooses the row, and its pointer states follow the selection.
    clickCentreOf(root, "tree-row-docs");
    root.renderer.flush();

    expect(requireStyle(root, "tree-row-docs").hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });
  });

  it("moves the cursor to the row a typed prefix names", () => {
    const root = mount();

    clickCentreOf(root, "tree-expand");
    root.renderer.flush();

    pressKey(root, "tree-row-src", "r");
    root.renderer.flush();

    // `row.tsx` is the first row after `src` that starts with `r`.
    expect(readout(root)).toContain("active=row.tsx");
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });

  it("reveals a deep row by opening the path to it, and takes the focus off the press", async () => {
    const root = mount();

    // `row.tsx` is two closed folders deep when the reveal runs.
    clickCentreOf(root, "tree-reveal");
    root.renderer.flush();

    expect(readout(root)).toContain("active=row.tsx");
    expect(root.renderer.findByTestId("tree-row-row.tsx")).toBeDefined();

    // A window hands the **press's** focus to the control it landed on after
    // the commit, which is what a reveal has to survive (`data-tree-lifecycle`
    // measured the button keeping it). Simulate that landing...
    const button = root.renderer.findByTestId("tree-reveal");
    if (button === undefined)
      throw new Error("behaviour: no tree-reveal button");
    root.renderer.focusElement(button.id);
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-reveal"));

    // ...and the revealed row takes it on the next tick.
    await after(5);
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });

  it("takes the focus on a reveal after a key that moved nothing", async () => {
    const root = mount();

    // Up on the first row clamps in place: the tree commits a cursor whose
    // active row has not changed. That is not a move the tree made, so it must
    // not make the next caller-driven reveal look like one.
    pressKey(root, "tree-row-src", "up");
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-src"));

    clickCentreOf(root, "tree-reveal");
    root.renderer.flush();
    expect(readout(root)).toContain("active=row.tsx");
    expect(root.renderer.findByTestId("tree-row-row.tsx")).toBeDefined();

    // A window hands the press's focus to the button after the commit; the
    // reveal has to take the row back on the next tick, exactly as it does
    // when no key came before it.
    const button = root.renderer.findByTestId("tree-reveal");
    if (button === undefined)
      throw new Error("behaviour: no tree-reveal button");
    root.renderer.focusElement(button.id);
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-reveal"));

    await after(5);
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });

  it("keeps a key typed in a row's field to that field", () => {
    root = renderData(<TreeFieldFixture />);
    settle(root);

    // `src` starts closed, so its child is the branch state's witness.
    expect(
      root.renderer.findByTestId("field-tree-row-child.ts"),
    ).toBeUndefined();

    // Space is the field's value: it must not toggle the branch the field sits
    // in (`press-routing-lifecycle` measured the key reaching the row handler).
    pressKey(root, "field-note", "space");
    root.renderer.flush();
    expect(
      root.renderer.findByTestId("field-tree-row-child.ts"),
    ).toBeUndefined();

    // A printable character is the field's text, not the tree's type-ahead: an
    // unguarded buffer would move the cursor to `readme.md` while the reader
    // types a name.
    pressKey(root, "field-note", "r");
    root.renderer.flush();
    expect(paintedText(root)).toContain("active=src");

    // The row itself still owns Enter, so the guard refuses only a descendant's
    // keys — not the row's own.
    pressKey(root, "field-tree-row-src", "enter");
    root.renderer.flush();
    expect(root.renderer.findByTestId("field-tree-row-child.ts")).toBeDefined();
  });

  it("names a row whose label arrived blank by the key it is stored by", () => {
    // Bug guarded: `labelOf` is a caller's accessor over its own nodes, so it
    // can answer blank — a listing that could not read a name, a record restored
    // without its title — and the row's label is both what it paints and the
    // only name a reader gets. It published an unnamed tree item while the row
    // was still there to press. The key is the identity the tree expands,
    // focuses and reports by, so a blank label reads as that key.
    root = renderData(<BlankNameTree />);
    settle(root);

    const tree = decodeA11yTree(root.renderer.getA11yTree());
    const names = Arr.map(
      Object.values(tree.nodes),
      (node) => node.aria.label ?? "",
    );
    expect(names).toEqual(expect.arrayContaining(["alpha", "beta"]));
    // The paint and the name are one reading.
    expect(paintedText(root)).toContain("alpha");
  });

  it("reaches a blank-labelled row by typing the key it is named by", () => {
    // Bug guarded: the row paints and announces its key when `labelOf` answers
    // blank, but the type-ahead seam was handed the raw label, so the one word
    // the row is named by could not reach it — a tree of rows whose names never
    // arrived painted `alpha`/`beta` and no typed prefix could move to them.
    root = renderData(<BlankNameTree />);
    settle(root);

    pressKey(root, "blank-tree-row-alpha", "b");
    root.renderer.flush();

    expect(focusedTestId(root)).toEqual(Option.some("blank-tree-row-beta"));
  });

  it("opens a stored expansion set the store wrote as a non-list", () => {
    // Bug guarded: a saved workspace records its open folders, and JSON has no
    // `Set`, so a record can hand back an object where the expansion list
    // belongs. The controller built its set with `HashSet.fromIterable` straight
    // off the prop, which threw `TypeError: object is not iterable` during the
    // first render — a restored tree failed to open at all. A value that is not
    // an iterable of text keys is no expansion, which is the state a fresh tree
    // starts in: every folder closed, every root painted.
    root = renderData(<StoredExpansionTree />);
    settle(root);

    expect(paintedText(root)).toContain("src");
    expect(paintedText(root)).toContain("readme.md");
    expect(root.renderer.findByTestId("stored-tree-row-child.ts")).toBe(
      undefined,
    );
  });

  it("paints a tree whose stored leaves carry no children list", () => {
    // Bug guarded: a leaf's children list is stored data, and a store writes
    // `null` (or omits the key) for one a record never carried. The flatten
    // handed that value to `Arr.isReadonlyArrayNonEmpty`, whose `null.length`
    // read threw `TypeError: Cannot read properties of null (reading 'length')`
    // out of the first render — a saved tree painted nothing at all, not even
    // the branch above the leaf.
    root = renderData(<StoredChildrenTree />);
    settle(root);

    expect(paintedText(root)).toContain("src");
    expect(paintedText(root)).toContain("readme.md");
    // The leaf is a leaf: it paints no chevron and opens no branch.
    expect(
      root.renderer.findByTestId("stored-children-row-index.ts"),
    ).toBeUndefined();

    clickCentreOf(root, "stored-children-row-src");
    root.renderer.flush();

    expect(paintedText(root)).toContain("index.ts");
  });
});
