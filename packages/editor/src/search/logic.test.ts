import { describe, expect, it } from "vitest";
import { findRanges, matchReadout, replaceAll } from "./logic.js";

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
    expect(findRanges("aaa", "aa")).not.toEqual([
      { start: 0, end: 2 },
      { start: 1, end: 3 },
    ]);
  });

  it("matches case-insensitively only when asked", () => {
    expect(findRanges("Cat cat", "cat")).toEqual([{ start: 4, end: 7 }]);
    expect(findRanges("Cat cat", "cat", { caseSensitive: false })).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ]);
  });

  it("matches whole words only when asked", () => {
    expect(
      findRanges("cat concatenate cat", "cat", { wholeWord: true }),
    ).toEqual([
      { start: 0, end: 3 },
      { start: 16, end: 19 },
    ]);
    expect(findRanges("cat_x cat2 cat", "cat", { wholeWord: true })).toEqual([
      { start: 11, end: 14 },
    ]);
  });

  it("treats a regex character as a literal", () => {
    expect(findRanges("a.b axb", "a.b", { caseSensitive: false })).toEqual([
      { start: 0, end: 3 },
    ]);
  });

  it("finds a whole-word match inside an occurrence the rule rejects", () => {
    expect(findRanges("xa.a.a ", "a.a", { wholeWord: true })).toEqual([
      { start: 3, end: 6 },
    ]);
    expect(
      findRanges("xA.A.A ", "a.a", { caseSensitive: false, wholeWord: true }),
    ).toEqual([{ start: 3, end: 6 }]);
  });

  it("still skips a whole-word match that overlaps one it accepts", () => {
    expect(findRanges("a.a.a ", "a.a", { wholeWord: true })).toEqual([
      { start: 0, end: 3 },
    ]);
  });

  it("finds every match in a document larger than the call stack", () => {
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

    expect(replaceAll("abc", "a", "x")).toBe("xbc");
  });

  it("replaces with the options the count used", () => {
    expect(replaceAll("Cat cat", "cat", "dog", { caseSensitive: false })).toBe(
      "dog dog",
    );
    expect(
      replaceAll("cat concatenate", "cat", "fox", { wholeWord: true }),
    ).toBe("fox concatenate");
  });

  it("replaces a whole word that overlaps a rejected occurrence", () => {
    expect(replaceAll("xa.a.a ", "a.a", "Z", { wholeWord: true })).toBe(
      "xa.Z ",
    );
  });

  it("replaces every match in a document larger than the call stack", () => {
    const replaced = replaceAll("a".repeat(20_000), "a", "b");
    expect(replaced).toBe("b".repeat(20_000));
  });
});

describe("matchReadout", () => {
  it("reports the active match of the total, and nothing before a query", () => {
    expect(matchReadout("", 0, 0)).toBe("");
    expect(matchReadout("cat", 0, 3)).toBe("1 / 3");
    expect(matchReadout("cat", 2, 3)).toBe("3 / 3");
    expect(matchReadout("z", 0, 0)).toBe("No matches");
  });

  it("does not report a count at rest (negative control)", () => {
    expect(matchReadout("", 0, 0)).not.toBe("No matches");
    expect(matchReadout("", 0, 0)).not.toBe("1 / 0");
  });
});
