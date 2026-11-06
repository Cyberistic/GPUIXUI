import { describe, expect, it } from "vitest";
import {
  ALL_ROWS,
  clampPageIndex,
  DEFAULT_PAGINATION,
  pageCountOf,
  pageIndexOf,
  pageSizeOf,
  readPagination,
  withPageSize,
} from "./logic.js";

describe("a page size", () => {
  it("is a whole number of rows", () => {
    expect(pageSizeOf(8)).toBe(8);
    expect(pageSizeOf(2.9)).toBe(2);
    expect(pageSizeOf(1)).toBe(1);
  });

  it("is every row for a value the grid cannot lay out", () => {
    expect(
      [
        null,
        undefined,
        0,
        -4,
        0.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        "8",
      ].map(pageSizeOf),
    ).toEqual([
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
      ALL_ROWS,
    ]);
  });
});

describe("a page index", () => {
  it("is a whole, non-negative position", () => {
    expect(pageIndexOf(3)).toBe(3);
    expect(pageIndexOf(3.9)).toBe(3);
    expect(pageIndexOf(-1)).toBe(0);
  });

  it("is the first page for a value that names no position", () => {
    expect(
      [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, "2"].map(
        pageIndexOf,
      ),
    ).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("the pages a set holds", () => {
  it("is one page when every row fits", () => {
    expect(pageCountOf(10, ALL_ROWS)).toBe(1);
    expect(pageCountOf(10, 10)).toBe(1);
    expect(pageCountOf(0, ALL_ROWS)).toBe(1);
  });

  it("rounds a partial page up, so no row is unpainted", () => {
    expect(pageCountOf(10, 4)).toBe(3);
    expect(pageCountOf(8, 4)).toBe(2);
    expect(pageCountOf(1, 4)).toBe(1);
  });

  it("is one page for a set whose size cannot be read", () => {
    expect(pageCountOf(Number.NaN, 4)).toBe(1);
    expect(pageCountOf(-3, 4)).toBe(1);
  });
});

describe("the page a set can paint", () => {
  it("leaves an index the set holds where it is", () => {
    expect(clampPageIndex(1, 10, 4)).toBe(1);
    expect(clampPageIndex(0, 0, 4)).toBe(0);
  });

  it("clamps an index past the last page the set holds", () => {
    expect(clampPageIndex(5, 10, 4)).toBe(2);
    expect(clampPageIndex(9, 9, 4)).toBe(2);
  });

  it("clamps a page index that is not one to the first page", () => {
    expect(clampPageIndex(Number.NaN, 10, 4)).toBe(0);
    expect(clampPageIndex(-2, 10, 4)).toBe(0);
  });
});

describe("a page size change", () => {
  it("keeps the reader's top row in view", () => {
    expect(withPageSize({ pageIndex: 2, pageSize: 4 }, 6)).toEqual({
      pageIndex: 1,
      pageSize: 6,
    });

    expect(withPageSize({ pageIndex: 1, pageSize: 4 }, 2)).toEqual({
      pageIndex: 2,
      pageSize: 2,
    });
  });

  it("opens at the first page when every row was on one", () => {
    expect(withPageSize({ pageIndex: 0, pageSize: ALL_ROWS }, 8)).toEqual({
      pageIndex: 0,
      pageSize: 8,
    });
  });

  it("opens at the first page when the new size is every row", () => {
    expect(withPageSize({ pageIndex: 3, pageSize: 8 }, ALL_ROWS)).toEqual({
      pageIndex: 0,
      pageSize: ALL_ROWS,
    });
    expect(withPageSize({ pageIndex: 3, pageSize: 8 }, 0)).toEqual({
      pageIndex: 0,
      pageSize: ALL_ROWS,
    });
  });
});

describe("the page record a store restored", () => {
  it("reads the names the grid writes", () => {
    expect(readPagination({ pageIndex: 2, pageSize: 8 })).toEqual({
      pageIndex: 2,
      pageSize: 8,
    });
  });

  it("reads a missing or unreadable record as the first page of every row", () => {
    expect([null, undefined, 42, "page"].map(readPagination)).toEqual([
      DEFAULT_PAGINATION,
      DEFAULT_PAGINATION,
      DEFAULT_PAGINATION,
      DEFAULT_PAGINATION,
    ]);
  });

  it("reads a size a store wrote as `null` back as every row", () => {
    expect(readPagination({ pageSize: null })).toEqual(DEFAULT_PAGINATION);
  });
});
