/**
 * Guards the replace bar's offset and cursor arithmetic.
 *
 * The bugs these catch: folding ranges left-to-right (the classic replace-all
 * corruption — a longer replacement shifts the next range and the second edit
 * lands inside the first), and returning the requested cursor index unclamped
 * after the document loses its last match (a find bar reading "3 of 2").
 *
 * The fixtures are the document plan `334` measures: five `error` matches over
 * five lines, a count-preserving `error` → `ERROR`, and length-changing
 * `error` → `errors` / `error` → `err`.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import {
  matchText,
  nextCursor,
  replaceRange,
  replaceRanges,
} from "./replace-state.js";

describe("replaceRange", () => {
  it("replaces exactly the matched run", () => {
    expect(replaceRange("an error follows", [3, 8], "fixed")).toBe(
      "an fixed follows",
    );
  });

  it("leaves a zero-length range's text alone", () => {
    // A zero-length range cannot come from `findRanges`; the guard is that the
    // function still inserts at the cursor rather than dropping text.
    expect(replaceRange("abc", [1, 1], "-")).toBe("a-bc");
  });
});

describe("matchText", () => {
  it("reads the UTF-16 slice the range describes", () => {
    expect(matchText("the last error", [9, 14])).toBe("error");
  });
});

describe("replaceRanges", () => {
  it("applies every range right to left", () => {
    // A left-to-right fold replaces 0..5 first and the second range then lands
    // one character late, because "fixed!" is longer than "error".
    expect(
      replaceRanges(
        "error error here",
        [
          [0, 5],
          [6, 11],
        ],
        "fixed!",
      ),
    ).toBe("fixed! fixed! here");
  });

  it("handles a length-changing replacement without corrupting later ranges", () => {
    expect(
      replaceRanges(
        "error error here",
        [
          [0, 5],
          [6, 11],
        ],
        "err",
      ),
    ).toBe("err err here");
  });

  it("is the identity for no ranges", () => {
    expect(replaceRanges("unchanged", [], "fixed")).toBe("unchanged");
  });
});

describe("nextCursor", () => {
  it("keeps the replaced index when matches remain after it", () => {
    expect(nextCursor(4, 2)).toEqual(Option.some(2));
  });

  it("clamps to the new last match when the replaced one was last", () => {
    expect(nextCursor(4, 4)).toEqual(Option.some(3));
  });

  it("has no cursor when the document has no matches left", () => {
    expect(nextCursor(0, 2)).toEqual(Option.none());
  });
});
