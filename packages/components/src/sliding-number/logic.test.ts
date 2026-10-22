/**
 * The digits a value paints and the columns they belong to.
 *
 * The bugs these guard: a column keyed by position, so a value that gains a
 * digit rolls every column instead of the one that changed; a fraction digit
 * keyed against the integer's places; a point painted where the value has no
 * fraction; a reading that drops the sign or the caller's affixes; decimals that
 * reach `toFixed` unclamped; and a value no column can paint, laid out as ten
 * blank cells.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  columnTop,
  decimalsOf,
  digitCells,
  numberLayout,
  slidingNumberDecimalsCap,
} from "./logic.js";

/** The `key:digit` of every cell, `point` standing for the separator. */
const cells = (value: number, format?: Parameters<typeof numberLayout>[1]) =>
  Arr.map(numberLayout(value, format).cells, (cell) =>
    Option.match(cell.digit, {
      onNone: () => cell.key,
      onSome: (digit) => `${cell.key}:${digit}`,
    }),
  );

describe("numberLayout", () => {
  it("gives one column per digit, keyed by its place from the point", () => {
    expect(cells(42)).toEqual(["i1:4", "i0:2"]);
    expect(numberLayout(42).text).toBe("42");
    expect(numberLayout(42).negative).toBe(false);
  });

  it("keys by decimal place, so a value that grows keeps its columns", () => {
    expect(cells(9)).toEqual(["i0:9"]);
    expect(cells(10)).toEqual(["i1:1", "i0:0"]);

    expect(cells(99.5, { decimals: 1 })).toEqual([
      "i1:9",
      "i0:9",
      "point",
      "f1:5",
    ]);
    expect(cells(100.5, { decimals: 1 })).toEqual([
      "i2:1",
      "i1:0",
      "i0:0",
      "point",
      "f1:5",
    ]);
  });

  it("reads the value with its sign, point and the caller's affixes", () => {
    expect(numberLayout(-3.5, { decimals: 1 })).toMatchObject({
      negative: true,
      text: "-3.5",
    });
    expect(numberLayout(3, { prefix: "$", suffix: "/mo" }).text).toBe("$3/mo");
    expect(numberLayout(-3, { prefix: "$" }).text).toBe("-$3");
  });

  it("writes the point only where the value has a fraction", () => {
    expect(cells(1, { decimals: 2 })).toEqual([
      "i0:1",
      "point",
      "f1:0",
      "f2:0",
    ]);
    expect(
      Arr.some(numberLayout(1).cells, (cell) => cell.key === "point"),
    ).toBe(false);
    expect(
      Arr.some(
        numberLayout(1, { decimals: 2 }).cells,
        (c) => c.key === "point",
      ),
    ).toBe(true);
  });

  it("clamps decimals to a whole number of places it can cut to", () => {
    expect(decimalsOf(undefined)).toBe(0);
    expect(decimalsOf(-2)).toBe(0);
    expect(decimalsOf(2.7)).toBe(2);
    expect(decimalsOf(9)).toBe(slidingNumberDecimalsCap);
    expect(decimalsOf(Number.NaN)).toBe(0);
    expect(cells(1.5, { decimals: Number.NaN })).toEqual(["i0:2"]);
  });

  it("leaves a value it cannot paint with no columns, and still reads it", () => {
    Arr.forEach([Number.NaN, Number.POSITIVE_INFINITY, 1e21], (value) => {
      expect(numberLayout(value).cells).toEqual([]);
      expect(numberLayout(value).text).toBe(String(value));
    });
    expect(numberLayout(Number.NaN, { prefix: "<", suffix: ">" }).text).toBe(
      "<NaN>",
    );
  });
});

describe("columnTop", () => {
  it("raises the plate one line per digit, and no travel for a broken line", () => {
    expect(columnTop(0, 20)).toBe(0);
    expect(Object.is(columnTop(0, 20), -0)).toBe(false);
    expect(columnTop(7, 20)).toBe(-140);
    expect(columnTop(3, Number.NaN)).toBe(0);
  });

  it("stacks the ten digits exactly once", () => {
    expect(digitCells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
