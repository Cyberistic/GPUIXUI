import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  describeOrder,
  dropIndex,
  indexOfId,
  indicatorY,
  insertionAt,
  moveItem,
  nextBoundary,
} from "./reorder-model.js";

const ROW = 32;
const IDS = ["alpha", "bravo", "charlie", "delta"] as const;
const ITEMS = IDS.map((id) => ({ id }));

describe("insertionAt", () => {
  it("rounds to the nearest boundary", () => {
    expect(insertionAt(0, 0, ROW, 8)).toBe(0);
    expect(insertionAt(ROW * 2 + 8, 0, ROW, 8)).toBe(2);
    expect(insertionAt(ROW * 2 + 24, 0, ROW, 8)).toBe(3);
  });

  it("adds the content scrolled above the viewport", () => {
    expect(insertionAt(8, ROW * 4, ROW, 8)).toBe(4);
  });

  it("clamps above the first row and below the last", () => {
    expect(insertionAt(-200, 0, ROW, 8)).toBe(0);
    expect(insertionAt(ROW * 80, 0, ROW, 8)).toBe(8);
  });
});

describe("dropIndex", () => {
  it("lands a downward move one boundary earlier than the pointer", () => {
    // 0 -> boundary 3 means "after row 2", so the item ends at index 2.
    expect(dropIndex(0, 3, 8)).toBe(2);
  });

  it("lands an upward move exactly on the boundary", () => {
    expect(dropIndex(5, 2, 8)).toBe(2);
  });

  it("is a no-op inside the item's own row", () => {
    expect(dropIndex(2, 2, 8)).toBe(2);
    expect(dropIndex(2, 3, 8)).toBe(2);
  });

  it("clamps to the last index", () => {
    expect(dropIndex(0, 8, 8)).toBe(7);
    expect(dropIndex(9, 9, 8)).toBe(7);
    expect(dropIndex(0, 1, 1)).toBe(0);
  });
});

describe("moveItem", () => {
  it("moves an item down to the requested index", () => {
    expect(moveItem(IDS, 0, 2)).toEqual(["bravo", "charlie", "alpha", "delta"]);
  });

  it("moves an item up to the requested index", () => {
    expect(moveItem(IDS, 3, 1)).toEqual(["alpha", "delta", "bravo", "charlie"]);
  });

  it("returns the same array when the index does not change", () => {
    expect(moveItem(ITEMS, 2, 2)).toBe(ITEMS);
  });

  it("does not mutate its input", () => {
    const input = [...IDS];
    moveItem(input, 0, 2);
    expect(input).toEqual(IDS);
  });

  it("clamps an out-of-range index instead of dropping the item", () => {
    expect(moveItem(IDS, 0, 99)).toEqual([
      "bravo",
      "charlie",
      "delta",
      "alpha",
    ]);
    expect(moveItem(IDS, 99, 0)).toEqual([
      "delta",
      "alpha",
      "bravo",
      "charlie",
    ]);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});

describe("indicatorY", () => {
  it("sits on the boundary, including after the last row", () => {
    expect(indicatorY(0, ROW)).toBe(0);
    expect(indicatorY(2, ROW)).toBe(64);
    expect(indicatorY(8, ROW)).toBe(256);
  });
});

describe("nextBoundary", () => {
  it("moves by one and clamps at both ends", () => {
    expect(nextBoundary(0, -1, 8)).toBe(0);
    expect(nextBoundary(3, 1, 8)).toBe(4);
    expect(nextBoundary(8, 1, 8)).toBe(8);
  });
});

describe("indexOfId", () => {
  it("finds the row by identity and reports absence", () => {
    expect(Option.getOrUndefined(indexOfId(ITEMS, "charlie"))).toBe(2);
    expect(Option.isNone(indexOfId(ITEMS, "missing"))).toBe(true);
  });
});

describe("describeOrder", () => {
  it("joins ids in list order", () => {
    expect(describeOrder(ITEMS)).toBe("alpha,bravo,charlie,delta");
  });
});
