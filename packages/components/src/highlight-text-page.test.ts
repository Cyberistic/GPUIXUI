/**
 * The range rule the page teaches, held to the entry points that apply it.
 *
 * The bug this guards: `HighlightText`'s `ranges` are caller arithmetic — a find
 * bar's `indexOf` answers `-1` for no match, a document offset is measured, a
 * selection end is rounded — and the page taught only that they index UTF-16
 * units. The pair went to the runtime's `highlight` as it arrived, so a negative
 * start (which `String#slice` reads as "from the end") painted nothing and
 * reached the host as a negative offset, and a `NaN` pair was handed over as
 * `[NaN, NaN]`. The rule is now that a pair is the part of it inside the phrase,
 * and the page has to print it: the cases below execute the entry points and
 * require the sentences to name what they do.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { marksFor, sweptRanges } from "./highlight-text/logic.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const page = read("../docs/highlight-text.mdx");

describe("the range rule the page teaches", () => {
  it("teaches the pair the entry points paint, not the one it was given", () => {
    // The rule the page describes, measured through the two entry points a
    // caller's pair reaches.
    expect(marksFor("native", { ranges: [[-1, 3]] })).toEqual([[0, 3]]);
    expect(marksFor("native", { ranges: [[1.5, 3.9]] })).toEqual([[1, 3]]);
    expect(marksFor("native", { ranges: [[0, 99]] })).toEqual([[0, 6]]);
    expect(
      marksFor("native", {
        ranges: [
          [Number.NaN, 4],
          [3, 3],
          [5, 2],
        ],
      }),
    ).toEqual([]);
    expect(
      sweptRanges(
        "native",
        [
          [Number.NaN, 4],
          [-1, 2],
        ],
        9,
      ),
    ).toEqual([[0, 2]]);

    // The page prints each half of that rule.
    expect(page).toContain("inside the phrase");
    expect(page).toContain("clamped to it");
    expect(page).toMatch(/truncated\s+to\s+the unit it names/);
    expect(page).toContain("no range at all");
    expect(page).toContain("indexOf` answers `-1` for no match");
  });

  it("keeps the units and the precedence the API row declares", () => {
    // A page that stops naming UTF-16 units, or that lets the query win, would
    // describe a component this one is not.
    expect(page).toContain("UTF-16 units");
    expect(page).toMatch(/wins\s+over `query`/);
    expect(Str.includes("| `ranges` |")(page)).toBe(true);
  });
});
