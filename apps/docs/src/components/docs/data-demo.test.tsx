import {
  columnBounds,
  moveColumn,
  resizeColumn,
  resizeWidthByKey,
  toggleColumn,
  visibleColumns,
} from "@gpuixui/data/columns/logic";
import {
  axisTicks,
  chartBox,
  chartScale,
  groupedBarMarks,
  linePath,
  seriesColour,
  tickLabel,
} from "@gpuixui/data/chart/logic";
import { seriesColors, themes } from "@gpuixui/tokens";
import { createWindowCalculator, rowIndex } from "@gpuixui/data/virtual/window";
import {
  UNREADABLE_TREE,
  describeTree,
  filterByTree,
  readFilterTree,
} from "@gpuixui/data/surfaces/logic";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { readFileSync } from "node:fs";
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
  canHide,
  keyedWidth,
  movedColumn,
  openingColumns,
  resizedColumn,
  toggledColumn,
} from "./column-configuration-demo";
import {
  CHART_HEIGHT,
  CHART_LABELS,
  CHART_SERIES,
  CHART_WIDTH,
  ChartDemoBody,
  chartBarGroups,
  chartCeiling,
  chartDrawing,
  chartPlot,
  chartTicks,
  seriesLine,
} from "./charts-demo";
import {
  VIRTUAL_COUNT,
  VIRTUAL_OVERDRAW,
  VIRTUAL_ROW_HEIGHT,
  VIRTUAL_VIEWPORT,
  VirtualizationDemo,
  mountedRows,
  mountedWindow,
  revealOffset,
  virtualMaxOffset,
  virtualOffset,
  virtualSpec,
  windowReadout,
} from "./virtualization-demo";
import { rowsInView } from "./window-preview";

