/**
 * Guards the hierarchical reorder rules (plan `392`).
 *
 * The bugs these catch: a move that orphans a directory's children, a cycle
 * accepted as a move, a file treated as a drop-into target, a between-drop and
 * an into-drop that produce the same target, and an indicator that paints
 * somewhere other than the insertion point.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  allRows,
  describeRows,
  indicatorAt,
  isMoved,
  moveSubtree,
  subtreeEnd,
  subtreeIds,
  targetAt,
  visibleIndexOf,
  visibleRows,
  type TreeItem,
} from "./tree-reorder-model.js";

const dir = (id: string, depth: number): TreeItem => ({
  id,
  kind: "dir",
  depth,
});
const file = (id: string, depth: number): TreeItem => ({
  id,
  kind: "file",
  depth,
});

const TREE: ReadonlyArray<TreeItem> = [
  dir("dir-0", 0),
  file("dir-0/a", 1),
  file("dir-0/b", 1),
  dir("dir-1", 0),
  file("dir-1/a", 1),
  file("dir-1/b", 1),
  dir("dir-1/sub", 1),
  file("dir-1/sub/a", 2),
  file("dir-1/sub/b", 2),
  dir("dir-2", 0),
  file("dir-2/a", 1),
  file("dir-2/b", 1),
];

const ids = (items: ReadonlyArray<TreeItem>) =>
  Arr.map(items, (item) => item.id);
const depths = (items: ReadonlyArray<TreeItem>) =>
  Arr.map(items, (item) => item.depth);

describe("allRows", () => {
  it("derives the parent from the nearest earlier row one level up", () => {
    const rows = allRows(TREE);
    const parentName = (id: string): string =>
      Option.getOrElse(
        Option.flatMap(
          Arr.findFirst(rows, (row) => row.id === id),
          (row) => row.parent,
        ),
        () => "root",
      );
    const fullIndexOf = (id: string): number =>
      Option.getOrElse(
        Option.map(
          Arr.findFirst(rows, (row) => row.id === id),
          (row) => row.index,
        ),
        () => -1,
      );
    expect(parentName("dir-0")).toBe("root");
    expect(parentName("dir-0/a")).toBe("dir-0");
    expect(parentName("dir-1/sub/a")).toBe("dir-1/sub");
    expect(fullIndexOf("dir-1/sub/a")).toBe(7);
  });
});

describe("visibleRows", () => {
  it("paints only the roots when nothing is open", () => {
    expect(describeRows(visibleRows(TREE, []))).toBe("dir-0,dir-1,dir-2");
  });

  it("paints an open directory's children but not a closed grandchild's", () => {
    expect(describeRows(visibleRows(TREE, ["dir-1"]))).toBe(
      "dir-0,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-2",
    );
  });

  it("paints a grandchild only when every ancestor is open", () => {
    expect(describeRows(visibleRows(TREE, ["dir-1", "dir-1/sub"]))).toBe(
      "dir-0,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-1/sub/a,dir-1/sub/b,dir-2",
    );
  });
});

describe("subtreeEnd and subtreeIds", () => {
  it("ends a directory's subtree after its last descendant", () => {
    expect(subtreeEnd(TREE, 3)).toBe(9);
    expect(subtreeIds(TREE, "dir-1")).toEqual([
      "dir-1",
      "dir-1/a",
      "dir-1/b",
      "dir-1/sub",
      "dir-1/sub/a",
      "dir-1/sub/b",
    ]);
  });

  it("ends a leaf's subtree at the next row", () => {
    expect(subtreeEnd(TREE, 1)).toBe(2);
    expect(subtreeIds(TREE, "dir-0/a")).toEqual(["dir-0/a"]);
    expect(subtreeIds(TREE, "missing")).toEqual([]);
  });
});

describe("moveSubtree", () => {
  it("inserts before a row as its sibling, moving its children too", () => {
    const result = moveSubtree(TREE, "dir-2", {
      id: "dir-0",
      edge: "before",
    });
    expect(isMoved(result)).toBe(true);
    if (!isMoved(result)) return;
    expect(Arr.take(ids(result.items), 5)).toEqual([
      "dir-2",
      "dir-2/a",
      "dir-2/b",
      "dir-0",
      "dir-0/a",
    ]);
    expect(Arr.take(depths(result.items), 5)).toEqual([0, 1, 1, 0, 1]);
  });

  it("inserts after a directory's whole subtree", () => {
    const result = moveSubtree(TREE, "dir-0", {
      id: "dir-1",
      edge: "after",
    });
    expect(isMoved(result)).toBe(true);
    if (!isMoved(result)) return;
    expect(Arr.take(ids(result.items), 10)).toEqual([
      "dir-1",
      "dir-1/a",
      "dir-1/b",
      "dir-1/sub",
      "dir-1/sub/a",
      "dir-1/sub/b",
      "dir-0",
      "dir-0/a",
      "dir-0/b",
      "dir-2",
    ]);
  });

  it("makes the source the target's first child", () => {
    const result = moveSubtree(TREE, "dir-2", {
      id: "dir-0",
      edge: "into",
    });
    expect(isMoved(result)).toBe(true);
    if (!isMoved(result)) return;
    expect(Arr.take(ids(result.items), 3)).toEqual([
      "dir-0",
      "dir-2",
      "dir-2/a",
    ]);
    expect(Arr.take(depths(result.items), 6)).toEqual([0, 1, 2, 2, 1, 1]);
  });

  it("shifts every moved node's depth so the subtree keeps its shape", () => {
    const result = moveSubtree(TREE, "dir-1", {
      id: "dir-2",
      edge: "into",
    });
    expect(isMoved(result)).toBe(true);
    if (!isMoved(result)) return;
    expect(subtreeIds(result.items, "dir-1")).toEqual([
      "dir-1",
      "dir-1/a",
      "dir-1/b",
      "dir-1/sub",
      "dir-1/sub/a",
      "dir-1/sub/b",
    ]);
    const depthOf = (id: string) =>
      Option.getOrElse(
        Option.map(
          Arr.findFirst(result.items, (item) => item.id === id),
          (item) => item.depth,
        ),
        () => -1,
      );
    expect(depthOf("dir-1")).toBe(1);
    expect(depthOf("dir-1/a")).toBe(2);
    expect(depthOf("dir-1/sub")).toBe(2);
    expect(depthOf("dir-1/sub/a")).toBe(3);
    expect(Object.is(result.items, TREE)).toBe(false);
  });

  it("refuses dropping a row on itself", () => {
    const result = moveSubtree(TREE, "dir-1", {
      id: "dir-1",
      edge: "before",
    });
    expect(result).toEqual({ _tag: "refused", reason: "self" });
  });

  it("refuses dropping a directory inside its own descendant", () => {
    const result = moveSubtree(TREE, "dir-1", {
      id: "dir-1/sub/a",
      edge: "into",
    });
    expect(result).toEqual({ _tag: "refused", reason: "descendant" });
  });

  it("refuses into a file", () => {
    const result = moveSubtree(TREE, "dir-2", {
      id: "dir-0/a",
      edge: "into",
    });
    expect(result).toEqual({ _tag: "refused", reason: "not-a-directory" });
  });

  it("refuses a malformed input rather than emitting a corrupt tree", () => {
    const broken: ReadonlyArray<TreeItem> = [dir("a", 2), dir("b", 0)];
    const result = moveSubtree(broken, "b", { id: "a", edge: "after" });
    expect(result).toEqual({ _tag: "refused", reason: "illegal-depth" });
  });

  it("does not mutate its input", () => {
    const input = [...TREE];
    moveSubtree(input, "dir-2", { id: "dir-0", edge: "into" });
    expect(input).toEqual(TREE);
  });
});

describe("targetAt", () => {
  const rows = visibleRows(TREE, ["dir-1"]);
  const frame = {
    left: 10,
    top: 100,
    offset: 0,
    rowHeight: 32,
    indentStep: 16,
  };
  const at = (row: number, fraction: number, x = 14) =>
    Option.getOrUndefined(
      targetAt({ x, y: 100 + row * 32 + fraction * 32 }, frame, rows),
    );

  it("uses the upper half for before and the lower half for after", () => {
    expect(at(2, 0.25)).toEqual({ id: "dir-1/a", edge: "before" });
    expect(at(2, 0.75)).toEqual({ id: "dir-1/a", edge: "after" });
  });

  it("drops into a directory only in the middle band and one step in", () => {
    expect(at(1, 0.5, 10 + 36)).toEqual({ id: "dir-1", edge: "into" });
    expect(at(1, 0.1, 10 + 36)).toEqual({ id: "dir-1", edge: "before" });
    expect(at(1, 0.9, 10 + 36)).toEqual({ id: "dir-1", edge: "after" });
  });

  it("does not treat an unindented middle as into", () => {
    expect(at(0, 0.5, 10 + 15)).toEqual({ id: "dir-0", edge: "after" });
    expect(at(0, 0.5, 10 + 20)).toEqual({ id: "dir-0", edge: "into" });
  });

  it("never accepts into for a file", () => {
    expect(at(2, 0.5, 10 + 80)).toEqual({ id: "dir-1/a", edge: "after" });
  });

  it("adds the content scrolled above the viewport", () => {
    const scrolled = Option.getOrUndefined(
      targetAt({ x: 14, y: 104 }, { ...frame, offset: 32 }, rows),
    );
    expect(scrolled).toEqual({ id: "dir-1", edge: "before" });
  });

  it("clamps above the first row and below the last", () => {
    expect(at(-4, 0.5)).toEqual({ id: "dir-0", edge: "before" });
    expect(at(40, 0.5)).toEqual({ id: "dir-2", edge: "after" });
    expect(targetAt({ x: 0, y: 0 }, frame, [])).toEqual(Option.none());
  });
});

describe("indicatorAt", () => {
  const rows = visibleRows(TREE, ["dir-1"]);

  it("places a before line on the row at its depth", () => {
    expect(indicatorAt(rows, { id: "dir-1", edge: "before" })).toEqual(
      Option.some({ boundary: 1, depth: 0 }),
    );
  });

  it("places an after line below the whole visible subtree", () => {
    expect(indicatorAt(rows, { id: "dir-1", edge: "after" })).toEqual(
      Option.some({ boundary: 5, depth: 0 }),
    );
  });

  it("places an into line one row down and one level in", () => {
    expect(indicatorAt(rows, { id: "dir-1", edge: "into" })).toEqual(
      Option.some({ boundary: 2, depth: 1 }),
    );
  });

  it("reports absence for a row that does not paint", () => {
    expect(indicatorAt(rows, { id: "dir-1/sub/a", edge: "before" })).toEqual(
      Option.none(),
    );
  });
});

describe("visibleIndexOf", () => {
  it("finds the flattened index and reports absence", () => {
    const rows = visibleRows(TREE, ["dir-1"]);
    expect(Option.getOrUndefined(visibleIndexOf(rows, "dir-2"))).toBe(5);
    expect(visibleIndexOf(rows, "dir-1/sub/a")).toEqual(Option.none());
  });
});
