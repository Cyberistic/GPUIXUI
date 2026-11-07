/** @jsxImportSource @gpuix/react */
import { Button } from "@gpuixui/primitives/button";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { VirtualTree, useExpandedRows } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

export const VIRTUAL_TREE_DIRS = 40;

export const VIRTUAL_TREE_FILES = 99;

export const VIRTUAL_TREE_ROW_HEIGHT = 28;

export const VIRTUAL_TREE_HEIGHT = 280;

export const VIRTUAL_TREE_REVEAL = "dir-030";

interface Directory {
  readonly kind: "dir";
  readonly id: string;
  readonly label: string;
  readonly children: ReadonlyArray<File>;
}

interface File {
  readonly kind: "file";
  readonly id: string;
  readonly label: string;
}

const pad = (value: number): string => `${value}`.padStart(3, "0");

const TREE: ReadonlyArray<Directory> = Arr.map(
  Arr.range(0, VIRTUAL_TREE_DIRS - 1),
  (directory) => {
    const id = `dir-${pad(directory)}`;
    return {
      kind: "dir" as const,
      id,
      label: `dir ${pad(directory)}`,
      children: Arr.map(Arr.range(0, VIRTUAL_TREE_FILES - 1), (file) => ({
        kind: "file" as const,
        id: `${id}/file-${pad(file)}`,
        label: `file ${pad(directory)}/${pad(file)}`,
      })),
    };
  },
);

const keyOf = (node: Directory | File): string => node.id;
const labelOf = (node: Directory | File): string => node.label;
const childrenOf = (node: Directory | File): ReadonlyArray<File> =>
  node.kind === "dir" ? node.children : [];

export const VirtualTreeExample = () => {
  const theme = useTheme();
  const tree = useExpandedRows({
    roots: TREE,
    keyOf,
    childrenOf,
    labelOf,
    initialActive: "dir-000",
  });
  const [height, setHeight] = useState(VIRTUAL_TREE_HEIGHT);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 460,
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
          testId="virtual-tree-expand"
        >
          Expand all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onActivate={tree.collapseAll}
          testId="virtual-tree-collapse"
        >
          Collapse all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onActivate={() => tree.reveal(VIRTUAL_TREE_REVEAL)}
          testId="virtual-tree-reveal"
        >
          Reveal dir 030
        </Button>
        <Button
          variant="outline"
          size="sm"
          onActivate={() =>
            setHeight((current) =>
              current === VIRTUAL_TREE_HEIGHT
                ? VIRTUAL_TREE_HEIGHT * 2
                : VIRTUAL_TREE_HEIGHT,
            )
          }
          testId="virtual-tree-height"
        >
          Toggle height
        </Button>
      </div>
      <text
        testId="virtual-tree-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${tree.rows.length} rows · active=${Option.getOrElse(tree.active, () => "-")}`}
      </text>
      <VirtualTree
        testId="virtual-tree"
        aria-label="Workspace files"
        height={height}
        rowHeight={VIRTUAL_TREE_ROW_HEIGHT}
        rows={tree.rows}
        cursor={tree.cursor}
        onCursorChange={tree.setCursor}
        labelOf={labelOf}
      />
    </div>
  );
};
