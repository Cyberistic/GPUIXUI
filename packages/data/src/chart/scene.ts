/**
 * The bridge to TanStack Charts: our chart's props become a TanStack
 * definition, the definition compiles to a scene, and the scene serialises to
 * the SVG document the surface pushes.
 *
 * TanStack Charts is the one chart library that fits this runtime, and the
 * reason is architectural rather than incidental: it is a **scene compiler**,
 * not a DOM renderer. `createChartScene(definition, size)` is a pure function
 * over a definition and a size, and it returns a `ChartScene` whose nodes are
 * renderer-neutral primitives — `group`, `rule`, `polyline`, `area`, `dot`,
 * `rect` and `label` — each with a `SceneStyle` carrying its own fill,
 * stroke, opacity and dash. `renderChartSvg(scene)` turns that scene into one
 * SVG document.
 *
 * **Measured, in an environment with no `document` and no `window`:** a
 * three-series chart (bars, a line and an area) compiles to a scene and
 * serialises to one document carrying both series' colours. The DOM lives in
 * TanStack's *renderers* — `canvas.ts`, `dom-types.ts`, `dom-text.ts` — and
 * not in the scene path.
 *
 * Two things this buys that the mask route cannot:
 *
 * - **one element, every colour.** A chart drawn as one image can paint two
 *   series in two colours in one element, which a tinted `<svg source>` mask
 *   cannot do;
 * - **real gradients.** A fade under an area is a `linearGradient`, not a
 *   stack of nested bands.
 *
 * And one thing it does not buy: per-mark pointer events. The scene keeps a
 * datum's identity in `ChartPoint` records beside the painted nodes, so the
 * hit test is **geometric** — the point nearest the pointer is the datum
 * under it — and the frame's hit zones ask it.
 */

import { areaY } from "@tanstack/charts/area";
import { barY } from "@tanstack/charts/bar";
import { lineY } from "@tanstack/charts/line";
import { treemap } from "@tanstack/charts/hierarchy/treemap";
import { sunburst } from "@tanstack/charts/hierarchy/sunburst";
import { sankeyDiagram } from "@tanstack/charts/network/sankey";
import { link } from "@tanstack/charts/link";
import { polar, radialBarRadius } from "@tanstack/charts/polar";
import { rect } from "@tanstack/charts/rect";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { createChartScene, defineChart } from "@tanstack/charts/scene";
import { tickX, tickY } from "@tanstack/charts/tick";
import { renderChartSvg } from "@tanstack/charts/svg";
import type {
  ChartPoint,
  ChartScene,
  ChartSpec,
  StaticChartDefinition,
} from "@tanstack/charts/types/core";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ChartBox, ChartSeries } from "./logic.js";
import type { ChartRange } from "./geometry.js";
import {
  HIERARCHY_SEPARATOR,
  type FlowLink,
  type FlowNode,
  type HierarchyRow,
} from "./hierarchy.js";

/**
 * How a chart's marks are drawn.
 *
 * The first three are **cartesian**: their marks read an x and a y channel
 * and the scene's scales place them. The last three lay themselves out —
 * a treemap's cells, a sankey's flow and a sunburst's rings — and the scene
 * holds no scale for them, so they resolve their own geometry.
 */
export type SceneChartKind =
  | "bar"
  | "line"
  | "area"
  | "treemap"
  | "sankey"
  | "sunburst"
  | "radial";

/**
 * One row of a chart's data: the category and every series' value.
 *
 * The row is **flat** — one field per series — because that is the shape the
 * scene compiler reads: a channel names a field of the row, and a field named
 * on a row of a different shape is a channel that reads nothing.
 */
export interface SceneRow {
  /** The category the row belongs to. */
  readonly category: string;
  /** Every series' value, by series key. */
  readonly [series: string]: string | number;
}

/**
 * A row of a **self-laying** chart's scene.
 *
 * A treemap, a sankey and a sunburst do not read a series: their marks are a
 * hierarchy or a graph, and their rows carry that. The row is still a
 * {@link SceneRow} — a `category` and a field per series — so one scene type
 * serves every layout and the hit test reads a point from any of them.
 */
