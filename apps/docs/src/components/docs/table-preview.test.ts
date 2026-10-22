import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  filterRows,
  INITIAL_SORT,
  normalizeQuery,
  nextSort,
  NO_SELECTION,
  pressRow,
  readout,
  retainSelection,
  sortLabel,
  sortRows,
  TABLE_ROWS,
  visibleRows,
  type PreviewSelection,
  type PreviewSort,
} from "./table-preview";

/**
 * The Table page's previews paint a sort, a selection and a filter, and the
 * shipped parts paint the *package's* rules for those three — a preview that
 * re-invented one would teach a model `@gpuixui/data` does not implement.
 *
 * The preview's copy is pinned here case by case, and the rules it copies are
 * read out of `packages/data/src` so the two cannot drift apart: a filter that
 * stops lowercasing, a sort that stops flipping on the sorted field, or a
 * selection that releases no hidden record fails by name.
 */

const root = new URL("../../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const filterLogic = read("packages/data/src/filter/logic.ts");
const sortLogic = read("packages/data/src/sort/logic.ts");
const selectionLogic = read("packages/data/src/selection/logic.ts");

const ids = (
  rows: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> => rows.map((row) => row.id);

describe("the preview's filter", () => {
  it("matches one literal, case-insensitive query over every cell", () => {
    // The rule the package owns (`filter/logic.ts`): trimmed, lowercased, never
    // a pattern, and matched as a substring of the row's own text.
    expect(filterLogic).toContain("pipe(query, Str.trim, Str.toLowerCase)");
    expect(filterLogic).toContain(
      "Str.includes(needle, 0)(Str.toLowerCase(text))",
    );

    expect(TABLE_ROWS.length).toBe(6);
    expect(ids(filterRows(TABLE_ROWS, ""))).toEqual(ids(TABLE_ROWS));
    expect(ids(filterRows(TABLE_ROWS, "   "))).toEqual(ids(TABLE_ROWS));
    expect(ids(filterRows(TABLE_ROWS, "  production  "))).toEqual([
      "billing",
      "gateway",
      "auth",
    ]);
    expect(ids(filterRows(TABLE_ROWS, "PROD"))).toEqual([
      "billing",
      "gateway",
      "auth",
    ]);
    // Every cell is searchable, not only the first one: `36` is a duration and
    // `staging` is an environment.
    expect(ids(filterRows(TABLE_ROWS, "36"))).toEqual(["gateway"]);
    expect(ids(filterRows(TABLE_ROWS, "staging"))).toEqual([
      "search",
      "reports",
    ]);
    expect(filterRows(TABLE_ROWS, "no-such-service")).toEqual([]);
    // A query is not a pattern.
    expect(filterRows(TABLE_ROWS, ".*")).toEqual([]);
    expect(normalizeQuery("  PROD ")).toBe("prod");
  });
});

describe("the preview's sort", () => {
  it("flips the sorted field and starts another at its own direction", () => {
    // `sort/logic.ts`'s `toggleSort`: the same field flips, any other starts at
    // the direction the header passes.
    expect(sortLogic).toContain('state.direction === "asc" ? "desc" : "asc"');
    expect(sortLogic).toContain("initialDirection");

    expect(nextSort(null, "service")).toEqual({
      field: "service",
      direction: "asc",
    });
    expect(nextSort(INITIAL_SORT, "service")).toEqual({
      field: "service",
      direction: "desc",
    });
    expect(nextSort(INITIAL_SORT, "duration", "desc")).toEqual({
      field: "duration",
      direction: "desc",
    });
    expect(nextSort(INITIAL_SORT, "environment", "desc")).toEqual({
      field: "environment",
      direction: "desc",
    });
  });

  it("orders numbers as numbers and keeps the caller's order when unsorted", () => {
    const byDuration = sortRows(TABLE_ROWS, {
      field: "duration",
      direction: "desc",
    });
    expect(byDuration.map((row) => row.duration)).toEqual([
      211, 148, 129, 92, 74, 36,
    ]);

    const byName: PreviewSort = { field: "service", direction: "asc" };
    expect(ids(sortRows(TABLE_ROWS, byName))).toEqual([
      "auth",
      "billing",
      "gateway",
      "media",
      "reports",
      "search",
    ]);

    // Unsorted is the caller's order, not a default sort.
    expect(ids(sortRows(TABLE_ROWS, null))).toEqual(ids(TABLE_ROWS));
    // A sort never mutates the fixture the next preview reads.
    expect(ids(TABLE_ROWS)).toEqual([
      "billing",
      "search",
      "gateway",
      "reports",
      "auth",
      "media",
    ]);
    // Filter first, then sort: the rows a query keeps are the rows ordered.
    expect(
      ids(
        visibleRows(TABLE_ROWS, "production", {
          field: "duration",
          direction: "asc",
        }),
      ),
    ).toEqual(["gateway", "auth", "billing"]);
  });

  it("announces the sorted column because the runtime has no aria-sort", () => {
    expect(sortLogic).toContain(
      'rather than "Name" and a glyph they cannot see',
    );
    expect(sortLabel("Service", INITIAL_SORT, "service")).toBe(
      "Service, sorted ascending",
    );
    expect(sortLabel("Service", INITIAL_SORT, "duration")).toBe(
      "Service, sortable",
    );
    expect(
      sortLabel("Service", { field: "service", direction: "desc" }, "service"),
    ).toBe("Service, sorted descending");
  });
});

describe("the preview's selection", () => {
  const order = ids(TABLE_ROWS);

  it("replaces on a plain press, toggles on a chord and extends from the anchor", () => {
    // The package's order is `shift` first, then the toggle chord, then replace
    // (`selection/logic.ts`), and a range keeps the anchor it extended from.
    expect(selectionLogic).toContain("modifiers.shift === true");
    expect(selectionLogic).toContain("A range keeps the anchor");

    const chosen: PreviewSelection = {
      selected: ["billing"],
      anchor: "billing",
    };
    expect(pressRow(chosen, "search", {}, order)).toEqual({
      selected: ["search"],
      anchor: "search",
    });
    expect(pressRow(chosen, "search", { cmd: true }, order)).toEqual({
      selected: ["billing", "search"],
      anchor: "search",
    });
    expect(pressRow(chosen, "billing", { ctrl: true }, order)).toEqual({
      selected: [],
      anchor: "billing",
    });
    expect(pressRow(chosen, "reports", { shift: true }, order)).toEqual({
      selected: ["billing", "search", "gateway", "reports"],
      anchor: "billing",
    });
    // A chord cannot narrow a range that `shift` asked for.
    expect(
      pressRow(chosen, "search", { shift: true, cmd: true }, order),
    ).toEqual({
      selected: ["billing", "search"],
      anchor: "billing",
    });
    // The range is measured in the visible order, and it is clamped to it.
    expect(pressRow(NO_SELECTION, "media", { shift: true }, order)).toEqual({
      selected: ["media"],
      anchor: "media",
    });
  });

  it("releases a chosen record a filter hides, and the anchor with it", () => {
    // `retainSelection`'s rule, and the reason a filtered table cannot act on a
    // record it does not paint.
    expect(selectionLogic).toContain("export const retainSelection");

    const state: PreviewSelection = {
      selected: ["billing", "search", "gateway"],
      anchor: "billing",
    };
    expect(retainSelection(state, ["billing", "search", "media"])).toEqual({
      selected: ["billing", "search"],
      anchor: "billing",
    });
    expect(retainSelection(state, ["search"])).toEqual({
      selected: ["search"],
      anchor: null,
    });
    expect(retainSelection(state, [])).toEqual({ selected: [], anchor: null });
  });
});

describe("the preview's readout", () => {
  it("prints the rows it paints, the chosen count and the sorted column", () => {
    const sort: PreviewSort = { field: "duration", direction: "asc" };
    const shown = visibleRows(TABLE_ROWS, "ready", sort);

    expect(
      readout(shown, { selected: ["billing"], anchor: "billing" }, sort),
    ).toBe(`${shown.length} rows · 1 selected · duration asc`);
    expect(readout(TABLE_ROWS, NO_SELECTION, null)).toBe(
      "6 rows · 0 selected · unsorted",
    );
  });
});
