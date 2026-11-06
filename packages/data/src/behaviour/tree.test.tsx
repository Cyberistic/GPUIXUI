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

    expect(readout(root)).toContain("5 rows · active=src");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeUndefined();

    clickCentreOf(root, "tree-row-docs");
    root.renderer.flush();

    expect(readout(root)).toContain("7 rows · active=docs");
    expect(root.renderer.findByTestId("tree-row-readme.md")).toBeDefined();
  });

  it("insets a child row one step under its parent", () => {
    const root = mount();

    clickCentreOf(root, "tree-row-components");
    root.renderer.flush();

    const parent = requireBounds(root, "tree-row-src-slot");
    const child = requireBounds(root, "tree-row-components-slot");
    const grandchild = requireBounds(root, "tree-row-table-slot");

    expect(child.x - parent.x).toBe(TREE_INDENT);
    expect(grandchild.x - parent.x).toBe(TREE_INDENT * 2);
  });

  it("walks the rows with the arrow keys and moves native focus with them", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "down");
    root.renderer.flush();

    expect(readout(root)).toContain("active=components");

    expect(focusedTestId(root)).toEqual(Option.some("tree-row-components"));
  });

  it("opens a branch on Right and closes it on Left, keeping the row", () => {
    const root = mount();

    pressKey(root, "tree-row-src", "right");
    pressKey(root, "tree-row-components", "right");
    root.renderer.flush();
    expect(root.renderer.findByTestId("tree-row-button.tsx")).toBeDefined();

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

    expect(readout(root)).toContain("active=row.tsx");
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-row.tsx"));
  });

  it("reveals a deep row by opening the path to it, and takes the focus off the press", async () => {
    const root = mount();

    clickCentreOf(root, "tree-reveal");
    root.renderer.flush();

    expect(readout(root)).toContain("active=row.tsx");
    expect(root.renderer.findByTestId("tree-row-row.tsx")).toBeDefined();

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

  it("takes the focus on a reveal after a key that moved nothing", async () => {
    const root = mount();

    pressKey(root, "tree-row-src", "up");
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("tree-row-src"));

    clickCentreOf(root, "tree-reveal");
    root.renderer.flush();
    expect(readout(root)).toContain("active=row.tsx");
    expect(root.renderer.findByTestId("tree-row-row.tsx")).toBeDefined();

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

    expect(
      root.renderer.findByTestId("field-tree-row-child.ts"),
    ).toBeUndefined();

    pressKey(root, "field-note", "space");
    root.renderer.flush();
    expect(
      root.renderer.findByTestId("field-tree-row-child.ts"),
    ).toBeUndefined();

    pressKey(root, "field-note", "r");
    root.renderer.flush();
    expect(paintedText(root)).toContain("active=src");

    pressKey(root, "field-tree-row-src", "enter");
    root.renderer.flush();
    expect(root.renderer.findByTestId("field-tree-row-child.ts")).toBeDefined();
  });

  it("names a row whose label arrived blank by the key it is stored by", () => {
    root = renderData(<BlankNameTree />);
    settle(root);

    const tree = decodeA11yTree(root.renderer.getA11yTree());
    const names = Arr.map(
      Object.values(tree.nodes),
      (node) => node.aria.label ?? "",
    );
    expect(names).toEqual(expect.arrayContaining(["alpha", "beta"]));

    expect(paintedText(root)).toContain("alpha");
  });

  it("reaches a blank-labelled row by typing the key it is named by", () => {
    root = renderData(<BlankNameTree />);
    settle(root);

    pressKey(root, "blank-tree-row-alpha", "b");
    root.renderer.flush();

    expect(focusedTestId(root)).toEqual(Option.some("blank-tree-row-beta"));
  });

  it("opens a stored expansion set the store wrote as a non-list", () => {
    root = renderData(<StoredExpansionTree />);
    settle(root);

    expect(paintedText(root)).toContain("src");
    expect(paintedText(root)).toContain("readme.md");
    expect(root.renderer.findByTestId("stored-tree-row-child.ts")).toBe(
      undefined,
    );
  });

  it("paints a tree whose stored leaves carry no children list", () => {
    root = renderData(<StoredChildrenTree />);
    settle(root);

    expect(paintedText(root)).toContain("src");
    expect(paintedText(root)).toContain("readme.md");

    expect(
      root.renderer.findByTestId("stored-children-row-index.ts"),
    ).toBeUndefined();

    clickCentreOf(root, "stored-children-row-src");
    root.renderer.flush();

    expect(paintedText(root)).toContain("index.ts");
  });
});
