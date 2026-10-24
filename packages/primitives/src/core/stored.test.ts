import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { storedList, storedText, storedTextList } from "./stored.js";

describe("storedText", () => {
  it("keeps a string as written and reads every non-string as absence", () => {
    expect(storedText("  As written  ")).toBe("  As written  ");
    expect(storedText("")).toBe("");
    expect(storedText(null)).toBeUndefined();
    expect(storedText(undefined)).toBeUndefined();
    expect(storedText(7)).toBeUndefined();
    expect(storedText({ value: "x" })).toBeUndefined();
  });
});

describe("storedList", () => {
  it("reads only a real array as a list, and drops an entry the reader refuses", () => {
    const numbers = (entry: unknown): Option.Option<number> =>
      typeof entry === "number" ? Option.some(entry) : Option.none();

    expect(storedList([1, "two", 3], numbers)).toEqual([1, 3]);
    expect(storedList(null, numbers)).toEqual([]);
    expect(storedList({ 0: 1, length: 1 }, numbers)).toEqual([]);
    expect(storedList("one", numbers)).toEqual([]);
    expect(storedList(undefined, numbers)).toEqual([]);
  });
});

describe("storedTextList", () => {
  it("keeps the text entries of a list and reads a value that is not a list as absence", () => {
    expect(storedTextList(["a", 2, null, "b"])).toStrictEqual(
      Option.some(["a", "b"]),
    );
    expect(storedTextList([])).toStrictEqual(Option.some([]));
    // A map a record wrote in an older shape is absence, not an empty choice.
    expect(storedTextList({ a: true })).toStrictEqual(Option.none());
    expect(storedTextList(null)).toStrictEqual(Option.none());
    expect(storedTextList("a")).toStrictEqual(Option.none());
  });
});
