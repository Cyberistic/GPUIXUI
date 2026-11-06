export interface ChartSurfacePoint {
  readonly x: number;
  readonly y: number;
}

export const CHART_SURFACE_CHECKS = 41;

export const CHART_SURFACE_PROBE = "chart-surface-probe";

export const CHART_SURFACE_BARS = "chart-surface-bars";
export const CHART_SURFACE_LINE = "chart-surface-line";
export const CHART_SURFACE_STACKED = "chart-surface-stacked";
export const CHART_SURFACE_DONUT = "chart-surface-donut";
export const CHART_SURFACE_SPARKLINE = "chart-surface-sparkline";

export const CHART_SURFACE_PALETTE = "chart-surface-palette";
export const CHART_SURFACE_SPARK = "chart-surface-spark";
export const CHART_SURFACE_GROUND = "chart-surface-ground";
export const CHART_SURFACE_FRAME = "chart-surface-frame";

export const CHART_SURFACE_NEXT = "chart-surface-next";

export const CHART_SURFACE_LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const CHART_SURFACE_REVENUE = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
} as const;

export const CHART_SURFACE_COST = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
} as const;

export const CHART_SURFACE_CHURN = {
  key: "churn",
  label: "Churn",
  values: [4, 3, 5, 2],
} as const;

export const CHART_SURFACE_SOURCES = [
  { key: "direct", label: "Direct", value: 48 },
  { key: "search", label: "Search", value: 32 },
  { key: "social", label: "Social", value: 20 },
  { key: "referral", label: "Referral", value: 0 },
] as const;

export const CHART_SURFACE_FRAME2_REVENUE = [60, 48, 41, 32] as const;

export const CHART_SURFACE_SIZES = {
  bars: { width: 300, height: 120 },
  line: { width: 300, height: 120 },
  stacked: { width: 300, height: 120 },
  donut: { size: 140 },
  sparkline: { width: 120, height: 40 },
} as const;

export const CHART_SURFACE_POINTS = {
  barsFirst: { x: 22, y: 110 },
  barsSecond: { x: 52, y: 110 },

  barsGrowth: { x: 22, y: 70 },

  stackedLower: { x: 37, y: 110 },
  stackedUpper: { x: 37, y: 70 },

  donut: [
    { key: "direct", point: { x: 123, y: 51 } },
    { key: "search", point: { x: 27, y: 106 } },
    { key: "social", point: { x: 34, y: 27 } },
  ],
} as const;

export const CHART_SURFACE_TICKS = ["100", "0"] as const;

export const chartSurfacePart = (
  chart: string,
  part: string,
  at?: string,
): string => (at === undefined ? `${chart}-${part}` : `${chart}-${part}-${at}`);