export interface HierarchySceneRow extends SceneRow {
  /** The node's route through the tree. */
  readonly path: string;
  /** The node's name. */
  readonly name: string;
  /** The node's value. */
  readonly value: number;
}

/** The props the bridge needs to compile a chart. */
export interface SceneChartOptions {
  /** The series the chart paints. */
  readonly series: ReadonlyArray<ChartSeries>;
  /** The categories, in order. */
  readonly labels: ReadonlyArray<string>;
  /** The plot's box, in pixels. */
  readonly box: ChartBox;
  /** The signed range the marks are laid out against. */
  readonly range: ChartRange;
  /** The colour each series paints in. */
  readonly colours: ReadonlyArray<string>;
  /** How the marks are drawn. */
  readonly kind: SceneChartKind;
  /** The chart's name, for the document's accessible label. */
  readonly label: string;
  /** The chart's values, for the document's accessible description. */
  readonly description: string;
  /** The y-axis tick column paints. Defaults to `true`. */
  readonly axis?: boolean;
  /** The category labels paint under the plot. Defaults to `true`. */
  readonly xLabels?: boolean;
  /**
   * The hierarchy a treemap or a sunburst draws.
   *
   * Absent for the cartesian kinds, which read their rows from the series.
   */
  readonly hierarchy?: ReadonlyArray<HierarchyRow>;
  /** The nodes a sankey's graph holds. */
  readonly flowNodes?: ReadonlyArray<FlowNode>;
  /** The links a sankey's graph holds. */
  readonly flowLinks?: ReadonlyArray<FlowLink>;
  /** The colour each hierarchy node paints in, by its id. */
  readonly nodeColours?: ReadonlyMap<string, string>;
  /** The treemap's tiler. Defaults to `squarify`. */
  readonly method?: "squarify" | "binary" | "dice" | "slice" | "slice-dice";
  /** The treemap's target aspect ratio. */
  readonly ratio?: number;
  /** The gap between a treemap's adjacent children, in pixels. */
  readonly paddingInner?: number;
  /** The gap between a treemap's parent edges and its children, in pixels. */
  readonly paddingOuter?: number;
  /** A sankey node's width in pixels. */
  readonly nodeWidth?: number;
  /** The gap between a sankey's same-column nodes, in pixels. */
  readonly nodePadding?: number;
  /** A sunburst's inner radius, as a share of the outer one. */
  readonly innerRadius?: number;
  /** The gap between a sunburst's rings, in pixels. */
  readonly ringPadding?: number;
  /** How many rings of a sunburst's hierarchy are drawn. */
  readonly visibleDepth?: number;
  /** The share of the plot a radial bar's ring occupies. */
  readonly radiusRatio?: number;
  /** The share of each band's slot a radial bar leaves empty. */
  readonly bandPadding?: number;
}

/**
 * The rows a chart's series make: one per category, one field per series.
 *
 * A series' key is the field name, so the scene compiler reads each series by
 * the key the caller stored it under.
 */
export const sceneRows = (
  series: ReadonlyArray<ChartSeries>,
  labels: ReadonlyArray<string>,
): ReadonlyArray<SceneRow> =>
  Arr.map(labels, (category, index) => ({
    category,
    ...Object.fromEntries(
      Arr.map(series, (one) => [one.key, one.values[index] ?? 0]),
    ),
  }));

/**
 * The channel a series' values are read by.
 *
 * An **accessor**, not a field name: the row's values are a record of
 * numbers under the series' keys, and the scene compiler reads a channel
 * that names a field of the row. An accessor reads the number the key holds,
 * so the compiler does not need the row's shape to be known at compile time.
 */