/**
 * The data lane's new previews.
 *
 * `component-preview.test.ts` holds the registry to the pages and
 * `preview-demo-render.test.tsx` mounts every demo in both palettes; what those
 * cannot see is whether a drawing still runs the package's own arithmetic. These
 * cases read each drawing against the logic the component ships: the query the
 * page evaluates, the window the package calculates and the column reducers the
 * menu, the order and the divider call.
 *
 * Guarded bugs: the Virtualization drawing called every **mounted** row "in
 * view" (the overdraw above the top edge is clipped, so the scene claimed rows
 * nobody could see), the Charts viewBox cut the ceiling tick in half, and the
 * column menu left the last visible column's toggle enabled, so a press claimed
 * a change the reducer refuses.
 */

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

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
      expect(mountedWindow(offset)).toEqual(calculator.at(offset));
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
    expect(mountedWindow(4_000).start).toBe(firstVisible - VIRTUAL_OVERDRAW);
    // The view starts at the top edge; the mounted window reaches past it.
    expect(rowsInView(virtualSpec, 4_000)).toEqual({
      start: firstVisible,
      end: firstVisible + Math.ceil(VIRTUAL_VIEWPORT / VIRTUAL_ROW_HEIGHT),
    });
  });

  it("labels only the rows the viewport shows as in view", () => {
    // The bug guarded: the drawing called every mounted row "in view", so the
    // overdraw above the top edge — rows a reader cannot see — claimed to be on
    // screen. The scene now reads the viewport's own range.
    expect(rowsInView(virtualSpec, 0)).toEqual({
      start: 0,
      end: Math.ceil(VIRTUAL_VIEWPORT / VIRTUAL_ROW_HEIGHT),
    });
    const html = markup(<VirtualizationDemo />);
    const overdraw = mountedRows(0).length - rowsInView(virtualSpec, 0).end;
    expect(html.match(/>overdraw</g) ?? []).toHaveLength(overdraw);
    expect(html.match(/>in view</g) ?? []).toHaveLength(
      rowsInView(virtualSpec, 0).end,
    );
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
    const window = mountedWindow(revealOffset(499));
    expect(499).toBeGreaterThanOrEqual(window.start);
    expect(499).toBeLessThan(window.end);
  });

  it("paints one row per mounted index, positioned at the estimate", () => {
    const html = markup(<VirtualizationDemo />);
    const mounted = mountedRows(0);

    expect(html).toContain('data-demo="virtualization"');
    expect(html.match(/gx-virt-row/g)).toHaveLength(mounted.length);
    expect(html.match(/data-index="/g)).toHaveLength(mounted.length);
    expect(html).toContain(windowReadout(0));
    // The header is a sibling above the scroller, not a row inside it.
    expect(html.indexOf("gx-dt-head")).toBeLessThan(
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
    expect(html.match(/class="gx-dt-cell gx-dt-fixed"/g)).toHaveLength(
      visible.length * COLUMN_FILES.length,
    );
    for (const column of visible) {
      expect(html).toContain(`data-resize="${column.id}"`);
      expect(html).toContain(`aria-valuenow="${column.width}"`);
    }
    expect(html).toContain("no hidden columns");
  });

  it("disables the last column's toggle instead of refusing its press", () => {
    // Guarded bug: with one column left, the menu's toggle still claimed a
    // change (`aria-pressed` true) and the press did nothing. The package
    // disables that row (`column.visible && !canHide`), and a hidden column has
    // no move arrows at all — the menu only paints moves for visible tracks.
    const oneLeft = Arr.reduce(
      ["status", "size", "updated"],
      opening,
      (state, id) => toggledColumn(state, id),
    );
    const source = read(
      "apps/docs/src/components/docs/column-configuration-demo.tsx",
    );

    expect(canHide(opening)).toBe(true);
    expect(canHide(oneLeft)).toBe(false);
    expect(source).toContain("disabled={column.visible && !canHide(state)}");
    expect(source).toContain("{shown < 0 ? null : (");
    expect(source).toContain("disabled={shown === 0}");
    expect(source).toContain("disabled={shown === columns.length - 1}");
    // The menu the snippet passes `onReset` to offers the reset it names.
    expect(source).toContain("Reset columns");
    expect(source).toContain("setState(openingColumns())");
  });
});

describe("the Charts preview", () => {
  const drawing = chartDrawing(themes.dark, "bars");
  const bars = markup(<ChartDemoBody mode="bars" theme={themes.dark} />);
  const lines = markup(<ChartDemoBody mode="lines" theme={themes.dark} />);

  it("lays the bars out with the package's box, scale and marks", () => {
    expect(chartPlot).toEqual(
      chartBox(CHART_WIDTH, CHART_HEIGHT, { width: 320, height: 160 }),
    );
    expect(chartCeiling).toBe(chartScale(CHART_SERIES, CHART_LABELS.length));
    expect(chartTicks).toEqual(axisTicks(chartCeiling, 4));
    expect(drawing.bars).toEqual(
      groupedBarMarks(
        CHART_SERIES,
        chartPlot,
        chartCeiling,
        CHART_LABELS.length,
      ),
    );
    expect(drawing.bars).toEqual(chartBarGroups());

    const marks = Arr.filter(
      drawing.bars.flat(),
      (mark): mark is Extract<typeof mark, { kind: "rect" }> =>
        mark.kind === "rect",
    );
    expect(bars.match(/<rect /g)).toHaveLength(marks.length);
    // Every bar stands on the plot's floor, inside the package's box, and the
    // two series share each slot side by side rather than over each other.
    Arr.forEach(marks, (mark) => {
      expect(mark.x + mark.width).toBeLessThanOrEqual(chartPlot.width);
      expect(mark.y + mark.height).toBe(chartPlot.height);
    });
    const revenue = drawing.bars[0]?.[0];
    const cost = drawing.bars[1]?.[0];
    expect(revenue?.kind).toBe("rect");
    expect(cost?.kind).toBe("rect");
    if (revenue?.kind !== "rect" || cost?.kind !== "rect") return;
    expect(revenue.x + revenue.width).toBeLessThanOrEqual(cost.x);
  });

  it("paints each series in the theme's own categorical order", () => {
    const palette = seriesColors(themes.dark);
    expect(drawing.palette).toEqual(palette);

    CHART_SERIES.forEach((_series, index) => {
      expect(bars).toContain(`fill="${seriesColour(palette, index)}"`);
      expect(lines).toContain(`stroke="${seriesColour(palette, index)}"`);
    });
  });

  it("draws the line the package computes when the reader asks", () => {
    expect(drawing.lines).toEqual(
      CHART_SERIES.map((series) =>
        linePath(series.values, chartPlot, chartCeiling, CHART_LABELS.length),
      ),
    );
    expect(lines).not.toContain("<rect ");
    CHART_SERIES.forEach((series) => {
      const path = seriesLine(series);
      expect(Option.isSome(path)).toBe(true);
      if (Option.isNone(path)) return;
      expect(lines).toContain(`d="${path.value}"`);
    });
  });

  it("prints the axis, the slots and the legend the frame paints", () => {
    const step = chartCeiling / 4;
    // The plot is the package's box: the marks fill it, and nothing is clipped
    // outside it because the axis and the labels are boxes beside it.
    expect(bars).toContain(
      `viewBox="0 0 ${chartPlot.width} ${chartPlot.height}"`,
    );
    Arr.forEach(chartTicks, (tick) => {
      expect(bars).toContain(`>${tickLabel(tick, step)}</span>`);
    });
    Arr.forEach(CHART_LABELS, (label) => {
      expect(bars).toContain(`>${label}</span>`);
    });
    // One slot per category, and each slot is the plot's width divided by the
    // labels — the composition `chart.tsx` paints.
    const slot = chartPlot.width / CHART_LABELS.length;
    expect(bars.match(/class="gx-dchart-category"/g)).toHaveLength(
      CHART_LABELS.length,
    );
    expect(bars).toContain(`width:${slot}px`);
    Arr.forEach(CHART_SERIES, (series) => {
      expect(bars).toContain(series.label);
    });
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
