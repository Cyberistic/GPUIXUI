/**
 * Guards the fixture `chart-surface-lifecycle` samples the shipped charts with.
 *
 * The live probe's checks are pixel counts and samples, so two things must hold
 * before a green run means anything:
 *
 * 1. **A sample point is a mark the shipped geometry draws.** The points are
 *    written in each plot's own coordinates, and a window that reads a pixel
 *    there proves the paint only if the bar, the stack segment or the ring
 *    segment really covers it. The first two cases derive the marks from
 *    `@gpuixui/data/chart/logic` and hold every point to them, so a data or
 *    size change moves the check to the new mark instead of measuring the old
 *    empty box.
 * 2. **The view mounts the supplied parts with the fixture's ids.** The probe
 *    composes the shipped `BarChart`, `LineChart`, `StackedBar`, `DonutChart`
 *    and `Sparkline`; a probe that drew its own `<svg>`, or renamed an id only
 *    on one side, would pass while measuring a copy.
 *
 * The last two cases are the record: the probe is registered, its README
 * section prints the check count the fixture declares and names the two
 * captures a reader can open, and the packages that call the charts
 * window-verified cite this probe.
 *
 * `node:fs` is a check over the repository's own source, the shape
 * `data-table.test.ts` and `registry.test.ts` use.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  chartScale,
  donutSegments,
  groupedBarMarks,
  stackedBarMarks,
  stackedScale,
  type ChartMark,
} from "@gpuixui/data/chart/logic";
import {
  CHART_SURFACE_CHECKS,
  CHART_SURFACE_COST,
  CHART_SURFACE_FRAME2_REVENUE,
  CHART_SURFACE_LABELS,
  CHART_SURFACE_POINTS,
  CHART_SURFACE_REVENUE,
  CHART_SURFACE_SIZES,
  CHART_SURFACE_SOURCES,
} from "./chart-surface.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");
const repository = new URL("../../../../", import.meta.url);
const packageReadme = readFileSync(
  new URL("packages/data/README.md", repository),
  "utf8",
);
const inventory = readFileSync(new URL("COMPONENTS.md", repository), "utf8");
const chartsPage = readFileSync(
  new URL("packages/data/docs/charts.mdx", repository),
  "utf8",
);

/** The text between two markers, failing by name when a marker is gone. */
const between = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  if (start === -1 || end === -1) {
    throw new Error(`no ${from} … ${to} section in the probe`);
  }
  return text.slice(start, end);
};

const view = between(
  probe,
  "const ChartSurfaceProbe",
  "const chartSurfaceSteps",
);
const steps = between(
  probe,
  "const chartSurfaceSteps",
  "const WindowChromeProbe",
);

/** The first mark one series paints, or `None` when it paints none. */
const firstMark = (
  marks: ReadonlyArray<ReadonlyArray<ChartMark>>,
  seriesIndex: number,
): Option.Option<ChartMark> =>
  Option.flatMap(Arr.get(marks, seriesIndex), Arr.head);

/** The rectangle a mark paints, or `None` for a path (the ring has none). */
const rectOf = (
  mark: ChartMark,
): Option.Option<{ x: number; y: number; width: number; height: number }> =>
  mark.kind === "rect" ? Option.some(mark) : Option.none();

/** Whether a mark paints the point, strictly inside it so an edge cannot pass. */
const paints = (
  mark: Option.Option<ChartMark>,
  point: { readonly x: number; readonly y: number },
): boolean =>
  Option.match(Option.flatMap(mark, rectOf), {
    onNone: () => false,
    onSome: (rect) =>
      point.x > rect.x &&
      point.x < rect.x + rect.width &&
      point.y > rect.y &&
      point.y < rect.y + rect.height,
  });