const valueChannel =
  (key: string) =>
  (row: SceneRow): number => {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

/**
 * The y scale's domain: the range the marks were laid out against.
 *
 * The **caller's** range, not a re-measured one: the frame has already
 * measured the scale over the slots the chart paints, and a second measure
 * would round it differently and move every mark. A range with no span cannot
 * divide a scale, so it is widened by one.
 */
const linearDomain = (range: ChartRange): readonly [number, number] => [
  range.min,
  range.max === range.min ? range.min + 1 : range.max,
];

/**
 * The marks one series makes, in the kind the chart draws.
 *
 * A bar carries its fill, a line its stroke, an area both — the fill under
 * the line and the line itself.
 */
const seriesMark = (
  kind: "bar" | "line" | "area",
  rows: ReadonlyArray<SceneRow>,
  series: ChartSeries,
  colour: string,
) => {
  const channels = {
    x: "category" as const,
    y: valueChannel(series.key),
    key: (row: SceneRow) => `${series.key}:${String(row.category)}`,
  };
  return Match.value(kind).pipe(
    Match.when("bar", () =>
      barY(rows, { ...channels, fill: colour, radius: 3 }),
    ),
    Match.when("line", () =>
      lineY(rows, { ...channels, stroke: colour, strokeWidth: 2 }),
    ),
    Match.when("area", () =>
      areaY(rows, {
        ...channels,
        fill: colour,
        fillOpacity: 0.35,
        stroke: colour,
        strokeWidth: 2,
      }),
    ),
    Match.exhaustive,
  );
};

/**
 * The treemap's cells.
 *
 * A treemap lays a hierarchy out as nested rectangles, each area its value's
 * share of the whole. The compiler reads a **flat** hierarchy — every row
 * names its `nodeId` and its `parentId` — and builds the tree itself.
 */
const treemapMark = (options: SceneChartOptions) =>
  treemap(options.hierarchy ?? [], {
    value: (row: HierarchyRow) => row.value,
    path: (row: HierarchyRow) => row.path,
    delimiter: HIERARCHY_SEPARATOR,
    // The colour is looked up by the node's **own row**, which carries the
    // path the caller wrote: the compiler's own id is the path it built,
    // with a leading separator.
    fill: (node) =>
      options.nodeColours?.get(node.data?.key ?? node.id) ?? "#000000",
    ...(options.method === undefined ? {} : { method: options.method }),
    ...(options.ratio === undefined ? {} : { ratio: options.ratio }),
    ...(options.paddingInner === undefined
      ? {}
      : { paddingInner: options.paddingInner }),
    ...(options.paddingOuter === undefined
      ? {}
      : { paddingOuter: options.paddingOuter }),
  });

/**
 * The sunburst's rings.
 *
 * A sunburst draws the same hierarchy a treemap does, as concentric arcs
 * whose angle is the value's share of the parent. It runs **inside** a polar
 * mark, and the scene holds no scale for it: the polar layout resolves the
 * radii and the angles.
 */
const sunburstMark = (options: SceneChartOptions) =>
  polar({
    startAngle: Math.PI / 2,
    endAngle: Math.PI / 2 - Math.PI * 2,
    marks: [
      sunburst(options.hierarchy ?? [], {
        value: (row: HierarchyRow) => row.value,
        path: (row: HierarchyRow) => row.path,
        delimiter: HIERARCHY_SEPARATOR,
        fill: (node) =>
          options.nodeColours?.get(node.data?.key ?? node.id) ?? "#000000",
        ...(options.innerRadius === undefined
          ? {}
          : { innerRadius: options.innerRadius }),
        ...(options.ringPadding === undefined
          ? {}
          : { ringPadding: options.ringPadding }),
        ...(options.visibleDepth === undefined
          ? {}
          : { visibleDepth: options.visibleDepth }),
      }),
    ],
    scales: { angle: null, radius: null },
  });

/**
 * The sankey's nodes and ribbons.
 *
 * A sankey resolves a flow layout and then composes ordinary marks over it:
 * a **ribbon** between two nodes, and a **node** at each end. The compiler
 * hands the marks the layout it resolved, in final pixels.
 */
const sankeyMark = (options: SceneChartOptions) =>
  sankeyDiagram({
    nodes: options.flowNodes ?? [],
    links: options.flowLinks ?? [],
    nodeKey: (node: FlowNode) => node.id,
    source: (edge: FlowLink) => edge.source,
    target: (edge: FlowLink) => edge.target,
    value: (edge: FlowLink) => edge.value,
    ...(options.nodeWidth === undefined
      ? {}
      : { nodeWidth: options.nodeWidth }),
    ...(options.nodePadding === undefined
      ? {}
      : { nodePadding: options.nodePadding }),
    marks: (context) => [
      link(context.links, {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        key: "key",
        stroke: options.colours[0] ?? "#000000",
        strokeOpacity: 0.35,
        strokeWidth: (edge) => edge.width,
      }),
      // The `rect` mark's fill is a plain colour, not a channel, so each
      // node's own colour is resolved when the layout hands the node over.
      ...context.nodes.map((node) =>
        rect([node], {
          x1: "x0",
          x2: "x1",
          y1: "y0",
          y2: "y1",
          key: "key",
          inset: 0,
          // The node's own **id** names its colour: the compiler's key is
          // its own, prefixed with the key's type.
          fill:
            options.nodeColours?.get(node.data.id) ??
            options.colours[0] ??
            "#000000",
        }),
      ),
    ],
  });

/**
 * The treemap's definition.
 *
 * The treemap lays itself out, so it holds **no** scale: the compiler
 * resolves each cell's box from the hierarchy and the plot's size. The
 * definition is its own function because a `defineChart` call resolves its
 * overload from the marks it is given, and the treemap's marks have no
 * common type with the cartesian ones.
 */
const treemapDefinition = (options: SceneChartOptions) =>
  // The type argument is **explicit**, so the overload is chosen rather than
  // inferred: the file holds a cartesian `defineChart` too, and inference
  // across the two picks the wrong one.
  defineChart<
    readonly [ReturnType<typeof treemapMark>],
    ChartSpec<readonly [ReturnType<typeof treemapMark>]>
  >({
    marks: [treemapMark(options)],
    // The treemap's mark holds **no** scale: it lays its cells out from the
    // hierarchy and the plot's size, so the scene's scales are absent.
    scales: { x: null, y: null },
  });

/**
 * The cartesian definition: the chart's own series, and the scales the frame
 * measured.
 *
 * It is its own function because a `defineChart` call resolves its overload
 * from the marks it is given, and the treemap's marks have no common type
 * with the cartesian ones.
 */
const cartesianDefinition = (
  options: SceneChartOptions,
): StaticChartDefinition<SceneRow> => {
  const rows = sceneRows(options.series, options.labels);
  const kind = options.kind as "bar" | "line" | "area";
  const marks = Arr.map(options.series, (one, index) =>
    seriesMark(kind, rows, one, options.colours[index] ?? "#000000"),
  );
  // The ticks are read against the **first** series' values: a tick rule sits
  // at a value, and the value axis is one scale. A chart with no series has
  // no value to place a rule at, so it paints no tick.
  const measure = options.series[0];
  const ticks =
    measure === undefined
      ? []
      : [
          ...(options.axis === false
            ? []
            : [
                tickY(rows, {
                  x: "category",
                  y: valueChannel(measure.key),
                  key: "tick-y",
                }),
              ]),
          ...(options.xLabels === false
            ? []
            : [
                tickX(rows, {
                  x: "category",
                  y: valueChannel(measure.key),
                  key: "tick-x",
                }),
              ]),
        ];
  return defineChart({
    marks: [...marks, ...ticks],
    scales: {
      x: { scale: scaleBand().domain(options.labels) },
      y: { scale: scaleLinear().domain(linearDomain(options.range)) },
    },
  });
};

/**
 * The radial bar's sectors.
 *
 * A radial bar extends one bar **through the radius** for each angle band:
 * the band is the category, and the bar's length is its value. The angle
 * scale is a **band** scale, so the categories own their slots, and the
 * radius scale is linear, so a value's length is its share of the largest.
 */
const radialBarMark = (options: SceneChartOptions) =>
  polar({
    radiusRatio: options.radiusRatio ?? 0.8,
    scales: {
      angle: {
        scale: () => scaleBand<string>().padding(options.bandPadding ?? 0.12),
      },
      radius: {
        scale: scaleLinear().domain([0, options.range.max]),
        range: [({ radius }) => radius * 0.3, ({ radius }) => radius],
      },
    },
    marks: [
      radialBarRadius(sceneRows(options.series, options.labels), {
        angle: "category",
        // The bar's length is the **first** series' value: a radial bar
        // draws one bar per category, so there is one value per category.
        radius: valueChannel(options.series[0]?.key ?? "value"),
        key: "category",
        fill: options.colours[0] ?? "#000000",
      }),
    ],
  });

/**
 * The sankey's definition.
 *
 * A sankey resolves its own flow layout, so the scene holds no scale for it.
 */
const sankeyDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof sankeyMark>],
    ChartSpec<readonly [ReturnType<typeof sankeyMark>]>
  >({
    marks: [sankeyMark(options)],
    scales: { x: null, y: null },
  });

