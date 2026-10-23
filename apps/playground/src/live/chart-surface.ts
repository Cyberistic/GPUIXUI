/**
 * The fixture `chart-surface-lifecycle` drives the **shipped** `@gpuixui/data`
 * charts with.
 *
 * The package's charts are one `<svg>` per series, because `<svg source>` is
 * one tinted mask (`chart-raster`). The behaviour suite reads their markup
 * through the offscreen renderer; this probe asks the same question of a real
 * window — do two series paint two colours inside one plot? — and the answer is
 * a pixel count, so the fixture owns the numbers the probe samples:
 *
 * - the data every chart draws, so a screen change cannot leave the probe
 *   asserting yesterday's bar;
 * - the plot's sizes, which are a chart's own geometry (a chart draws at the
 *   size it is given, so the probe gives one);
 * - the sample points, in each plot's own coordinates. They are the centre of
 *   a mark the shipped geometry draws, and `chart-surface.test.ts` proves that
 *   against `groupedBarMarks`/`stackedBarMarks`/`donutSegments` rather than
 *   restating the arithmetic here.
 *
 * Kept native-free, so the fixture is testable on a host with no binding.
 */

/** A logical point inside one plot, in the plot's own coordinates. */
export interface ChartSurfacePoint {
  readonly x: number;
  readonly y: number;
}

/** The checks the live run asserts, recorded by the README section. */
export const CHART_SURFACE_CHECKS = 40;

/** The probe's root. */
export const CHART_SURFACE_PROBE = "chart-surface-probe";
/** The charts, each named by the part it paints. */
export const CHART_SURFACE_BARS = "chart-surface-bars";
export const CHART_SURFACE_LINE = "chart-surface-line";
export const CHART_SURFACE_STACKED = "chart-surface-stacked";
export const CHART_SURFACE_DONUT = "chart-surface-donut";
export const CHART_SURFACE_SPARKLINE = "chart-surface-sparkline";
/** The readouts: the resolved palette, the sparkline's colour, the surface, the frame. */
export const CHART_SURFACE_PALETTE = "chart-surface-palette";
export const CHART_SURFACE_SPARK = "chart-surface-spark";
export const CHART_SURFACE_GROUND = "chart-surface-ground";
export const CHART_SURFACE_FRAME = "chart-surface-frame";
/** The press that changes the bars' first series. */
export const CHART_SURFACE_NEXT = "chart-surface-next";

/** The categories every series chart shares. */
export const CHART_SURFACE_LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;

/** The first series, which the press widens. */
export const CHART_SURFACE_REVENUE = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
} as const;

/** The second series, so one plot holds two tints. */
export const CHART_SURFACE_COST = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
} as const;

/** The line's one series. */
export const CHART_SURFACE_CHURN = {
  key: "churn",
  label: "Churn",
  values: [4, 3, 5, 2],
} as const;

/** The ring's data: the last source is zero, so it paints no slice. */
export const CHART_SURFACE_SOURCES = [
  { key: "direct", label: "Direct", value: 48 },
  { key: "search", label: "Search", value: 32 },
  { key: "social", label: "Social", value: 20 },
  { key: "referral", label: "Referral", value: 0 },
] as const;

/** The values the press produces, so the first bar grows on screen. */
export const CHART_SURFACE_FRAME2_REVENUE = [60, 48, 41, 32] as const;

/** The plot sizes the probe mounts: a chart draws at the size it is given. */
export const CHART_SURFACE_SIZES = {
  bars: { width: 300, height: 120 },
  line: { width: 300, height: 120 },
  stacked: { width: 300, height: 120 },
  donut: { size: 140 },
  sparkline: { width: 120, height: 40 },
} as const;

/**
 * The mark centres the probe samples.
 *
 * The bars are grouped and the stack is read from the floor, so the first
 * category's two marks sit above each other in the stack and beside each other
 * in the group. `growth` is a point the first bar reaches only after the press:
 * the check that a changed value repaints reads it before and after.
 */
export const CHART_SURFACE_POINTS = {
  /** The first bar (Revenue 32) and the second series beside it (Cost 18). */
  barsFirst: { x: 22, y: 110 },
  barsSecond: { x: 52, y: 110 },
  /** Above the 32-bar, inside the 60-bar the press paints. */
  barsGrowth: { x: 22, y: 70 },
  /** The stack's floor series and the series above it, same category. */
  stackedLower: { x: 37, y: 110 },
  stackedUpper: { x: 37, y: 70 },
  /** One point inside each painted ring segment, at half the ring's width. */
  donut: [
    { key: "direct", point: { x: 123, y: 51 } },
    { key: "search", point: { x: 27, y: 106 } },
    { key: "social", point: { x: 34, y: 27 } },
  ],
} as const;

/** The tick values the bars' 0..100 axis prints. */
export const CHART_SURFACE_TICKS = ["100", "0"] as const;

/** A derived locator: a chart part's test id. */
export const chartSurfacePart = (
  chart: string,
  part: string,
  at?: string,
): string => (at === undefined ? `${chart}-${part}` : `${chart}-${part}-${at}`);
