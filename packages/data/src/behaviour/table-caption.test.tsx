/**
 * A caption is text the accessibility tree can hear.
 *
 * `TableCaption` took a `ReactNode` and painted it, and the documented shape was
 * `<TableCaption>12 files</TableCaption>`. A raw string inside a box paints, but
 * the runtime reaches the tree only through `<text>` elements, so the caption
 * produced **no node at all** — a reader heard the table's rows and never its
 * count. The caption now paints a string as its own text element; a caller's
 * node passes through untouched. 0.11.0 has no caption role, so the line is a
 * `Label` beside the table's row groups rather than an associated caption.
 */

import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { darkTheme } from "@gpuixui/tokens";
import {
  decodeA11yTree,
  onlyRole,
  withRole,
  type A11yTree,
} from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { textStyle } from "../theme.js";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";

/** The words the tree announces under one node, in paint order. */
const labelValues = (tree: A11yTree, id: string): ReadonlyArray<string> =>
  Arr.filterMap(withRole(tree, id, "Label"), (node) => {
    const value = tree.nodes[node]?.aria.value;
    return value === undefined ? Result.failVoid : Result.succeed(value);
  });

/** A one-row table under a caption, read and released by every case. */
const withCaptionedTable = (
  caption: ReactNode,
  read: (tree: A11yTree, root: DataTestRoot) => void,
): void => {
  const root = renderData(
    <Table height={200} aria-label="Files">
      <TableViewport>
        <TableHeader>
          <TableRow>
            <TableHeaderCell width={260}>Name</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell width={260}>readme.md</TableCell>
          </TableRow>
        </TableBody>
      </TableViewport>
      <TableCaption>{caption}</TableCaption>
    </Table>,
  );
  try {
    settle(root);
    read(decodeA11yTree(root.renderer.getA11yTree()), root);
  } finally {
    root.unmount();
  }
};

describe("the table's caption", () => {
  it("paints a string child and puts it in the accessibility tree", () => {
    withCaptionedTable("12 files", (tree, root) => {
      expect(root.renderer.getAllText()).toContain("12 files");
      expect(labelValues(tree, onlyRole(tree, "Table"))).toContain("12 files");
    });
  });

  it("passes a caller's text node through without wrapping it twice", () => {
    withCaptionedTable(
      <text style={textStyle(darkTheme, "caption")}>12 files</text>,
      (tree, root) => {
        expect(root.renderer.getAllText()).toContain("12 files");
        // One label, not one per wrapping: the caller's node is the caption.
        expect(labelValues(tree, onlyRole(tree, "Table"))).toEqual([
          "12 files",
        ]);
      },
    );
  });
});
