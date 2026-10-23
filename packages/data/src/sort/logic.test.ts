/**
 * The sort press cycle, as data.
 *
 * The bugs these guard: a second press that sorts the same direction again; a
 * press on another column inheriting the first column's direction; a Shift
 * press that replaces a multi-column order instead of adding its tie-break (or
 * that appends a field already in the order instead of flipping it); and an
 * accessible name that does not say the state (0.11.0 has no `aria-sort`, so
 * the name is the channel).
 *
 * The **order** is no longer computed here — `constructGrid` registers
 * `sortFn_basic` and `grid-core.test.ts` holds the row model to numeric and
 * code-unit order, and to the tie-break a second entry applies.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  directionIn,
  directionOf,
  pressSortOrder,
  sortLabel,
  sortOrderGlyph,
  sortOrderLabel,
  sortPosition,
  toggleSort,
  type SortState,
} from "./logic.js";

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

describe("the order a press produces", () => {
  const statusFirst = [
    { field: "status", direction: "asc" },
    { field: "name", direction: "asc" },
  ] as const;

  it("replaces a multi-column order with the pressed field, keeping the cycle", () => {
    expect(pressSortOrder(statusFirst, "status")).toEqual([
      { field: "status", direction: "desc" },
    ]);
    expect(pressSortOrder(statusFirst, "size", "desc")).toEqual([
      { field: "size", direction: "desc" },
    ]);
  });

  it("appends an unsorted field as the next tie-break on a Shift press", () => {
    expect(
      pressSortOrder(
        [{ field: "status", direction: "asc" }],
        "name",
        "asc",
        true,
      ),
    ).toEqual([
      { field: "status", direction: "asc" },
      { field: "name", direction: "asc" },
    ]);
  });

  it("flips a field where it already sits, keeping every position", () => {
    expect(pressSortOrder(statusFirst, "name", "asc", true)).toEqual([
      { field: "status", direction: "asc" },
      { field: "name", direction: "desc" },
    ]);
    expect(pressSortOrder(statusFirst, "status", "asc", true)).toEqual([
      { field: "status", direction: "desc" },
      { field: "name", direction: "asc" },
    ]);
  });

  it("starts an empty order at the press's own direction", () => {
    expect(pressSortOrder([], "size", "desc", true)).toEqual([
      { field: "size", direction: "desc" },
    ]);
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

  it("reports each field's place in a multi-column order", () => {
    const order = [
      { field: "status", direction: "asc" as const },
      { field: "name", direction: "desc" as const },
    ];
    expect(directionIn(order, "status")).toEqual(Option.some("asc"));
    expect(directionIn(order, "size")).toEqual(Option.none());
    expect(sortPosition(order, "status")).toEqual(Option.some(1));
    expect(sortPosition(order, "name")).toEqual(Option.some(2));
    expect(sortPosition(order, "size")).toEqual(Option.none());
  });

  it("says which sort decides first", () => {
    const order = [
      { field: "status", direction: "asc" as const },
      { field: "name", direction: "desc" as const },
    ];
    expect(sortOrderLabel("Status", order, "status")).toBe(
      "Status, sorted ascending, sort 1 of 2",
    );
    expect(sortOrderLabel("Name", order, "name")).toBe(
      "Name, sorted descending, sort 2 of 2",
    );
    expect(sortOrderLabel("Size", order, "size")).toBe("Size, sortable");
  });

  it("carries the place in the glyph only when the order has more than one", () => {
    const single = [{ field: "name", direction: "desc" as const }];
    const order = [
      { field: "status", direction: "asc" as const },
      { field: "name", direction: "desc" as const },
    ];
    expect(sortOrderGlyph(single, "name")).toBe("↓");
    expect(sortOrderGlyph(order, "status")).toBe("↑1");
    expect(sortOrderGlyph(order, "name")).toBe("↓2");
    expect(sortOrderGlyph(order, "size")).toBe("");
  });
});
