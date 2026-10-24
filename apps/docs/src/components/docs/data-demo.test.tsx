import {
  columnBounds,
  moveColumn,
  resizeColumn,
  resizeWidthByKey,
  toggleColumn,
  visibleColumns,
} from "@gpuixui/data/columns/logic";
import { createWindowCalculator, rowIndex } from "@gpuixui/data/virtual/window";
import {
  UNREADABLE_TREE,
  describeTree,
  filterByTree,
  readFilterTree,
} from "@gpuixui/data/surfaces/logic";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdvancedFilterDemo,
  FILTER_FILES,
  appliedFilter,
  filterFiles,
  filterSentence,
  filterTree,
  filterValueOf,
} from "./advanced-filter-demo";
import {
  COLUMN_DEFS,
  COLUMN_FILES,
  ColumnConfigurationDemo,
  keyedWidth,
  movedColumn,
  openingColumns,
  resizedColumn,
  toggledColumn,
} from "./column-configuration-demo";
import {
  VIRTUAL_COUNT,
  VIRTUAL_OVERDRAW,
  VIRTUAL_ROW_HEIGHT,
  VIRTUAL_VIEWPORT,
  VirtualizationDemo,
  mountedRows,
  revealOffset,
  virtualMaxOffset,
  virtualOffset,
  virtualSpec,
  visibleRows,
  windowReadout,
} from "./virtualization-demo";

