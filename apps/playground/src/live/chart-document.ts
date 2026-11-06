export interface ChartSurfacePoint {
  readonly x: number;
  readonly y: number;
}

export const CHART_DOCUMENT_CHECKS = 24;

export const CHART_DOCUMENT_PROBE = "chart-document-probe";

export const CHART_DOCUMENT_BARS = "chart-document-bars";

export const CHART_DOCUMENT_DIAGRAM = "chart-document-diagram";

export const CHART_DOCUMENT_PALETTE = "chart-document-palette";
export const CHART_DOCUMENT_KIND = "chart-document-kind";

export const CHART_DOCUMENT_COLOURS = "chart-document-colours";
export const CHART_DOCUMENT_GROUND = "chart-document-ground";
export const CHART_DOCUMENT_FRAME = "chart-document-frame";

export const CHART_DOCUMENT_LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const CHART_DOCUMENT_REVENUE = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
} as const;

export const CHART_DOCUMENT_COST = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
} as const;

export const CHART_DOCUMENT_SIZES = {
  bars: { width: 300, height: 120 },
  diagram: { width: 320, height: 120 },
} as const;

export const CHART_DOCUMENT_SOURCE = `flowchart LR
  A[Author] --> B[Reader]`;

export const CHART_DOCUMENT_POINTS = {
  revenue: { x: 22.5, y: 110 },

  cost: { x: 52.5, y: 110 },
} as const;

export const CHART_DOCUMENT_PLOT = {
  x: 0,
  y: 0,
  width: CHART_DOCUMENT_SIZES.bars.width,
  height: CHART_DOCUMENT_SIZES.bars.height,
} as const;

export const CHART_DOCUMENT_DIAGRAM_BOX = {
  x: 0,
  y: 0,
  width: CHART_DOCUMENT_SIZES.diagram.width,
  height: CHART_DOCUMENT_SIZES.diagram.height,
} as const;

export const chartDocumentLocator = (id: string): string => id;
