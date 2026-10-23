import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tableWorkflowSource } from "./table-demo";
import {
  ALL_COLUMNS,
  allPageSelected,
  cellsOf,
  clampPage,
  filterRows,
  INITIAL_SORT,
  nextSort,
  normalizeQuery,
  NO_SELECTION,
  pageCount,
  pageSlice,
  PAGE_SIZE,
  pressRow,
  retainSelection,
  somePageSelected,
  sortLabel,
  sortRows,
  TABLE_ROWS,
  toggleColumn,
  togglePageSelection,
  toggleRow,
  visibleRows,
  type ColumnId,
  type PreviewSelection,
  type PreviewSort,
} from "./table-preview";

/**
 * The Table page's previews paint a sort, a selection and a filter, and the
 * shipped parts paint the *package's* rules for those three — a preview that
 * re-invented one would teach a model `@gpuixui/data` does not implement.
 *
 * The preview's copy is pinned here case by case, and the rules it copies are
 * read out of `packages/data/src` so the two cannot drift apart: a sort that
 * stops flipping on the sorted field, a selection that releases no hidden
 * record, or a filter that starts matching across cells fails by name.
 *
 * The filter's rule moved with the table-core migration: `filter/logic.ts` is
 * gone and the query is the core's global filter, configured in `grid-core.ts`.
 * The guard read the deleted module, so the whole suite died at import with
 * `ENOENT` and the preview's filter went unpinned — including the joined-text
 * match the old `textOf` had, which let a query span two cells.
 */

const root = new URL("../../../../../", import.meta.url);

/** Read a source file, naming the one that is gone rather than dying in Vite. */
const read = (path: string): string => {
  const file = new URL(path, root);
  if (!existsSync(file)) {
    throw new Error(
      `the table preview's guard reads ${path}, which no longer exists — point it at the module that owns the rule now`,
    );
  }
  return readFileSync(file, "utf8");
};

const gridCore = read("packages/data/src/grid-core.ts");
const sortLogic = read("packages/data/src/sort/logic.ts");
const selectionLogic = read("packages/data/src/selection/logic.ts");

