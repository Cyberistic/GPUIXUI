/**
 * Guards the virtualized tree fixture.
 *
 * The probe's claims are index arithmetic — the row count after expanding one
 * directory, the label at the reveal index, one testId per node — so a fixture
 * that flattened in the wrong order, repeated an id, or answered a different
 * row count would make every measurement read as a pass while proving nothing.
 * The bug this file guards is exactly that: the README states the reveal lands
 * on the thirtieth directory, and that number must come from the data.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  TREE_ALL_DIRECTORIES,
  TREE_DIR_COUNT,
  TREE_FILE_COUNT,
  TREE_NODES,
  TREE_REVEAL_INDEX,
  labelInset,
  labelTestId,
  rowTestId,
  toggleTestId,
  visibleRowAt,
  visibleRows,
  type TreeDirectory,
  type TreeFile,
} from "./virtual-tree.js";

/** The ids the tree would paint, for presence checks. */
const visibleIds = (expanded: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.map(visibleRows(expanded), (node) => node.id);

const directories = Arr.filter(
  TREE_NODES,
  (node): node is TreeDirectory => node.kind === "dir",
);

const files = Arr.filter(
  TREE_NODES,
  (node): node is TreeFile => node.kind === "file",
);

describe("the virtualized tree fixture", () => {
  it("holds every node exactly once, with a file's parent a directory", () => {
    const ids = Arr.map(TREE_NODES, (node) => node.id);
    expect(Arr.length(ids)).toBe(TREE_DIR_COUNT * (TREE_FILE_COUNT + 1));
    expect(Arr.length(Arr.dedupe(ids))).toBe(Arr.length(ids));
    expect(Arr.length(directories)).toBe(TREE_DIR_COUNT);
    expect(Arr.every(directories, (node) => node.depth === 0)).toBe(true);
    expect(Arr.every(files, (node) => Arr.contains(ids, node.parent))).toBe(
      true,
    );
    expect(Arr.every(files, (node) => node.depth === 1)).toBe(true);
  });

  it("paints one row per directory until a directory is opened", () => {
    expect(Arr.length(visibleRows([]))).toBe(TREE_DIR_COUNT);
    expect(Arr.length(visibleRows(["dir-000"]))).toBe(
      TREE_DIR_COUNT + TREE_FILE_COUNT,
    );
    expect(
      Option.map(visibleRowAt(["dir-000"], 1), (node) => node.label),
    ).toEqual(Option.some("file 000/000"));
    expect(
      Option.map(visibleRowAt(["dir-000"], 0), (node) => node.kind),
    ).toEqual(Option.some("dir"));
  });

  it("hides a file again when its parent closes", () => {
    expect(Arr.contains(visibleIds(["dir-000"]), "file-dir-000/000")).toBe(
      true,
    );
    expect(Arr.contains(visibleIds([]), "file-dir-000/000")).toBe(false);
    expect(Arr.contains(visibleIds(["dir-001"]), "file-dir-000/000")).toBe(
      false,
    );
    expect(Arr.contains(visibleIds(["dir-001"]), "file-dir-001/000")).toBe(
      true,
    );
  });

  it("reveals the thirtieth directory at the index the probe names", () => {
    const rows = visibleRows(TREE_ALL_DIRECTORIES);
    expect(Arr.length(rows)).toBe(TREE_DIR_COUNT * (TREE_FILE_COUNT + 1));
    expect(
      Option.map(Arr.get(rows, TREE_REVEAL_INDEX), (node) => node.label),
    ).toEqual(Option.some("dir 030"));
    // The neighbour is that directory's own first file, so the reveal is not a
    // one-row island: the window it paints is a contiguous block.
    expect(
      Option.map(Arr.get(rows, TREE_REVEAL_INDEX + 1), (node) => node.label),
    ).toEqual(Option.some("file 030/000"));
  });

  it("gives every node its own row, label and disclosure id", () => {
    const rowIds = Arr.map(TREE_NODES, rowTestId);
    const labelIds = Arr.map(TREE_NODES, labelTestId);
    const toggleIds = Arr.map(directories, toggleTestId);
    const every = Arr.appendAll(Arr.appendAll(rowIds, labelIds), toggleIds);
    expect(Arr.length(Arr.dedupe(every))).toBe(Arr.length(every));
    expect(Arr.contains(rowIds, "tree-row-dir-000")).toBe(true);
    expect(Arr.contains(labelIds, "tree-label-file-dir-030/000")).toBe(true);
  });

  it("indents a child by exactly one step of the fixture's scale", () => {
    const rows = visibleRows(["dir-000"]);
    expect(Option.map(Arr.get(rows, 0), labelInset)).toEqual(Option.some(0));
    expect(Option.map(Arr.get(rows, 1), labelInset)).toEqual(Option.some(16));
  });
});
