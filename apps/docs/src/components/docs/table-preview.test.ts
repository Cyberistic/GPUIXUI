import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tableWorkflowSource } from "./table-demo";
import {
  ALL_COLUMNS,
  TABLE_TRACKS,
  tableTracks,
  allPageSelected,
  cellsOf,
  clampPage,
  directionIn,
  filterRows,
  INITIAL_ORDER,
  normalizeQuery,
  NO_SELECTION,
  pageCount,
  pageSlice,
  PAGE_SIZE,
  pressRow,
  pressSortOrder,
  retainSelection,
  somePageSelected,
  sortOrderGlyph,
  sortOrderLabel,
  sortRows,
  TABLE_ROWS,
  toggleColumn,
  togglePageSelection,
  toggleRow,
  visibleRows,
  type ColumnId,
  type PreviewSelection,
  type PreviewSortOrder,
} from "./table-preview";

const root = new URL("../../../../../", import.meta.url);

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
const useTableSource = read("packages/data/src/use-table.ts");

const ids = (
  rows: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> => rows.map((row) => row.id);

describe("the preview's filter", () => {
  it("matches one literal, case-insensitive query over each cell", () => {
    expect(gridCore).toContain('globalFilterFn: "includesString"');
    expect(gridCore).toMatch(
      /globalFilter: [A-Za-z_$][\w$]*\.globalFilter\.trim\(\)/,
    );
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

    expect(ids(filterRows(TABLE_ROWS, "36"))).toEqual(["gateway"]);
    expect(ids(filterRows(TABLE_ROWS, "staging"))).toEqual([
      "search",
      "reports",
    ]);
    expect(filterRows(TABLE_ROWS, "no-such-service")).toEqual([]);

    expect(filterRows(TABLE_ROWS, ".*")).toEqual([]);
    expect(normalizeQuery("  PROD ")).toBe("prod");

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

  it("leaves a hidden column out of the query, and keeps its sort", () => {
    expect(gridCore).toContain(
      "enableGlobalFilter: !HashSet.has(hidden, column.id)",
    );

    expect(ids(filterRows(TABLE_ROWS, "staging"))).toEqual([
      "search",
      "reports",
    ]);
    expect(
      filterRows(TABLE_ROWS, "staging", ["service", "status", "duration"]),
    ).toEqual([]);

    expect(ids(filterRows(TABLE_ROWS, "staging", ["environment"]))).toEqual([
      "search",
      "reports",
    ]);

    expect(
      ids(
        visibleRows(
          TABLE_ROWS,
          "",
          [{ field: "environment", direction: "asc" }],
          ["service"],
        ),
      ),
    ).toEqual(["media", "billing", "gateway", "auth", "search", "reports"]);

    const workflow = readFileSync(
      new URL("./table-demo.tsx", import.meta.url),
      "utf8",
    );
    expect(workflow).toContain("visibleRows(rows, query, order, columns)");
    expect(workflow).toContain("visibleRows(rows, next, order, columns)");
  });

  it("keeps the page's copyable source on the controller the package ships", () => {
    expect(gridCore).toContain(
      "readonly valueOf: (row: Row) => string | number",
    );
    expect(useTableSource).toContain("readonly columns");
    expect(useTableSource).toContain("readonly sortOrder: SortOrder");

    expect(tableWorkflowSource).toContain("columns: [");
    expect(tableWorkflowSource).not.toContain("textOf");
    expect(tableWorkflowSource).toContain("hiddenColumns: columns.hidden");
    expect(tableWorkflowSource).toContain("useColumns");
    expect(tableWorkflowSource).toContain("table.query");
    expect(tableWorkflowSource).toContain("table.setQuery");
    expect(tableWorkflowSource).toContain("order={table.sortOrder}");
    expect(tableWorkflowSource).toContain("onSortPress={table.pressSort}");
    expect(tableWorkflowSource).not.toContain("onSort={(next)");

    const tablePage = read("apps/docs/content/docs/components/table.mdx");
    expect(tablePage).toContain("columns: [");
    expect(tablePage).not.toContain("textOf");
    expect(tablePage).toContain("hiddenColumns: columns.hidden");
    expect(tablePage).not.toContain("sortRows");
  });
});

describe("the preview's sort", () => {
  it("presses the cycle the package implements, and Shift adds a tie-break", () => {
    expect(sortLogic).toContain("export const pressSortOrder");
    expect(sortLogic).toContain("additive: boolean = false");
    expect(sortLogic).toContain("flip(entry.direction)");
    expect(useTableSource).toContain(
      'pressSortOrder(sortOrder, field, "asc", additive)',
    );
    expect(useTableSource).toContain(
      "pressSort: (field, initialDirection, modifiers) =>",
    );

    expect(pressSortOrder(INITIAL_ORDER, "service")).toEqual([
      { field: "service", direction: "desc" },
    ]);

    expect(pressSortOrder(INITIAL_ORDER, "duration", "desc")).toEqual([
      { field: "duration", direction: "desc" },
    ]);

    expect(
      pressSortOrder(
        [
          { field: "environment", direction: "asc" },
          { field: "service", direction: "desc" },
        ],
        "duration",
      ),
    ).toEqual([{ field: "duration", direction: "asc" }]);

    expect(
      pressSortOrder(
        [{ field: "environment", direction: "asc" }],
        "service",
        "asc",
        true,
      ),
    ).toEqual([
      { field: "environment", direction: "asc" },
      { field: "service", direction: "asc" },
    ]);

    expect(
      pressSortOrder(
        [
          { field: "environment", direction: "asc" },
          { field: "service", direction: "asc" },
        ],
        "service",
        "asc",
        true,
      ),
    ).toEqual([
      { field: "environment", direction: "asc" },
      { field: "service", direction: "desc" },
    ]);

    expect(pressSortOrder([], "size", "desc", true)).toEqual([
      { field: "size", direction: "desc" },
    ]);
    expect(pressSortOrder([], "size")).toEqual([
      { field: "size", direction: "asc" },
    ]);
    expect(directionIn(INITIAL_ORDER, "service")).toBe("asc");
    expect(directionIn(INITIAL_ORDER, "duration")).toBeUndefined();
  });

  it("orders numbers as numbers and keeps the caller's order when unsorted", () => {
    const byDuration = sortRows(TABLE_ROWS, [
      { field: "duration", direction: "desc" },
    ]);
    expect(byDuration.map((row) => row.duration)).toEqual([
      211, 148, 129, 92, 74, 36,
    ]);

    expect(byDuration.map((row) => row.duration)).not.toEqual([
      92, 74, 36, 211, 148, 129,
    ]);

    const byName: PreviewSortOrder = [{ field: "service", direction: "asc" }];
    expect(ids(sortRows(TABLE_ROWS, byName))).toEqual([
      "auth",
      "billing",
      "gateway",
      "media",
      "reports",
      "search",
    ]);

    expect(ids(sortRows(TABLE_ROWS, []))).toEqual(ids(TABLE_ROWS));

    expect(ids(TABLE_ROWS)).toEqual([
      "billing",
      "search",
      "gateway",
      "reports",
      "auth",
      "media",
    ]);

    expect(
      ids(
        visibleRows(TABLE_ROWS, "production", [
          { field: "duration", direction: "asc" },
        ]),
      ),
    ).toEqual(["gateway", "auth", "billing"]);
  });

  it("orders by every entry in turn, the first field deciding the ties", () => {
    expect(
      ids(sortRows(TABLE_ROWS, [{ field: "environment", direction: "asc" }])),
    ).toEqual(["media", "billing", "gateway", "auth", "search", "reports"]);
    expect(
      ids(
        sortRows(TABLE_ROWS, [
          { field: "environment", direction: "asc" },
          { field: "service", direction: "desc" },
        ]),
      ),
    ).toEqual(["media", "gateway", "billing", "auth", "search", "reports"]);

    expect(
      ids(
        sortRows(TABLE_ROWS, [
          { field: "environment", direction: "desc" },
          { field: "service", direction: "desc" },
        ]),
      ),
    ).toEqual(["search", "reports", "gateway", "billing", "auth", "media"]);
  });

  it("announces the sorted column because the runtime has no aria-sort", () => {
    expect(sortOrderLabel("Service", INITIAL_ORDER, "service")).toBe(
      "Service, sorted ascending",
    );
    expect(sortOrderLabel("Service", INITIAL_ORDER, "duration")).toBe(
      "Service, sortable",
    );
    expect(
      sortOrderLabel(
        "Service",
        [{ field: "service", direction: "desc" }],
        "service",
      ),
    ).toBe("Service, sorted descending");

    const order: PreviewSortOrder = [
      { field: "environment", direction: "asc" },
      { field: "service", direction: "desc" },
    ];

    expect(sortOrderLabel("Environment", order, "environment")).toBe(
      "Environment, sorted ascending, sort 1 of 2",
    );
    expect(sortOrderLabel("Service", order, "service")).toBe(
      "Service, sorted descending, sort 2 of 2",
    );
    expect(sortOrderGlyph(order, "environment")).toBe("↑1");
    expect(sortOrderGlyph(order, "service")).toBe("↓2");
    expect(sortOrderGlyph(INITIAL_ORDER, "service")).toBe("↑");
    expect(sortOrderGlyph(order, "duration")).toBe("");
  });
});

describe("the preview's selection", () => {
  const order = ids(TABLE_ROWS);

  it("replaces on a plain press, toggles on a chord and extends from the anchor", () => {
    expect(selectionLogic).toContain("modifiers.shift === true");

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

    expect(
      pressRow(chosen, "search", { shift: true, cmd: true }, order),
    ).toEqual({
      selected: ["billing", "search"],
      anchor: "billing",
    });

    expect(pressRow(NO_SELECTION, "media", { shift: true }, order)).toEqual({
      selected: ["media"],
      anchor: "media",
    });
  });

  it("releases a chosen record a filter hides, and the anchor with it", () => {
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

    expect(
      retainSelection(state, ["billing", "search", "media"]).selected,
    ).not.toContain("gateway");
  });
});

describe("the preview's pagination", () => {
  it("pages five rows and clamps a page the filter no longer spans", () => {
    expect(PAGE_SIZE).toBe(5);

    expect(pageCount(TABLE_ROWS)).toBe(2);
    expect(ids(pageSlice(TABLE_ROWS, 0))).toEqual([
      "billing",
      "search",
      "gateway",
      "reports",
      "auth",
    ]);
    expect(ids(pageSlice(TABLE_ROWS, 1))).toEqual(["media"]);

    const production = filterRows(TABLE_ROWS, "production");
    expect(ids(production)).toEqual(["billing", "gateway", "auth"]);
    expect(pageCount(production)).toBe(1);
    expect(clampPage(3, pageCount(production))).toBe(0);
    expect(ids(pageSlice(production, 3))).toEqual(ids(production));

    expect(pageCount([])).toBe(1);
    expect(clampPage(0, pageCount([]))).toBe(0);
  });

  it("never returns an empty page while rows still exist", () => {
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

    const partial: PreviewSelection = {
      selected: ["billing"],
      anchor: "billing",
    };
    expect(allPageSelected(partial, pageOne)).toBe(false);
    expect(somePageSelected(partial, pageOne)).toBe(true);

    expect(togglePageSelection(chosen, pageOne).selected).toEqual([]);
  });

  it("leaves the rows pagination hides untouched", () => {
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

describe("the workflow's tracks", () => {
  const share = (width: string): number =>
    Number.parseFloat(width.replace("%", ""));

  it("sums to the whole table, never to more", () => {
    const tracks = tableTracks(ALL_COLUMNS);

    expect(tracks).toHaveLength(ALL_COLUMNS.length + 2);
    expect(tracks.reduce((sum, width) => sum + share(width), 0)).toBe(100);
  });

  it("names every track as a share, not a pixel width", () => {
    for (const width of Object.values(TABLE_TRACKS)) {
      expect(width.endsWith("%")).toBe(true);
    }
  });

  it("keeps the select track narrower than any data column", () => {
    expect(share(TABLE_TRACKS.select)).toBeLessThan(
      share(TABLE_TRACKS.duration),
    );
    expect(tableTracks(["service"])).toEqual([
      TABLE_TRACKS.select,
      TABLE_TRACKS.service,
      TABLE_TRACKS.actions,
    ]);
  });
});
