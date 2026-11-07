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
    expect(escapeClears("invoice", true)).toBe(false);
    expect(escapeClears("invoice", false)).toBe(true);
  });
});
