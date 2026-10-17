/**
 * The multiple-selection rules.
 *
 * The bugs these guard: a toggle that appends a value twice (so the consumer
 * receives `["a", "a"]` from two clicks), a toggle that drops the first-added
 * order, a range that includes a disabled row or reverses when the click lands
 * above the anchor, and a "changed" report for a selection that did not change.
 */

import { describe, expect, it } from "vitest";
import { range, sameValues, toggle, type SelectableRow } from "./selection.js";

/** Four rows in declaration order; the second is disabled. */
const rows: ReadonlyArray<SelectableRow> = [
  { value: "a", disabled: false },
  { value: "b", disabled: true },
  { value: "c", disabled: false },
  { value: "d", disabled: false },
];

describe("toggle", () => {
  it("appends an absent value and keeps the first-added order", () => {
    expect(toggle(["a"], "c")).toEqual(["a", "c"]);
    expect(toggle([], "a")).toEqual(["a"]);
  });

  it("removes a present value", () => {
    expect(toggle(["a", "c", "d"], "c")).toEqual(["a", "d"]);
  });

  it("returns to the original selection after two toggles", () => {
    const once = toggle(["a", "c"], "d");
    expect(toggle(once, "d")).toEqual(["a", "c"]);
  });

  it("never duplicates a value", () => {
    const twice = toggle(toggle(["a"], "a"), "a");
    expect(twice).toEqual(["a"]);
  });
});

describe("range", () => {
  it("selects the enabled rows between the anchor and the target", () => {
    expect(range(rows, "a", "c")).toEqual(["a", "c"]);
    expect(range(rows, "a", "d")).toEqual(["a", "c", "d"]);
  });

  it("omits a disabled row in the middle", () => {
    const selected = range(rows, "a", "d");

    expect(selected).not.toContain("b");
    expect(selected).toEqual(["a", "c", "d"]);
  });

  it("returns the same row order when the target is above the anchor", () => {
    expect(range(rows, "d", "a")).toEqual(range(rows, "a", "d"));
  });

  it("selects a single row when the ends are the same", () => {
    expect(range(rows, "c", "c")).toEqual(["c"]);
  });

  it("falls back to the target when the anchor is unknown or disabled", () => {
    expect(range(rows, "missing", "c")).toEqual(["c"]);
    expect(range(rows, "b", "d")).toEqual(["d"]);
  });

  it("selects nothing when the target is unknown or disabled", () => {
    expect(range(rows, "a", "missing")).toEqual([]);
    expect(range(rows, "a", "b")).toEqual([]);
  });
});

describe("sameValues", () => {
  it("ignores the order of the members", () => {
    expect(sameValues(["a", "c"], ["c", "a"])).toBe(true);
  });

  it("rejects a missing or an extra member", () => {
    expect(sameValues(["a"], ["a", "c"])).toBe(false);
    expect(sameValues(["a", "c"], ["a"])).toBe(false);
  });

  it("treats two empty selections as equal", () => {
    expect(sameValues([], [])).toBe(true);
  });
});
