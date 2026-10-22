/**
 * Breadcrumb collapsing.
 *
 * The bugs these guard: a long path dropped the current page (the tail was
 * computed from the wrong end), and `maxItems: 1` produced a trail with no
 * first entry and no last entry, so the ellipsis stood alone.
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

  it("reads a budget it cannot read as the minimum", () => {
    // `Math.floor(width / 96)` over a width that never arrived is NaN; a budget
    // that hides the tail would leave an ellipsis where the current page is.
    expect(collapse(items("a", "b", "c", "d", "e"), Number.NaN)).toEqual([
      crumb("a"),
      { kind: "ellipsis" },
      crumb("e"),
    ]);
    // An infinite budget is a readable "no limit", not the minimum.
    expect(
      collapse(items("a", "b", "c", "d"), Number.POSITIVE_INFINITY),
    ).toEqual([crumb("a"), crumb("b"), crumb("c"), crumb("d")]);
  });

  it("renders one ellipsis at most", () => {
    const ellipses = collapse(items("a", "b", "c", "d", "e", "f"), 3).filter(
      (entry) => entry.kind === "ellipsis",
    );
    expect(ellipses).toHaveLength(1);
  });
});
