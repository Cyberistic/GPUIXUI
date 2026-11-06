import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  marksFor,
  matchRanges,
  stepOf,
  sweepLength,
  sweptRanges,
} from "../highlight-text/logic.js";

describe("matchRanges", () => {
  it("marks every occurrence and folds case by default", () => {
    expect(matchRanges("Native native NATIVE", "native")).toEqual([
      [0, 6],
      [7, 13],
      [14, 20],
    ]);
  });

  it("keeps case when the caller asks for it, so the flag changes the count", () => {
    expect(
      matchRanges("Native native", "native", { caseSensitive: true }),
    ).toEqual([[7, 13]]);
  });

  it("refuses a match inside a longer word under wholeWord", () => {
    expect(matchRanges("alpha alphabet", "alpha", { wholeWord: true })).toEqual(
      [[0, 5]],
    );
    expect(matchRanges("alpha alphabet", "alpha")).toHaveLength(2);
  });

  it("finds non-overlapping matches, in document order", () => {
    expect(matchRanges("aaaa", "aa")).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });

  it("treats the query as text, not as a pattern", () => {
    expect(matchRanges("abc", "a.c")).toEqual([]);
    expect(matchRanges("a.c", "a.c")).toEqual([[0, 3]]);
  });

  it("marks nothing for an empty query", () => {
    expect(matchRanges("anything", "")).toEqual([]);
  });
});

describe("marksFor", () => {
  it("takes the caller's ranges over the query", () => {
    expect(marksFor("native", { query: "native", ranges: [[0, 2]] })).toEqual([
      [0, 2],
    ]);
  });

  it("marks nothing when neither a query nor ranges is given", () => {
    expect(marksFor("native", {})).toEqual([]);
  });

  it("marks the part of a range that lies inside the phrase", () => {
    expect(marksFor("native", { ranges: [[-1, 3]] })).toEqual([[0, 3]]);
    expect(marksFor("native", { ranges: [[2.9, 4.2]] })).toEqual([[2, 4]]);
    expect(marksFor("native", { ranges: [[0, 99]] })).toEqual([[0, 6]]);
  });

  it("drops a pair that is not a range the phrase can paint", () => {
    expect(
      marksFor("native", {
        ranges: [
          [Number.NaN, 4],
          [1, Number.POSITIVE_INFINITY],
          [20, 30],
          [-4, -1],
          [4, 4],
          [5, 2],
        ],
      }),
    ).toEqual([]);
  });
});

describe("sweepLength", () => {
  it("counts code points, so an emoji is one step", () => {
    expect(sweepLength("a🖥b", [[1, 3]])).toBe(1);
    expect(sweepLength("a🖥b", [[0, 4]])).toBe(3);
  });
});

describe("sweptRanges", () => {
  const text = "native native";

  it("paints nothing before the first step, and everything once through", () => {
    expect(sweptRanges(text, [[0, 6]], 0)).toEqual([]);
    expect(sweptRanges(text, [[0, 6]], 6)).toEqual([[0, 6]]);
    expect(sweptRanges(text, [[0, 6]], 99)).toEqual([[0, 6]]);
  });

  it("grows one mark and keeps the settled ones whole", () => {
    const marks = [
      [0, 2],
      [7, 9],
    ] as const;
    expect(sweptRanges(text, marks, 1)).toEqual([[0, 1]]);
    expect(sweptRanges(text, marks, 3)).toEqual([
      [0, 2],
      [7, 8],
    ]);
  });

  it("advances a whole code point over an emoji", () => {
    expect(sweptRanges("a🖥b", [[1, 3]], 1)).toEqual([[1, 3]]);
  });

  it("never hands the host a pair it cannot paint", () => {
    expect(
      sweptRanges(
        "native",
        [
          [Number.NaN, 4],
          [-1, 2],
          [1.5, 3],
        ],
        9,
      ),
    ).toEqual([
      [0, 2],
      [1, 3],
    ]);
    expect(sweepLength("native", [[Number.NaN, 4]])).toBe(0);
  });
});

describe("stepOf", () => {
  it("keeps a zero pace, which paints the wash at once", () => {
    expect(stepOf(Option.some(0))).toBe(0);
  });

  it("falls back from a pace the timer cannot use", () => {
    expect(stepOf(Option.some(Number.NaN))).toBe(60);
    expect(stepOf(Option.some(-1))).toBe(60);
    expect(stepOf(Option.none())).toBe(60);
  });
});
