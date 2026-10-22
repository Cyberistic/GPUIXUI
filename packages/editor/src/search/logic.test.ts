/**
 * The pure find-and-replace half of the search bar.
 *
 * The bugs these guard: overlapping matches reported twice (the scan must
 * resume at a match's end, so `"aa"` in `"aaa"` is one match, not two); an
 * empty query matching at every position; and a replace-all that disagrees
 * with the match count about what "one match" is.
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
});
