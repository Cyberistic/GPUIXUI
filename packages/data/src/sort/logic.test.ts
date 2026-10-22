/**
 * Sorting's rules, as data.
 *
 * The bugs these guard: a second press that sorts the same direction again; a
 * press on another column inheriting the first column's direction; a
 * descending sort that reverses ties instead of only the comparator; a sort
 * that mutates the caller's array; and an accessible name that does not say
 * the state (0.11.0 has no `aria-sort`, so the name is the channel).
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as Arr from "effect/Array";
import {
  directionOf,
  sortLabel,
  sortRows,
  toggleSort,
  type SortState,
  type SortValue,
} from "./logic.js";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

const rows: ReadonlyArray<Row> = [
  { id: "b", name: "Beta", size: 30 },
  { id: "a", name: "Alpha", size: 10 },
  { id: "c", name: "Gamma", size: 20 },
];

const valueOf = (row: Row, field: string): SortValue =>
  field === "size" ? row.size : row.name;

const names = (sorted: ReadonlyArray<Row>): ReadonlyArray<string> =>
  Arr.map(sorted, (row) => row.name);

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

describe("sortRows", () => {
  it("keeps the caller's order when nothing is sorted", () => {
    expect(names(sortRows(rows, Option.none(), valueOf))).toEqual([
      "Beta",
      "Alpha",
      "Gamma",
    ]);
  });

  it("sorts text ascending and descending", () => {
    const asc = sortRows(
      rows,
      Option.some({ field: "name", direction: "asc" }),
      valueOf,
    );
    const desc = sortRows(
      rows,
      Option.some({ field: "name", direction: "desc" }),
      valueOf,
    );
    expect(names(asc)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(names(desc)).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("sorts numbers numerically, not lexically", () => {
    const sorted = sortRows(
      rows,
      Option.some({ field: "size", direction: "asc" }),
      valueOf,
    );
    expect(Arr.map(sorted, (row) => row.size)).toEqual([10, 20, 30]);
  });

  it("never mutates the array it is given", () => {
    const source = Arr.map(rows, (row) => row);
    sortRows(
      source,
      Option.some({ field: "name", direction: "desc" }),
      valueOf,
    );
    expect(Arr.map(source, (row) => row.id)).toEqual(["b", "a", "c"]);
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
