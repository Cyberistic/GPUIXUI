/**
 * The fixture the `chart-document-lifecycle` probe drives the **shipped**
 * charts and the shipped `Diagram` with.
 *
 * The charts changed their paint route: the marks travel as **one SVG
 * document** on an `<img>`'s `src`, which the runtime decodes itself, so one
 * element carries every series' own colour. The offscreen renderer cannot
 * measure that — it reads markup, not pixels — so this probe asks a real
 * frame the question the route exists to answer: **do two series paint two
 * colours inside one plot?**
 *
 * The `Diagram` is here for the same reason: it is the other surface that
 * travels the document route, and a diagram that drew nothing would be a
 * component nobody noticed.
 *
 * Kept native-free, so the fixture is testable on a host with no binding.
 */

/** A logical point inside one plot, in the plot's own coordinates. */
export interface ChartSurfacePoint {
  readonly x: number;
  readonly y: number;
}

/** The checks the live run asserts, recorded by the README section. */
export const CHART_DOCUMENT_CHECKS = 24;

/** The probe's root. */
export const CHART_DOCUMENT_PROBE = "chart-document-probe";
/** The two-series chart: the claim the document route exists to answer. */
export const CHART_DOCUMENT_BARS = "chart-document-bars";
/** The diagram, drawn by Pele through the same document route. */
export const CHART_DOCUMENT_DIAGRAM = "chart-document-diagram";
/** The readouts: the resolved palette, the diagram's colours, the surface. */
export const CHART_DOCUMENT_PALETTE = "chart-document-palette";
export const CHART_DOCUMENT_KIND = "chart-document-kind";
/** The diagram's own colours, so the probe samples what the drawing paints. */
export const CHART_DOCUMENT_COLOURS = "chart-document-colours";
export const CHART_DOCUMENT_GROUND = "chart-document-ground";
export const CHART_DOCUMENT_FRAME = "chart-document-frame";

/** The categories the chart shares. */
export const CHART_DOCUMENT_LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;

/** The first series. */
export const CHART_DOCUMENT_REVENUE = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
} as const;

/** The second series, so one plot holds two tints. */
export const CHART_DOCUMENT_COST = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
} as const;

/** The plot sizes the probe mounts: a chart draws at the size it is given. */
export const CHART_DOCUMENT_SIZES = {
  bars: { width: 300, height: 120 },
  diagram: { width: 320, height: 120 },
} as const;

/**
 * A Mermaid source the diagram draws.
 *
 * A flow with two nodes and an edge, so the drawing has a shape to count: a
 * box and a rule.
 */
export const CHART_DOCUMENT_SOURCE = `flowchart LR
  A[Author] --> B[Reader]`;

/**
 * The marks the chart paints, and where to sample them.
 *
 * The bars are grouped and centred in their slots, so the first category's
 * two bars sit **beside** each other: the first series' bar at the slot's
 * left, the second's to its right. The two sample points are therefore the
 * two colours in one plot.
 */
export const CHART_DOCUMENT_POINTS = {
  /** The centre of the first series' first bar. */
  revenue: { x: 22.5, y: 110 },
  /** The centre of the second series' first bar, beside the first's. */
  cost: { x: 52.5, y: 110 },
} as const;

/** The plot's bounds, in the probe's own coordinates. */
export const CHART_DOCUMENT_PLOT = {
  x: 0,
  y: 0,
  width: CHART_DOCUMENT_SIZES.bars.width,
  height: CHART_DOCUMENT_SIZES.bars.height,
} as const;

/** The diagram's own box, in the probe's own coordinates. */
export const CHART_DOCUMENT_DIAGRAM_BOX = {
  x: 0,
  y: 0,
  width: CHART_DOCUMENT_SIZES.diagram.width,
  height: CHART_DOCUMENT_SIZES.diagram.height,
} as const;

/** A derived locator: a chart part's test id. */
export const chartDocumentLocator = (id: string): string => id;
