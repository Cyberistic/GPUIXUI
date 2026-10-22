/**
 * A large file tree: four thousand rows, of which only a window is retained.
 *
 * This is the screen the windowed tree exists for. Forty directories hold
 * ninety-nine files each; opening every directory makes the flattened set four
 * thousand rows, while `VirtualTree` keeps only the rows around the viewport in
 * the frame. The readout prints the flattened count and the cursor, so a
 * behaviour suite can read both without reaching into the component.
 *
 * The composition is the plain tree's — `useExpandedRows` holds the cursor and
 * the expansion set, the component owns the keyboard, the tab stop and the
 * type-ahead — with one extra rule the window adds: a cursor move that leaves
 * the mounted window moves the window first, so the row exists before the focus
 * follows.
 */

import { Button } from "@gpuixui/primitives/button";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { VirtualTree, useExpandedRows } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

/** Directories at the root. */
export const VIRTUAL_TREE_DIRS = 40;

/** Files inside each directory: 40 × (1 + 99) = 4 000 rows when all are open. */
export const VIRTUAL_TREE_FILES = 99;

/** Every row's painted height, which is also the window's estimate. */
export const VIRTUAL_TREE_ROW_HEIGHT = 28;

/** The viewport: ten rows of the four thousand. */
export const VIRTUAL_TREE_HEIGHT = 280;

/** The directory a "reveal" names: twelve hundred rows below the first window. */
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

/** Every directory, with its files: the tree's whole data set. */
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

/** The windowed tree, its two batch actions and the reveal. */
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
