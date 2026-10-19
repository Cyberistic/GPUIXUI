/**
 * Breadcrumb collapsing.
 *
 * The bugs these guard: a long path dropped the current page (the tail was
 * computed from the wrong end), `maxItems: 1` produced a trail with no first
 * entry and no last entry, so the ellipsis stood alone, and a non-finite budget
 * (`NaN`) skipped the "fits" branch and dropped the whole tail (plan 649).
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { collapse, crumb } from "./logic.js";

const items = (...values: ReadonlyArray<string>): ReadonlyArray<string> =>
  values;

const rendered = (
  crumbs: ReturnType<typeof collapse<string>>,
): ReadonlyArray<string> =>
  crumbs.flatMap((entry) => (entry.kind === "item" ? [entry.item] : ["…"]));

describe("collapse", () => {
  it("returns an empty trail unchanged", () => {
    expect(collapse(items(), 4)).toEqual([]);
  });

  it("returns a trail that fits unchanged, in order", () => {
    expect(collapse(items("a", "b", "c"), 3)).toEqual([
      crumb("a"),
      crumb("b"),
      crumb("c"),
    ]);
    expect(collapse(items("a", "b"), 4)).toEqual([crumb("a"), crumb("b")]);
  });

  it("keeps the first entry, an ellipsis and the tail", () => {
    expect(collapse(items("a", "b", "c", "d", "e"), 4)).toEqual([
      crumb("a"),
      { kind: "ellipsis" },
      crumb("d"),
      crumb("e"),
    ]);
  });

  it("always keeps the last entry, which is the current page", () => {
    const crumbs = collapse(items("a", "b", "c", "d", "e", "f", "g"), 3);
    expect(rendered(crumbs)).toEqual(["a", "…", "g"]);
  });

  it("ignores a non-finite budget instead of hiding the tail", () => {
    // `Arr.takeRight` treats `NaN` as 0, so the old `Math.max(3, NaN)` budget
    // painted only `a …` and dropped the current page (plan 649).
    expect(collapse(items("a", "b", "c", "d", "e"), Number.NaN)).toEqual([
      crumb("a"),
      crumb("b"),
      crumb("c"),
      crumb("d"),
      crumb("e"),
    ]);
    expect(
      collapse(items("a", "b", "c", "d", "e"), Number.POSITIVE_INFINITY),
    ).toHaveLength(5);
  });

  it("never renders more entries than the budget", () => {
    Arr.forEach([3, 4, 5, 6], (maxItems) => {
      expect(
        collapse(items("a", "b", "c", "d", "e", "f", "g", "h"), maxItems)
          .length,
      ).toBeLessThanOrEqual(maxItems);
    });
  });

  it("clamps a budget below three", () => {
    expect(collapse(items("a", "b", "c", "d"), 1)).toEqual([
      crumb("a"),
      { kind: "ellipsis" },
      crumb("d"),
    ]);
    expect(collapse(items("a", "b", "c"), 0)).toEqual([
      crumb("a"),
      crumb("b"),
      crumb("c"),
    ]);
  });

  it("renders one ellipsis at most", () => {
    const ellipses = collapse(items("a", "b", "c", "d", "e", "f"), 3).filter(
      (entry) => entry.kind === "ellipsis",
    );
    expect(ellipses).toHaveLength(1);
  });
});