/** The radii an arc path's two sweep commands name, in the path's own units. */
const arcRadii = (
  mark: ChartMark,
): Option.Option<{ readonly inner: number; readonly outer: number }> =>
  Option.flatMap(
    Option.fromNullishOr(mark.kind === "path" ? mark.d : null),
    (d) => {
      const radii = Arr.fromIterable(
        Arr.map([...d.matchAll(/A([\d.]+) ([\d.]+)/g)], (match) =>
          Number(match[1]),
        ),
      );
      return Option.map(Arr.head(radii), (outer) => ({
        outer,
        inner: Math.min(...radii),
      }));
    },
  );

/** The label a ring sample belongs to, and the sweep its datum occupies. */
const ringBounds = (): ReadonlyArray<{
  readonly key: string;
  readonly from: number;
  readonly to: number;
}> => {
  const total = Arr.reduce(
    CHART_SURFACE_SOURCES,
    0,
    (sum, source) => sum + Math.max(0, source.value),
  );
  const [, bounds] = Arr.mapAccum(
    CHART_SURFACE_SOURCES,
    0,
    (consumed, source) => {
      const share = Math.max(0, source.value) / total;
      return [
        consumed + share,
        { key: source.key, from: consumed, to: consumed + share },
      ] as const;
    },
  );
  return bounds;
};