/**
 * The data lane's new previews.
 *
 * `component-preview.test.ts` holds the registry to the pages and
 * `preview-demo-render.test.tsx` mounts every demo in both palettes; what those
 * cannot see is whether a drawing still runs the package's own arithmetic. These
 * cases read each drawing against the logic the component ships: the query the
 * page evaluates, the window the package calculates and the column reducers the
 * menu, the order and the divider call.
 */

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const ids = (
  rows: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> => Arr.map(rows, (row) => row.id);

describe("the AdvancedFilter preview", () => {
  const opening = filterTree("all", "1024");

  it("keeps the files the package's own tree keeps", () => {
    const kept = filterFiles(appliedFilter(false, "all", "1024"));

    expect(ids(kept)).toEqual(
      ids(filterByTree(FILTER_FILES, opening, filterValueOf)),
    );
    // The opening pair is a conjunction: a tracked file larger than 1 kB only.
    expect(ids(kept)).toEqual(["brand"]);
  });

  it("turns the group into a disjunction without rebuilding its clauses", () => {
    const any = filterTree("any", "1024");
    const kept = filterFiles(appliedFilter(false, "any", "1024"));

    expect(ids(kept)).toEqual(
      ids(filterByTree(FILTER_FILES, any, filterValueOf)),
    );
    // Every tracked file joins the one large ignored file.
    expect(ids(kept)).toEqual(["brand", "hero", "logo", "draft"]);
    expect(kept.length).toBeGreaterThan(
      filterFiles(appliedFilter(false, "all", "1024")).length,
    );
  });

  it("prints the sentence the package describes", () => {
    expect(filterSentence(appliedFilter(false, "all", "1024"))).toBe(
      describeTree(opening),
    );
    expect(filterSentence(appliedFilter(false, "any", "1024"))).toContain(
      "any of (",
    );
  });

  it("refuses a stored query this release cannot read, and keeps no rows", () => {
    const stored = readFilterTree({
      kind: "all",
      children: [
        {
          kind: "predicate",
          field: "status",
          comparison: "matches",
          value: "tracked",
        },
      ],
    });

    expect(Option.isNone(stored)).toBe(true);
    expect(Option.isNone(appliedFilter(true, "all", "1024"))).toBe(true);
    expect(filterFiles(appliedFilter(true, "all", "1024"))).toEqual([]);
    expect(filterSentence(appliedFilter(true, "all", "1024"))).toBe(
      UNREADABLE_TREE,
    );
  });

  it("mounts the builder and the rows the opening tree keeps", () => {
    const html = markup(<AdvancedFilterDemo />);

    expect(html).toContain('data-demo="advanced-filter"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain(describeTree(opening));
    expect(html).toContain(`1 of ${FILTER_FILES.length} files`);
    expect(html.match(/data-file="/g)).toHaveLength(1);
    expect(html).toContain('data-file="brand"');
  });
});

describe("the Virtualization preview", () => {
  const calculator = createWindowCalculator(virtualSpec);

  it("windows the rows with the package's calculator and overdraw", () => {
    expect(virtualSpec).toEqual({
      count: VIRTUAL_COUNT,
      rowHeight: VIRTUAL_ROW_HEIGHT,
      viewportHeight: VIRTUAL_VIEWPORT,
      overdraw: VIRTUAL_OVERDRAW,
    });
    expect(virtualMaxOffset).toBe(
      VIRTUAL_COUNT * VIRTUAL_ROW_HEIGHT - VIRTUAL_VIEWPORT,
    );

    Arr.forEach([0, 400, 12_000, virtualMaxOffset], (offset) => {
      expect(mountedRows(offset)).toEqual(calculator.indicesAt(offset));
      expect(visibleRows(offset)).toEqual(calculator.at(offset));
    });

    // Only a window exists: the mounted set is wider than the viewport, and it
    // starts with overdraw rows above the first row in view.
    const firstVisible = Math.floor(4_000 / VIRTUAL_ROW_HEIGHT);
    const mounted = mountedRows(4_000);
    expect(Option.getOrNull(Arr.head(mounted))).toBe(
      firstVisible - VIRTUAL_OVERDRAW,
    );
    expect(mounted.length).toBeGreaterThan(
      Math.ceil(VIRTUAL_VIEWPORT / VIRTUAL_ROW_HEIGHT),
    );
    expect(visibleRows(4_000).start).toBe(firstVisible - VIRTUAL_OVERDRAW);
  });

  it("clamps an offset past the rows it holds", () => {
    expect(virtualOffset(virtualMaxOffset + 5_000)).toBe(virtualMaxOffset);
    expect(virtualOffset(-40)).toBe(0);
    expect(Option.getOrNull(Arr.last(mountedRows(virtualMaxOffset)))).toBe(
      VIRTUAL_COUNT - 1,
    );
  });

  it("reveals a row by moving the window to it", () => {
    expect(revealOffset(499)).toBe(rowIndex(499) * VIRTUAL_ROW_HEIGHT);
    const window = visibleRows(revealOffset(499));
    expect(499).toBeGreaterThanOrEqual(window.start);
    expect(499).toBeLessThan(window.end);
  });

  it("paints one row per mounted index, positioned at the estimate", () => {
    const html = markup(<VirtualizationDemo />);
    const mounted = mountedRows(0);

    expect(html).toContain('data-demo="virtualization"');
    expect(html.match(/class="gx-virt-row"/g)).toHaveLength(mounted.length);
    expect(html.match(/data-index="/g)).toHaveLength(mounted.length);
    expect(html).toContain(windowReadout(0));
    // The header is a sibling above the scroller, not a row inside it.
    expect(html.indexOf("gx-virt-head")).toBeLessThan(
      html.indexOf("gx-virt-body"),
    );
  });
});

describe("the Column configuration preview", () => {
  const opening = openingColumns();

  it("hides a column the way the package does, and names it", () => {
    expect(toggledColumn(opening, "updated")).toEqual(
      toggleColumn(opening, "updated"),
    );
    expect(ids(visibleColumns(toggledColumn(opening, "updated")))).toEqual([
      "name",
      "status",
      "size",
    ]);
  });

  it("refuses to hide the last visible column", () => {
    const oneLeft = Arr.reduce(
      ["status", "size", "updated"],
      opening,
      (state, id) => toggledColumn(state, id),
    );

    expect(ids(visibleColumns(oneLeft))).toEqual(["name"]);
    expect(toggledColumn(oneLeft, "name")).toEqual(oneLeft);
  });

  it("moves one visible place, widths travelling with their columns", () => {
    const moved = movedColumn(opening, "updated", -1);

    expect(moved).toEqual(moveColumn(opening, "updated", -1));
    expect(ids(visibleColumns(moved))).toEqual([
      "name",
      "status",
      "updated",
      "size",
    ]);
  });

  it("steps a divider by the package's key rule", () => {
    const name = Option.getOrNull(Arr.head(COLUMN_DEFS));
    expect(name).not.toBeNull();
    if (name === null) return;
    const bounds = columnBounds(name);

    expect(keyedWidth(opening, "name", "left")).toBe(
      resizeWidthByKey(name.width, "left", bounds),
    );
    expect(keyedWidth(opening, "name", "left")).toBe(name.width - 16);
    expect(keyedWidth(opening, "name", "home")).toBe(bounds.minWidth);
    expect(keyedWidth(opening, "name", "end")).toBe(bounds.maxWidth);
    expect(resizedColumn(opening, "name", "right")).toEqual(
      resizeColumn(opening, "name", name.width + 16),
    );
  });

  it("paints one header and one cell set from the same visible list", () => {
    const html = markup(<ColumnConfigurationDemo />);
    const visible = visibleColumns(opening);

    expect(html).toContain('data-demo="column-configuration"');
    expect(html.match(/data-resize="/g)).toHaveLength(visible.length);
    expect(html.match(/class="gx-table-cell"/g)).toHaveLength(
      visible.length * COLUMN_FILES.length,
    );
    for (const column of visible) {
      expect(html).toContain(`data-resize="${column.id}"`);
      expect(html).toContain(`aria-valuenow="${column.width}"`);
    }
    expect(html).toContain("no hidden columns");
  });
});

describe("the previews' sources", () => {
  it("name the package entry points each drawing runs", async () => {
    const sources = await Promise.all([
      import("./advanced-filter-demo"),
      import("./virtualization-demo"),
      import("./column-configuration-demo"),
    ]);

    expect(sources[0].advancedFilterDemoSource).toContain("AdvancedFilter");
    expect(sources[0].advancedFilterDemoSource).toContain("filterByTree");
    expect(sources[1].virtualizationDemoSource).toContain("VirtualTable");
    expect(sources[2].columnConfigurationDemoSource).toContain("ColumnMenu");
    expect(sources[2].columnConfigurationDemoSource).toContain("useColumns");
  });
});