const ids = (
  rows: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> => rows.map((row) => row.id);

describe("the preview's filter", () => {
  it("matches one literal, case-insensitive query over each cell", () => {
    // The rule the package owns (`grid-core.ts`): the core's `includesString`
    // global filter, fed a trimmed query, over every column's accessor value.
    expect(gridCore).toContain('globalFilterFn: "includesString"');
    expect(gridCore).toContain("globalFilter: state.globalFilter.trim()");
    expect(gridCore).toContain("accessorFn: column.valueOf");

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

    // A query is matched against one cell at a time. `billing-api` and
    // `production` are two cells of one row, so the joined text used to match
    // this and the core does not.
    expect(
      cellsOf({
        id: "billing",
        service: "billing-api",
        environment: "production",
        status: "ready",
        duration: 92,
      }),
    ).toEqual(["billing-api", "production", "ready", "92"]);
    expect(filterRows(TABLE_ROWS, "api production")).toEqual([]);
  });

  it("keeps the page's copyable source on the controller the package ships", () => {
    // The snippet a reader copies. It still passed `textOf`/`valueOf` to
    // `useTable` after those options were replaced by one `columns` list, and
    // the lane page still described the sort as a `sortRows` helper the package
    // no longer has.
    expect(gridCore).toContain(
      "readonly valueOf: (row: Row) => string | number",
    );
    expect(read("packages/data/src/use-table.ts")).toContain(
      "readonly columns",
    );

    expect(tableWorkflowSource).toContain("columns: [");
    expect(tableWorkflowSource).not.toContain("textOf");
    expect(tableWorkflowSource).toContain("table.query");
    expect(tableWorkflowSource).toContain("table.setQuery");

    const tablePage = read("apps/docs/content/docs/components/table.mdx");
    expect(tablePage).toContain("columns: [");
    expect(tablePage).not.toContain("textOf");

    const dataPage = read("apps/docs/content/docs/data-display/index.mdx");
    expect(dataPage).toContain('sortFn: "basic"');
    expect(dataPage).not.toContain("sortRows");
  });
});

describe("the preview's sort", () => {
  it("flips the sorted field, starts another at its own direction, and clears on a third press", () => {
    // `sort/logic.ts`'s `toggleSort`: the same field flips, any other starts at
    // the direction the header passes. The preview adds a third, clearing press
    // (`nextSort` returns `null`), which the native header never does — it only
    // hands `Option.some(next)` and clears through `setSort`.
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
    // The third press returns to "none": the header's `↕` glyph, not a sort.
    expect(nextSort({ field: "service", direction: "desc" }, "service")).toBe(
      null,
    );
  });

  it("orders numbers as numbers and keeps the caller's order when unsorted", () => {
    const byDuration = sortRows(TABLE_ROWS, {
      field: "duration",
      direction: "desc",
    });
    expect(byDuration.map((row) => row.duration)).toEqual([
      211, 148, 129, 92, 74, 36,
    ]);
    // Negative control: a lexicographic sort would read the durations as text,
    // putting "92" before "36" and every "1…" hundred first. The preview's
    // order must differ from that string order, or a duration column reading
    // "92 before 36" has sorted digits, not numbers.
    expect(byDuration.map((row) => row.duration)).not.toEqual([
      92, 74, 36, 211, 148, 129,
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
    // Negative control: a chosen record the narrower set hides must not
    // survive, or a "delete selected" would reach a row the table no longer
    // paints.
    expect(
      retainSelection(state, ["billing", "search", "media"]).selected,
    ).not.toContain("gateway");
  });
});

describe("the preview's pagination", () => {
  it("pages five rows and clamps a page the filter no longer spans", () => {
    expect(PAGE_SIZE).toBe(5);

    // Six rows → two pages: five on the first, one on the second.
    expect(pageCount(TABLE_ROWS)).toBe(2);
    expect(ids(pageSlice(TABLE_ROWS, 0))).toEqual([
      "billing",
      "search",
      "gateway",
      "reports",
      "auth",
    ]);
    expect(ids(pageSlice(TABLE_ROWS, 1))).toEqual(["media"]);

    // A filter narrows the set to one page; a page past it clamps to the last.
    const production = filterRows(TABLE_ROWS, "production");
    expect(ids(production)).toEqual(["billing", "gateway", "auth"]);
    expect(pageCount(production)).toBe(1);
    expect(clampPage(3, pageCount(production))).toBe(0);
    expect(ids(pageSlice(production, 3))).toEqual(ids(production));
    // An empty set still spans one page, so the footer never reads "of 0".
    expect(pageCount([])).toBe(1);
    expect(clampPage(0, pageCount([]))).toBe(0);
  });

  it("never returns an empty page while rows still exist", () => {
    // Negative control: an unclamped page 9 would be empty even though two pages
    // of rows exist. The clamp must return rows, not a blank body.
    expect(ids(pageSlice(TABLE_ROWS, 9))).not.toEqual([]);
    expect(ids(pageSlice(TABLE_ROWS, 9))).toEqual(
      ids(pageSlice(TABLE_ROWS, 1)),
    );
  });
});

describe("the preview's column visibility", () => {
  it("toggles a column and returns a re-shown column to its place", () => {
    expect(ALL_COLUMNS).toEqual([
      "service",
      "environment",
      "status",
      "duration",
    ]);

    const withoutService = toggleColumn(ALL_COLUMNS, "service");
    expect(withoutService).toEqual(["environment", "status", "duration"]);
    expect(toggleColumn(withoutService, "service")).toEqual(ALL_COLUMNS);
  });

  it("keeps the last visible column, so a row never loses its text", () => {
    // Negative control: a menu that let the reader hide every column would paint
    // an empty row. The toggle must refuse to empty the set.
    const only: ReadonlyArray<ColumnId> = ["service"];
    expect(toggleColumn(only, "service")).toEqual(["service"]);
    expect(
      ALL_COLUMNS.reduce(
        (visible, id) => toggleColumn(visible, id),
        ALL_COLUMNS,
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("the preview's page selection", () => {
  const pageOne = ids(pageSlice(TABLE_ROWS, 0));
  const pageTwo = ids(pageSlice(TABLE_ROWS, 1));

  it("selects and clears the page, and reports the header box's tri-state", () => {
    const chosen = togglePageSelection(NO_SELECTION, pageOne);
    expect(chosen.selected).toEqual(pageOne);
    expect(allPageSelected(chosen, pageOne)).toBe(true);
    expect(somePageSelected(chosen, pageOne)).toBe(false);

    // Part of the page chosen → indeterminate; a page with nothing → neither.
    const partial: PreviewSelection = {
      selected: ["billing"],
      anchor: "billing",
    };
    expect(allPageSelected(partial, pageOne)).toBe(false);
    expect(somePageSelected(partial, pageOne)).toBe(true);

    // A fully-chosen page toggles off to nothing.
    expect(togglePageSelection(chosen, pageOne).selected).toEqual([]);
  });

  it("leaves the rows pagination hides untouched", () => {
    // Negative control: a header box that reached past the page would select
    // every filtered row. The page select must not claim a row it does not
    // paint — page two's `media` stays unchosen.
    const selected = togglePageSelection(NO_SELECTION, pageOne);
    expect(selected.selected).not.toContain("media");
    expect(allPageSelected(selected, pageTwo)).toBe(false);
  });

  it("toggles one record by its checkbox, without replacing the set", () => {
    const state: PreviewSelection = {
      selected: ["billing"],
      anchor: "billing",
    };
    expect(toggleRow(state, "search")).toEqual({
      selected: ["billing", "search"],
      anchor: "search",
    });
    expect(toggleRow(state, "billing")).toEqual({
      selected: [],
      anchor: "billing",
    });
  });
});