/**
 * The sunburst's definition.
 *
 * A sunburst runs inside a polar mark, which resolves the radii and the
 * angles, so the scene holds no scale for it either.
 */
const sunburstDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof sunburstMark>],
    ChartSpec<readonly [ReturnType<typeof sunburstMark>]>
  >({
    marks: [sunburstMark(options)],
    scales: { x: null, y: null },
  });

/**
 * The radial bar's definition.
 *
 * The polar mark resolves the radii and the angles, so the scene holds no
 * scale for it.
 */
const radialDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof radialBarMark>],
    ChartSpec<readonly [ReturnType<typeof radialBarMark>]>
  >({
    marks: [radialBarMark(options)],
    scales: { x: null, y: null },
  });

/**
 * The definition a chart's props make.
 *
 * The marks are the chart's own series, in the order the caller gave them,
 * and the scales are the ones the frame measured.
 */
export const sceneDefinition = (
  options: SceneChartOptions,
): StaticChartDefinition<SceneRow> => {
  // A **self-laying** kind has no series: its marks are a hierarchy or a
  // graph, and the scene holds no scale for them — the compiler resolves
  // their own geometry. Each layout gets its own definition, because a
  // cartesian mark and a polar one have no common type.
  if (options.kind === "treemap") {
    return treemapDefinition(options) as StaticChartDefinition<SceneRow>;
  }
  if (options.kind === "sankey") {
    return sankeyDefinition(options) as StaticChartDefinition<SceneRow>;
  }
  if (options.kind === "sunburst") {
    return sunburstDefinition(options) as StaticChartDefinition<SceneRow>;
  }
  if (options.kind === "radial") {
    return radialDefinition(options) as StaticChartDefinition<SceneRow>;
  }
  return cartesianDefinition(options);
};

