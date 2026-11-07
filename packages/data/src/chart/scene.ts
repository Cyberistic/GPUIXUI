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

export type SceneChartKind =
  | "bar"
  | "line"
  | "area"
  | "treemap"
  | "sankey"
  | "sunburst"
  | "radial";

export interface SceneRow {
  readonly category: string;
  readonly [series: string]: string | number;
}

export interface HierarchySceneRow extends SceneRow {
  readonly path: string;
  readonly name: string;
  readonly value: number;
}

export interface SceneChartOptions {
  readonly gapColour?: string;
  readonly series: ReadonlyArray<ChartSeries>;
  readonly labels: ReadonlyArray<string>;
  readonly box: ChartBox;
  readonly range: ChartRange;
  readonly colours: ReadonlyArray<string>;
  readonly kind: SceneChartKind;
  readonly label: string;
  readonly description: string;
  readonly axis?: boolean;
  readonly xLabels?: boolean;
  readonly hierarchy?: ReadonlyArray<HierarchyRow>;
  readonly flowNodes?: ReadonlyArray<FlowNode>;
  readonly flowLinks?: ReadonlyArray<FlowLink>;
  readonly nodeColours?: ReadonlyMap<string, string>;
  readonly method?: "squarify" | "binary" | "dice" | "slice" | "slice-dice";
  readonly ratio?: number;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
  readonly nodeWidth?: number;
  readonly nodePadding?: number;
  readonly innerRadius?: number;
  readonly ringPadding?: number;
  readonly visibleDepth?: number;
  readonly radiusRatio?: number;
  readonly bandPadding?: number;
  readonly reveal?: number;
}

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

const valueChannel =
  (key: string) =>
  (row: SceneRow): number => {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

const linearDomain = (range: ChartRange): readonly [number, number] => [
  range.min,
  range.max === range.min ? range.min + 1 : range.max,
];

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

const ownValue =
  (rows: ReadonlyArray<HierarchyRow>) =>
  (row: HierarchyRow): number =>
    Arr.some(rows, (other) =>
      other.path.startsWith(`${row.path}${HIERARCHY_SEPARATOR}`),
    )
      ? 0
      : row.value;

const treemapMark = (options: SceneChartOptions) =>
  treemap(options.hierarchy ?? [], {
    value: ownValue(options.hierarchy ?? []),
    path: (row: HierarchyRow) => row.path,
    delimiter: HIERARCHY_SEPARATOR,
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

const sunburstMark = (options: SceneChartOptions) =>
  polar({
    startAngle: Math.PI / 2,
    endAngle: Math.PI / 2 - Math.PI * 2,
    marks: [
      sunburst(options.hierarchy ?? [], {
        value: ownValue(options.hierarchy ?? []),
        path: (row: HierarchyRow) => row.path,
        delimiter: HIERARCHY_SEPARATOR,
        fill: (node) =>
          options.nodeColours?.get(node.data?.key ?? node.id) ?? "#000000",
        ...(options.gapColour === undefined
          ? {}
          : { stroke: options.gapColour, strokeWidth: 2 }),
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
        strokeWidth: (edge) => edge.width * (options.reveal ?? 1),
      }),
      ...context.nodes.map((node) =>
        rect([node], {
          x1: "x0",
          x2: "x1",
          y1: "y0",
          y2: "y1",
          key: "key",
          inset: 0,
          fill:
            options.nodeColours?.get(node.data.id) ??
            options.colours[0] ??
            "#000000",
        }),
      ),
    ],
  });

const treemapDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof treemapMark>],
    ChartSpec<readonly [ReturnType<typeof treemapMark>]>
  >({
    marks: [treemapMark(options)],
    scales: { x: null, y: null },
  });

const cartesianDefinition = (
  options: SceneChartOptions,
): StaticChartDefinition<SceneRow> => {
  const rows = sceneRows(options.series, options.labels);
  const kind = options.kind as "bar" | "line" | "area";
  const marks = Arr.map(options.series, (one, index) =>
    seriesMark(kind, rows, one, options.colours[index] ?? "#000000"),
  );
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
        // draws one bar per category, so there is one value per category.
        radius: valueChannel(options.series[0]?.key ?? "value"),
        key: "category",
        fill: (row: SceneRow) =>
          options.colours[
            options.labels.indexOf(row.category) %
              Math.max(1, options.colours.length)
          ] ?? "#000000",
        ...(options.gapColour === undefined
          ? {}
          : { stroke: options.gapColour, strokeWidth: 2 }),
      }),
    ],
  });

const sankeyDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof sankeyMark>],
    ChartSpec<readonly [ReturnType<typeof sankeyMark>]>
  >({
    marks: [sankeyMark(options)],
    scales: { x: null, y: null },
  });

const sunburstDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof sunburstMark>],
    ChartSpec<readonly [ReturnType<typeof sunburstMark>]>
  >({
    marks: [sunburstMark(options)],
    scales: { x: null, y: null },
  });

const radialDefinition = (options: SceneChartOptions) =>
  defineChart<
    readonly [ReturnType<typeof radialBarMark>],
    ChartSpec<readonly [ReturnType<typeof radialBarMark>]>
  >({
    marks: [radialBarMark(options)],
    scales: { x: null, y: null },
  });

export const sceneDefinition = (
  options: SceneChartOptions,
): StaticChartDefinition<SceneRow> => {
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

export const chartScene = (options: SceneChartOptions): ChartScene<SceneRow> =>
  createChartScene(sceneDefinition(options), {
    width: options.box.width,
    height: options.box.height,
  });

export const sceneSvg = (options: SceneChartOptions): string => {
  const markup = renderChartSvg(chartScene(options), {
    ariaLabel: options.label,
    ariaDescription: options.description,
  });
  // TODO: the link mark has no cap option. A ribbon is as thick as it is long, so
  // a round cap paints a disc past the node it meets.
  return options.kind === "sankey"
    ? markup.replaceAll('stroke-linecap="round"', 'stroke-linecap="butt"')
    : markup;
};

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
