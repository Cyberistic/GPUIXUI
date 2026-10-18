/**
 * Guards the sort/filter/window model a virtualized data grid depends on.
 *
 * The bugs these catch: a case-sensitive filter that hides a row the user can
 * see, a descending sort that mutates the caller's rows (so the frozen column
 * and the body render different orders), a window that starts at a negative
 * index or runs past the last row, and a `rowTop` that ignores the anchor so
 * the frozen column drifts from the virtual body.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import type { GridRow } from "./data-grid-model.js";
import {
  anchoredWindow,
  filterRows,
  indices,
  rowTop,
  sortRows,
} from "./data-grid-model.js";

const row = (id: number, name: string): GridRow => ({
  id,
  name,
  kind: id % 2 === 0 ? "file" : "dir",
  size: id,
});

const rows: ReadonlyArray<GridRow> = [
  row(1, "Item 001"),
  row(2, "Item 010"),
  row(3, "item 012"),
  row(4, "other 100"),
];

describe("filterRows", () => {
  it("matches a substring case-insensitively", () => {
    expect(Arr.map(filterRows(rows, "item 01"), (entry) => entry.id)).toEqual([
      2, 3,
    ]);
  });

  it("keeps every row for an empty query", () => {
    expect(Arr.length(filterRows(rows, ""))).toBe(4);
  });

  it("returns no row for a query that matches nothing", () => {
    expect(Arr.length(filterRows(rows, "zzz"))).toBe(0);
  });
});

describe("sortRows", () => {
  it("sorts ascending by name, case-sensitively as the order defines", () => {
    expect(Arr.map(sortRows(rows, "asc"), (entry) => entry.id)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("reverses for descending", () => {
    expect(Arr.map(sortRows(rows, "desc"), (entry) => entry.id)).toEqual([
      4, 3, 2, 1,
    ]);
  });

  it("does not mutate the input", () => {
    const before = Arr.map(rows, (entry) => entry.id);
    sortRows(rows, "desc");
    expect(Arr.map(rows, (entry) => entry.id)).toEqual(before);
  });
});

describe("anchoredWindow", () => {
  const anchor = { index: 10, offset: 0 };

  it("overdraws one row above the anchor", () => {
    expect(anchoredWindow(anchor, 300, 28, 500).first).toBe(9);
  });

  it("clamps the window to the last row", () => {
    expect(anchoredWindow({ index: 499, offset: 0 }, 300, 28, 500).last).toBe(
      499,
    );
  });

  it("never starts before the first row", () => {
    expect(anchoredWindow({ index: 0, offset: 0 }, 300, 28, 500).first).toBe(0);
  });

  it("counts the in-row offset toward the painted rows", () => {
    expect(
      anchoredWindow({ index: 0, offset: 20 }, 300, 28, 500).last,
    ).toBeGreaterThan(
      anchoredWindow({ index: 0, offset: 0 }, 300, 28, 500).last,
    );
  });

  it("is empty with no rows", () => {
    expect(anchoredWindow(anchor, 300, 28, 0)).toEqual({ first: 0, last: -1 });
    expect(indices(anchoredWindow(anchor, 300, 28, 0))).toEqual([]);
  });
});

describe("rowTop", () => {
  it("places the anchor row at zero", () => {
    expect(rowTop(10, { index: 10, offset: 0 }, 28)).toBe(0);
  });

  it("lifts the content by the in-row offset", () => {
    expect(rowTop(10, { index: 10, offset: 12 }, 28)).toBe(-12);
  });

  it("places later rows a row height apart", () => {
    expect(rowTop(12, { index: 10, offset: 0 }, 28)).toBe(56);
  });
});
