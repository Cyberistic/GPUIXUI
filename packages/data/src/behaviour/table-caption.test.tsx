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

const labelValues = (tree: A11yTree, id: string): ReadonlyArray<string> =>
  Arr.filterMap(withRole(tree, id, "Label"), (node) => {
    const value = tree.nodes[node]?.aria.value;
    return value === undefined ? Result.failVoid : Result.succeed(value);
  });

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

        expect(labelValues(tree, onlyRole(tree, "Table"))).toEqual([
          "12 files",
        ]);
      },
    );
  });
});
