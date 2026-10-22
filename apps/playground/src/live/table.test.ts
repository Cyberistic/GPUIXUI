/**
 * Guards the row set and the sort rule the `table-lifecycle` probe asserts
 * against.
 *
 * Three paint checks rest on the fixture, not on the runtime: pressing the size
 * header must paint a different first row than the name header, flipping it must
 * paint another, and a size sort must have one order rather than a tie whose
 * winner the renderer picks. A fixture whose orders coincided would keep the
 * probe green while it measured only that a press repainted something.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  TABLE_ROWS,
  TABLE_SORT,
  sortLabel,
  sortTable,
  tableRows,
  toggleSort,
} from "./table.js";

const first = (column: "name" | "size", descending: boolean): string =>
  Option.getOrElse(
    Option.map(Arr.head(sortTable({ column, descending })), (row) => row.name),
    () => "",
  );

const lastSize = (descending: boolean): number =>
  Option.getOrElse(
    Option.map(
      Arr.last(sortTable({ column: "size", descending })),
      (row) => row.size,
    ),
    () => -1,
  );

describe("the table-lifecycle fixture", () => {
  it("paints a different first row per column and direction", () => {
    expect(first("name", false)).toBe("Item 000");
    expect(first("name", true)).toBe(`Item 0${TABLE_ROWS - 1}`);
    expect(first("size", false)).toBe("Item 005");
    expect(first("size", true)).toBe("Item 004");
  });

  it("orders sizes whole, with ties broken by record", () => {
    expect(lastSize(false)).toBe(64);
    expect(lastSize(true)).toBe(16);
    const tied = Arr.filter(
      sortTable({ column: "size", descending: false }),
      (row) => row.size === 16,
    );
    expect(Arr.map(tied, (row) => row.n)).toEqual([
      5, 12, 19, 26, 33, 40, 47, 54,
    ]);
  });

  it("sorts every record exactly once", () => {
    const names = Arr.map(tableRows, (row) => row.name);
    expect(Arr.length(Arr.dedupe(names))).toBe(TABLE_ROWS);
    expect(Arr.length(sortTable({ column: "size", descending: true }))).toBe(
      TABLE_ROWS,
    );
  });

  it("flips the column it is on and starts another ascending", () => {
    expect(toggleSort(TABLE_SORT, "name")).toEqual({
      column: "name",
      descending: true,
    });
    expect(toggleSort({ column: "name", descending: true }, "size")).toEqual({
      column: "size",
      descending: false,
    });
    expect(sortLabel({ column: "size", descending: true })).toBe("size-desc");
  });
});
