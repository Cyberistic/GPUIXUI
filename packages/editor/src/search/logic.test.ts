/**
 * The pure find-and-replace half of the search bar.
 *
 * The bugs these guard: overlapping matches reported twice (the scan must
 * resume at a match's end, so `"aa"` in `"aaa"` is one match, not two); an
 * empty query matching at every position; a replace-all that disagrees
 * with the match count about what "one match" is; and a large file whose
 * matches exhausted the call stack (the scan was recursive per match).
 */

import { describe, expect, it } from "vitest";
import { findRanges, replaceAll } from "./logic.js";

describe("findRanges", () => {
  it("skips overlapping matches", () => {
    expect(findRanges("aaa", "aa")).toEqual([{ start: 0, end: 2 }]);
  });

  it("finds every non-overlapping occurrence", () => {
    expect(findRanges("aabaa", "aa")).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
  });

  it("returns nothing for an empty query", () => {
    expect(findRanges("anything", "")).toEqual([]);
  });

  it("differs from an overlapping scan (negative control)", () => {
    // A scanner that resumed one character after a match would report the two
    // overlapping occurrences of "aa" in "aaa"; the matcher must not.
    expect(findRanges("aaa", "aa")).not.toEqual([
      { start: 0, end: 2 },
      { start: 1, end: 3 },
    ]);
  });

  it("finds every match in a document larger than the call stack", () => {
    // The scan used to recurse once per match, so a 20 000-match file threw
    // `RangeError: Maximum call stack size exceeded` instead of reporting them.
    const text = "a".repeat(20_000);
    const ranges = findRanges(text, "a");
    expect(ranges).toHaveLength(20_000);
    expect(ranges[0]).toEqual({ start: 0, end: 1 });
    expect(ranges[19_999]).toEqual({ start: 19_999, end: 20_000 });
  });
});

describe("replaceAll", () => {
  it("replaces every non-overlapping match and skips overlaps", () => {
    expect(replaceAll("aaa", "aa", "b")).toBe("ba");
  });

  it("leaves the text alone when the query is empty", () => {
    expect(replaceAll("unchanged", "", "x")).toBe("unchanged");
  });

  it("leaves the text alone when nothing matches (negative control)", () => {
    expect(replaceAll("abc", "z", "x")).toBe("abc");
    // The same text, but with a match present, must differ — so the no-match
    // path above is genuinely the "nothing to do" branch, not a no-op bug.
    expect(replaceAll("abc", "a", "x")).toBe("xbc");
  });

  it("replaces every match in a document larger than the call stack", () => {
    // The same scan backed a replace-all: a large file threw before the first
    // replacement instead of returning the replaced text.
    const replaced = replaceAll("a".repeat(20_000), "a", "b");
    expect(replaced).toBe("b".repeat(20_000));
  });
});
