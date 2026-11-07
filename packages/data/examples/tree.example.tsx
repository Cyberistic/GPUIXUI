/** @jsxImportSource @gpuix/react */
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
        testId="data-tree-readout"
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
