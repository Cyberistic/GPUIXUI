/**
 * The sort press cycle, as data.
 *
 * The bugs these guard: a second press that sorts the same direction again; a
 * press on another column inheriting the first column's direction; and an
 * accessible name that does not say the state (0.11.0 has no `aria-sort`, so
 * the name is the channel).
 *
 * The **order** is no longer computed here — `constructGrid` registers
 * `sortFn_basic` and `grid-core.test.ts` holds the row model to numeric and
 * code-unit order.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { directionOf, sortLabel, toggleSort, type SortState } from "./logic.js";

describe("toggleSort", () => {
  it("starts a column at its initial direction and flips on the next press", () => {
    const first = toggleSort(Option.none(), "name");
    expect(first).toEqual({ field: "name", direction: "asc" });
    expect(toggleSort(Option.some(first), "name")).toEqual({
      field: "name",
      direction: "desc",
    });
  });

  it("starts another column at its own initial direction", () => {
    const sorted: SortState = { field: "name", direction: "desc" };
    expect(toggleSort(Option.some(sorted), "size", "desc")).toEqual({
      field: "size",
      direction: "desc",
    });
  });
});

describe("the announced state", () => {
  it("names the sorted column and its direction", () => {
    const sort = Option.some<SortState>({ field: "name", direction: "desc" });
    expect(sortLabel("Name", sort, "name")).toBe("Name, sorted descending");
    expect(sortLabel("Size", sort, "size")).toBe("Size, sortable");
  });

  it("reports a direction only for the sorted field", () => {
    const sort = Option.some<SortState>({ field: "size", direction: "asc" });
    expect(directionOf(sort, "size")).toEqual(Option.some("asc"));
    expect(directionOf(sort, "name")).toEqual(Option.none());
  });
});
