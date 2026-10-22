/**
 * A workspace file tree: open a folder, walk the rows from the keyboard and
 * jump to a row by typing its name.
 *
 * This is the whole composition a consumer copies. The controller holds the
 * expansion set and the cursor; `TreeView` paints the rows and owns the tab stop,
 * the key contract and the type-ahead buffer:
 *
 * - **one tab stop**: the row the cursor stands on, so the arrows move real
 *   native focus instead of mounting a stop per row;
 * - **Right** opens a closed branch or steps into an open one, **Left** closes
 *   it or steps out to the parent, and **Enter** or **Space** flip it;
 * - a **press** on a folder opens it and reports the row, exactly like a press
 *   on a file, which is what lets one handler serve both;
 * - **Reveal** opens the path to a deep node and moves the cursor to it, the
 *   shape a search hit or a "show this file" action needs.
 *
 * The readout paints the visible count and the active row, so a behaviour suite
 * can read the cursor without reaching into the component.
 */

import { Button } from "@gpuixui/primitives/button";
import * as Option from "effect/Option";
import { TreeView, useExpandedRows } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

interface FileNode {
  readonly name: string;
  readonly children?: ReadonlyArray<FileNode>;
}

const file = (name: string, children?: ReadonlyArray<FileNode>): FileNode => ({
  name,
  ...(children === undefined ? {} : { children }),
});

/** A workspace small enough to read and deep enough to walk. */
const workspace: ReadonlyArray<FileNode> = [
  file("src", [
    file("components", [
      file("button.tsx"),
      file("table", [file("row.tsx"), file("header.tsx")]),
    ]),
    file("index.ts"),
  ]),
  file("docs", [file("readme.md"), file("guide.md")]),
  file("package.json"),
];

const keyOf = (node: FileNode): string => node.name;
const childrenOf = (node: FileNode): ReadonlyArray<FileNode> =>
  node.children ?? [];
const labelOf = (node: FileNode): string => node.name;

/** The tree and the readout that proves what it did. */
export const TreeExample = () => {
  const theme = useTheme();
  const tree = useExpandedRows({
    roots: workspace,
    keyOf,
    childrenOf,
    labelOf,
    initialExpanded: ["src"],
    initialActive: "src",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 420,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onActivate={tree.expandAll}
          testId="tree-expand"
        >
          Expand all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onActivate={tree.collapseAll}
          testId="tree-collapse"
        >
          Collapse all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onActivate={() => tree.reveal("row.tsx")}
          testId="tree-reveal"
        >
          Reveal row.tsx
        </Button>
      </div>
      <text
        testId="tree-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${tree.rows.length} rows · active=${Option.getOrElse(tree.active, () => "-")}`}
      </text>
      <TreeView
        testId="tree"
        aria-label="Workspace files"
        height={260}
        rows={tree.rows}
        cursor={tree.cursor}
        onCursorChange={tree.setCursor}
        labelOf={labelOf}
      />
    </div>
  );
};