describe("the chart-surface fixture", () => {
  it("samples the grouped bar and the stack the shipped geometry draws", () => {
    const barSeries = [CHART_SURFACE_REVENUE, CHART_SURFACE_COST];
    const bars = groupedBarMarks(
      barSeries,
      CHART_SURFACE_SIZES.bars,
      chartScale(barSeries, CHART_SURFACE_LABELS.length),
      CHART_SURFACE_LABELS.length,
    );
    expect(paints(firstMark(bars, 0), CHART_SURFACE_POINTS.barsFirst)).toBe(
      true,
    );
    expect(paints(firstMark(bars, 1), CHART_SURFACE_POINTS.barsSecond)).toBe(
      true,
    );
    // The growth point is empty before the press: no first-category mark in
    // either series reaches it, which is what makes the repaint a change.
    expect(
      Arr.every(
        Arr.flatten(bars),
        (mark) => !paints(Option.some(mark), CHART_SURFACE_POINTS.barsGrowth),
      ),
    ).toBe(true);

    const widened = [
      { ...CHART_SURFACE_REVENUE, values: CHART_SURFACE_FRAME2_REVENUE },
      CHART_SURFACE_COST,
    ];
    const grown = groupedBarMarks(
      widened,
      CHART_SURFACE_SIZES.bars,
      chartScale(widened, CHART_SURFACE_LABELS.length),
      CHART_SURFACE_LABELS.length,
    );
    expect(paints(firstMark(grown, 0), CHART_SURFACE_POINTS.barsGrowth)).toBe(
      true,
    );

    const stack = stackedBarMarks(
      barSeries,
      CHART_SURFACE_SIZES.stacked,
      stackedScale(barSeries, CHART_SURFACE_LABELS.length),
      CHART_SURFACE_LABELS.length,
    );
    expect(paints(firstMark(stack, 0), CHART_SURFACE_POINTS.stackedLower)).toBe(
      true,
    );
    expect(paints(firstMark(stack, 1), CHART_SURFACE_POINTS.stackedUpper)).toBe(
      true,
    );
    // The two samples are different paints: the floor series does not reach the
    // point the series above it covers.
    expect(paints(firstMark(stack, 0), CHART_SURFACE_POINTS.stackedUpper)).toBe(
      false,
    );
  });

  it("samples each ring segment at the radius the shipped path paints", () => {
    const box = {
      width: CHART_SURFACE_SIZES.donut.size,
      height: CHART_SURFACE_SIZES.donut.size,
    };
    const segments = donutSegments(
      Arr.map(CHART_SURFACE_SOURCES, (source) => source.value),
      box,
    );
    const bounds = ringBounds();
    const centre = { x: box.width / 2, y: box.height / 2 };
    Arr.forEach(CHART_SURFACE_POINTS.donut, (sample) => {
      const index = Arr.findFirstIndex(
        CHART_SURFACE_SOURCES,
        (source) => source.key === sample.key,
      );
      expect(Option.isSome(index)).toBe(true);
      if (Option.isNone(index)) return;
      const sweep = Arr.get(bounds, index.value);
      const mark = Option.flatMap(Arr.get(segments, index.value), Arr.head);
      const radii = Option.flatMap(mark, arcRadii);
      expect(Option.isSome(radii)).toBe(true);
      if (Option.isNone(radii) || Option.isNone(sweep)) return;
      const radius = Math.hypot(
        sample.point.x - centre.x,
        sample.point.y - centre.y,
      );
      // Twelve o'clock, clockwise, as a share of the full turn — the space the
      // segment's sweep is written in.
      const angle = Math.atan2(
        sample.point.y - centre.y,
        sample.point.x - centre.x,
      );
      const at =
        ((angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
      expect(radius).toBeGreaterThan(radii.value.inner);
      expect(radius).toBeLessThan(radii.value.outer);
      expect(at).toBeGreaterThanOrEqual(sweep.value.from);
      expect(at).toBeLessThan(sweep.value.to);
    });

    // The zero datum paints no segment at all; the probe reads that from the
    // ring's pixels, because the datum keeps its image so its value is
    // announced.
    const zero = Arr.findFirstIndex(
      CHART_SURFACE_SOURCES,
      (source) => source.value === 0,
    );
    expect(Option.isSome(zero)).toBe(true);
    if (Option.isSome(zero)) {
      expect(Option.getOrElse(Arr.get(segments, zero.value), () => [])).toEqual(
        [],
      );
    }
  });

  it("mounts the shipped parts with the fixture's ids, and draws no mask", () => {
    Arr.forEach(
      ["<BarChart", "<LineChart", "<StackedBar", "<DonutChart", "<Sparkline"],
      (part) => {
        expect(view).toContain(part);
      },
    );
    expect(view).not.toContain("<svg");
    // A part's id is the fixture's constant, so the view names it and the steps
    // read it back; a literal string on one side only would measure nothing.
    Arr.forEach(
      [
        "CHART_SURFACE_PROBE",
        "CHART_SURFACE_BARS",
        "CHART_SURFACE_LINE",
        "CHART_SURFACE_STACKED",
        "CHART_SURFACE_DONUT",
        "CHART_SURFACE_SPARKLINE",
        "CHART_SURFACE_PALETTE",
        "CHART_SURFACE_SPARK",
        "CHART_SURFACE_GROUND",
        "CHART_SURFACE_FRAME",
        "CHART_SURFACE_NEXT",
      ],
      (constant) => {
        expect(`${view}\n${steps}`).toContain(constant);
      },
    );
    // The probe composes the package's data at the fixture's sizes, so a chart
    // cannot be mounted at another size and quietly agree with the fixture.
    expect(view).toContain("CHART_SURFACE_SIZES");
    expect(view).toContain("CHART_SURFACE_SOURCES");
    expect(view).toContain("CHART_SURFACE_CHURN");
  });

  it("records the probe where a release report reads it", () => {
    expect(
      Arr.filter(
        liveRegistry,
        (entry) => entry.id === "chart-surface-lifecycle",
      ),
    ).toHaveLength(1);
    const section = between(
      readme,
      "### `chart-surface-lifecycle`",
      "### `window-chrome`",
    );
    expect(section).toContain("--only chart-surface-lifecycle");
    expect(section).toContain(`${CHART_SURFACE_CHECKS} checks`);
    expect(section).toContain(".artifacts/live/chart-surface.png");
    expect(section).toContain(".artifacts/live/chart-surface-2.png");
  });

  it("cites the probe where the shipped charts are called window-verified", () => {
    const statusRow = packageReadme
      .split("\n")
      .find((line) => line.startsWith("| Charts (`BarChart`"));
    expect(statusRow ?? "").toContain("chart-surface-lifecycle");
    const inventoryRow = inventory
      .split("\n")
      .find((line) => line.startsWith("| Charts |"));
    expect(inventoryRow ?? "").toContain("chart-surface-lifecycle");
    expect(chartsPage).toContain("chart-surface-lifecycle");
  });
});
