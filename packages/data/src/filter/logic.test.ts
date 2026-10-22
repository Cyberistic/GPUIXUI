/**
 * Filtering's rules, as data.
 *
 * The bugs these guard: a query interpreted as a pattern (`*` matching
 * everything); a case-sensitive match; a blank query painting an empty table;
 * and — the rule `table-filter-lifecycle` measured — a narrow that returns the
 * rows but keeps a selection it no longer paints.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { pressSelection, emptySelection } from "../selection/logic.js";
import {
  filterRows,
  matchesQuery,
  narrowTable,
  normalizeQuery,
} from "./logic.js";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

const rows: ReadonlyArray<Row> = [
  { id: "r1", name: "auth.ts", status: "tracked" },
  { id: "r2", name: "Auth.test.ts", status: "modified" },
  { id: "r3", name: "readme.md", status: "untracked" },
];

const textOf = (row: Row): string => `${row.name} ${row.status}`;

const ids = (kept: ReadonlyArray<Row>): ReadonlyArray<string> =>
  Arr.map(kept, (row) => row.id);

describe("the query", () => {
  it("is literal and case-insensitive", () => {
    expect(matchesQuery("AUTH", "auth.ts tracked")).toBe(true);
    expect(matchesQuery("*.ts", "auth.ts tracked")).toBe(false);
    expect(normalizeQuery("  Auth  ")).toBe("auth");
  });

  it("matches everything when blank", () => {
    expect(filterRows(rows, "   ", textOf)).toEqual(rows);
  });
});

describe("narrowTable", () => {
  it("narrows the painted rows and releases a hidden selection", () => {
    const selected = pressSelection(emptySelection, "r3", "replace", [
      "r1",
      "r2",
      "r3",
    ]);
    const narrowed = narrowTable(
      rows,
      "auth",
      textOf,
      (row) => row.id,
      selected,
    );
    expect(ids(narrowed.rows)).toEqual(["r1", "r2"]);
    expect(HashSet.size(narrowed.selection.selected)).toBe(0);
  });

  it("keeps a selection the narrowed set still holds", () => {
    const selected = pressSelection(emptySelection, "r1", "replace", [
      "r1",
      "r2",
      "r3",
    ]);
    const narrowed = narrowTable(
      rows,
      "auth",
      textOf,
      (row) => row.id,
      selected,
    );
    expect(HashSet.size(narrowed.selection.selected)).toBe(1);
    expect(narrowed.selection.anchor).toEqual(Option.some("r1"));
  });

  it("returns no rows for a query nothing matches", () => {
    const narrowed = narrowTable(
      rows,
      "zzz",
      textOf,
      (row) => row.id,
      emptySelection,
    );
    expect(narrowed.rows).toEqual([]);
  });
});