/**
 * The scene a chart's props compile to.
 *
 * The scene is a **value**: the same props always compile to the same scene,
 * so a caller can read the geometry out of it without a renderer.
 */
export const chartScene = (options: SceneChartOptions): ChartScene<SceneRow> =>
  createChartScene(sceneDefinition(options), {
    width: options.box.width,
    height: options.box.height,
  });

/**
 * The SVG document a chart's scene serialises to.
 *
 * This is the string the surface pushes onto an `<img>`: one element, every
 * series in its own colour, real gradients where a fade is asked for.
 */
export const sceneSvg = (options: SceneChartOptions): string =>
  renderChartSvg(chartScene(options), {
    ariaLabel: options.label,
    ariaDescription: options.description,
  });

/**
 * The datum under a pointer, by the scene's own geometry.
 *
 * The scene keeps a `ChartPoint` for every datum beside the painted nodes, so
 * the hit test is a **distance calculation over the scene** and not a DOM
 * event on a mark. The frame's hit zones ask it.
 *
 * A point further than `maxDistance` from the pointer is not under it, so a
 * pointer in the plot's margin names nothing — the same rule every hit zone
 * follows.
 */
export const scenePointAt = (
  scene: ChartScene<SceneRow>,
  x: number,
  y: number,
  maxDistance = 24,
): Option.Option<ChartPoint<SceneRow>> => {
  const points = scene.points;
  if (points.length === 0) return Option.none();
  return Option.fromNullishOr(
    Arr.reduce(
      points,
      undefined as ChartPoint<SceneRow> | undefined,
      (best, point) => {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance > maxDistance) return best;
        if (best === undefined) return point;
        const bestDistance = Math.hypot(best.x - x, best.y - y);
        return distance < bestDistance ? point : best;
      },
    ),
  );
};
