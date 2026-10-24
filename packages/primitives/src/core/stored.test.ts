import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  storedList,
  storedNumber,
  storedText,
  storedTextList,
} from "./stored.js";

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

describe("storedNumber", () => {
  it("keeps a number a store wrote and reads everything else as absence", () => {
    // The bug guarded: a measurement a store keeps — a bar's share, a count —
    // was read with `Option.fromNullishOr`, which refuses only `null` and
    // `undefined`. A share written as text therefore counted as a measurement
    // and reached `Math.max` as `NaN`. Text is not a number this library
    // coerces: `parseNumberText` is the one seam that reads text as a number,
    // and it is explicit about it.
    expect(storedNumber(42.5)).toStrictEqual(Option.some(42.5));
    expect(storedNumber(0)).toStrictEqual(Option.some(0));
    expect(storedNumber(-3)).toStrictEqual(Option.some(-3));
    // A bar past its end, and a share the clamp reads as empty, are still
    // numbers: what they mean is the arithmetic's decision.
    expect(storedNumber(Number.POSITIVE_INFINITY)).toStrictEqual(
      Option.some(Number.POSITIVE_INFINITY),
    );
    expect(Option.isSome(storedNumber(Number.NaN))).toBe(true);
    expect(storedNumber("42")).toStrictEqual(Option.none());
    expect(storedNumber("")).toStrictEqual(Option.none());
    expect(storedNumber(null)).toStrictEqual(Option.none());
    expect(storedNumber(undefined)).toStrictEqual(Option.none());
    expect(storedNumber({ value: 42 })).toStrictEqual(Option.none());
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
