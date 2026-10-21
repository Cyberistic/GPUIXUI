/**
 * The flex box's remaining axes' arithmetic (plan `841`).
 *
 * The bug being guarded: the `alignContent` modes and the per-axis gaps were
 * prose only, so a model that divided the `space-*` modes by the wrong divisor,
 * or let the shorthand beat a longhand, would have passed while the scenario
 * asserted those numbers.
 */
import { describe, expect, it } from "vitest";
import {
  axisGap,
  itemInLine,
  lineOf,
  lineStarts,
  starts,
} from "./flex-axes-model.js";

describe("laying out a line", () => {
  it("places three boxes without a gap", () => {
    expect(starts([40, 40, 40], 0)).toEqual([0, 40, 80]);
  });

  it("adds the gap between every pair", () => {
    expect(starts([40, 40, 40], 10)).toEqual([0, 50, 100]);
  });

  it("is empty for no boxes", () => {
    expect(starts([], 10)).toEqual([]);
  });
});

describe("the gap an axis gets", () => {
  it("takes columnGap on a row's main axis", () => {
    expect(axisGap("main", "row", 5, 20, 30)).toBe(30);
  });

  it("takes rowGap on a row's cross axis", () => {
    expect(axisGap("cross", "row", 5, 20, 30)).toBe(20);
  });

  it("takes rowGap on a column's main axis", () => {
    expect(axisGap("main", "column", 5, 20)).toBe(20);
  });

  it("falls back to the shorthand for an unset longhand", () => {
    expect(axisGap("cross", "column", 5, 20)).toBe(5);
    expect(axisGap("main", "row", 7)).toBe(7);
  });
});

describe("an item inside its line", () => {
  it("starts at the line origin normally", () => {
    expect(itemInLine(60, 40, false)).toBe(0);
  });

  it("sits at the line end when the line order is reversed", () => {
    expect(itemInLine(60, 40, true)).toBe(20);
  });
});

describe("wrapped lines", () => {
  it("puts the fourth item of three-per-line on line 1", () => {
    expect(lineOf(3, 3)).toBe(1);
    expect(lineOf(5, 3)).toBe(1);
    expect(lineOf(2, 3)).toBe(0);
  });
});

describe("alignContent over two lines of 40 in 200", () => {
  it("starts at the leading edge", () => {
    expect(lineStarts("flex-start", 2, 40, 200)).toEqual([0, 40]);
  });

  it("centres the block of lines", () => {
    expect(lineStarts("center", 2, 40, 200)).toEqual([60, 100]);
  });

  it("pins the first and last line", () => {
    expect(lineStarts("space-between", 2, 40, 200)).toEqual([0, 160]);
  });

  it("gives each line half a share at either end", () => {
    expect(lineStarts("space-around", 2, 40, 200)).toEqual([30, 130]);
  });

  it("gives every gap an equal share", () => {
    expect(lineStarts("space-evenly", 2, 40, 200)).toEqual([40, 120]);
  });

  it("stretches each line to the cross axis", () => {
    expect(lineStarts("stretch", 2, 40, 200)).toEqual([0, 100]);
  });

  it("centres a single line and leaves the others at the edge", () => {
    expect(lineStarts("center", 1, 40, 200)).toEqual([80]);
    expect(lineStarts("flex-start", 1, 40, 200)).toEqual([0]);
    expect(lineStarts("space-between", 1, 40, 200)).toEqual([0]);
  });

  it("is empty for no lines", () => {
    expect(lineStarts("center", 0, 40, 200)).toEqual([]);
  });

  it("puts the gap between the lines before stretching them", () => {
    expect(lineStarts("stretch", 2, 40, 200, 30)).toEqual([0, 115]);
    expect(lineStarts("flex-start", 2, 40, 200, 30)).toEqual([0, 70]);
    expect(lineStarts("space-between", 2, 40, 200, 30)).toEqual([0, 160]);
  });
});
