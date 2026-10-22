/**
 * The search preview's filter and its Escape rule.
 *
 * The bugs these guard: a filter that hides the list at rest, a query that only
 * matches one of the two fields a reader can see, a case or whitespace the
 * preview ignores while the app would not, a count that reports the total rather
 * than the painted set, and an Escape that clears an empty or disabled field —
 * the cases the shipped component leaves alone so an enclosing dialog still
 * receives the key.
 */

import { describe, expect, it } from "vitest";
import {
  countLabel,
  escapeClears,
  filterRows,
  matchesRow,
  type PreviewRow,
} from "./search-input-preview";

const api = {
  name: "api-gateway",
  region: "fra1 · edge",
} satisfies PreviewRow;

const rows: ReadonlyArray<PreviewRow> = [
  api,
  { name: "billing-worker", region: "iad1 · queue" },
  { name: "search-index", region: "fra1 · worker" },
];

describe("the search preview's filter", () => {
  it("keeps every row at rest, including a whitespace-only query", () => {
    expect(filterRows(rows, "")).toEqual(rows);
    expect(filterRows(rows, "   ")).toEqual(rows);
  });

  it("matches the name case-insensitively", () => {
    expect(filterRows(rows, "GATEWAY").map((row) => row.name)).toEqual([
      "api-gateway",
    ]);
  });

  it("matches a region a reader can see, not only the name", () => {
    expect(filterRows(rows, "fra1").map((row) => row.name)).toEqual([
      "api-gateway",
      "search-index",
    ]);
  });

  it("paints no row for a query nothing carries", () => {
    expect(filterRows(rows, "postgres")).toEqual([]);
  });

  it("counts the painted set, not the whole list", () => {
    expect(countLabel(filterRows(rows, "fra1").length, rows.length)).toBe(
      "2 of 3",
    );
    expect(countLabel(0, rows.length)).toBe("0 of 3");
  });

  it("trims the query before matching", () => {
    expect(matchesRow(api, "  api  ")).toBe(true);
  });
});

describe("the search preview's Escape rule", () => {
  it("clears a field that holds text", () => {
    expect(escapeClears("invoice")).toBe(true);
  });

  it("leaves an empty field alone, so an enclosing dialog keeps the key", () => {
    expect(escapeClears("")).toBe(false);
  });

  it("leaves a disabled field alone, even when it holds text", () => {
    // The shipped field refuses every edit path while disabled, including
    // Escape — so the key must reach whatever encloses the field instead of
    // being swallowed by a clear that cannot happen.
    expect(escapeClears("invoice", true)).toBe(false);
    expect(escapeClears("invoice", false)).toBe(true);
  });
});
