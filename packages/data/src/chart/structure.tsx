/** @jsxImportSource @gpuix/react */

import { useMemo } from "react";
import * as Arr from "effect/Array";
import { ChartLegend } from "./legend.js";
import { paletteOf } from "./frame.js";
import { useTheme } from "../theme.js";
import { ChartSurface } from "./surface.js";
import {
  flowGraph,
  hierarchyRows,
  type FlowLink,
  type FlowNode,
  type HierarchyNode,
  type HierarchyRow,
} from "./hierarchy.js";
import { sceneSvg, type SceneChartKind } from "./scene.js";
import type { ChartBox, ChartSeries } from "./logic.js";
import type { ChartRange } from "./geometry.js";
import {
  DEFAULT_ANIMATION_DURATION,
  scaleValue,
  useAnimatedValues,
  useMountReveal,
} from "./animation.js";

export const nodeColours = (
  rows: ReadonlyArray<HierarchyRow>,
  colours: ReadonlyArray<string>,
  named?: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  let index = 0;
  for (const row of rows) {
    if (map.has(row.key)) continue;
    map.set(
      row.key,
      named?.get(row.key) ??
        colours[index % Math.max(1, colours.length)] ??
        "#000000",
    );
    index += 1;
  }
  return map;
};

const sankeyColours = (
  graph: { readonly nodes: ReadonlyArray<FlowNode> },
  colours: ReadonlyArray<string>,
  named?: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  Arr.forEach(graph.nodes, (node, index) => {
    map.set(
      node.id,
      named?.get(node.id) ??
        colours[index % Math.max(1, colours.length)] ??
        "#000000",
    );
  });
  return map;
};

const SceneChart = ({
  height,
  kind,
  rows,
  flow,
  colours,
  named,
  range,
  series,
  labels,
  size,
  label,
  description,
  method,
  ratio,
  paddingInner,
  paddingOuter,
  nodeWidth,
  nodePadding,
  innerRadius,
  ringPadding,
  visibleDepth,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  testId,
}: {
  readonly kind: SceneChartKind;
  readonly rows: ReadonlyArray<HierarchyRow>;
  readonly flow: {
    readonly nodes: ReadonlyArray<FlowNode>;
    readonly links: ReadonlyArray<FlowLink>;
  };
  readonly colours: ReadonlyArray<string>;
  readonly named?: ReadonlyMap<string, string>;
  readonly range?: ChartRange;
  readonly series?: ReadonlyArray<ChartSeries>;
  readonly labels?: ReadonlyArray<string>;
  readonly size: number;
  /** The box's height when it is not square; `size` is then its width. */
  readonly height?: number;
  readonly label: string;
  readonly description: string;
  readonly method?: "squarify" | "binary" | "dice" | "slice" | "slice-dice";
  readonly ratio?: number;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
  readonly nodeWidth?: number;
  readonly nodePadding?: number;
  readonly innerRadius?: number;
  readonly ringPadding?: number;
  readonly visibleDepth?: number;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly testId?: string;
}) => {
  const box: ChartBox = { width: size, height: height ?? size };
  const reveal = useMountReveal(animate, animationDuration);
  const hierarchyTween =
    useAnimatedValues(
      [Arr.map(rows, (row) => row.value)],
      animate,
      animationDuration,
    )[0] ?? [];
  const linkTween =
    useAnimatedValues(
      [Arr.map(flow.links, (link) => link.value)],
      animate,
      animationDuration,
    )[0] ?? [];
  const seriesTween = useAnimatedValues(
    Arr.map(series ?? [], (one) => one.values),
    animate,
    animationDuration,
  );
  const shownRows = Arr.map(rows, (row, index) => ({
    ...row,
    value: scaleValue(hierarchyTween[index] ?? row.value, reveal),
  }));
  const tweenedLinks = Arr.map(flow.links, (link, index) => ({
    ...link,
    value: linkTween[index] ?? link.value,
  }));
  // A sankey cannot use zero link values: its compiler rejects them and
  // normalises ribbons to the layout, so `reveal` scales ribbon width instead.
  const shownSeries = Arr.map(series ?? [], (one, index) => ({
    ...one,
    values: Arr.map(one.values, (value, at) =>
      scaleValue(seriesTween[index]?.[at] ?? value, reveal),
    ),
  }));
  const markup = useMemo(
    () =>
      sceneSvg({
        series: shownSeries,
        labels: labels ?? [],
        box,
        range: range ?? { min: 0, max: 1 },
        colours,
        kind,
        label,
        description,
        hierarchy: shownRows,
        flowNodes: flow.nodes,
        flowLinks: tweenedLinks,
        nodeColours: named ?? nodeColours(rows, colours),
        reveal,
        ...(method === undefined ? {} : { method }),
        ...(ratio === undefined ? {} : { ratio }),
        ...(paddingInner === undefined ? {} : { paddingInner }),
        ...(paddingOuter === undefined ? {} : { paddingOuter }),
        ...(nodeWidth === undefined ? {} : { nodeWidth }),
        ...(nodePadding === undefined ? {} : { nodePadding }),
        ...(innerRadius === undefined ? {} : { innerRadius }),
        ...(ringPadding === undefined ? {} : { ringPadding }),
        ...(visibleDepth === undefined ? {} : { visibleDepth }),
      }),
    [
      box.width,
      box.height,
      colours,
      range?.min,
      range?.max,
      shownSeries,
      labels,
      kind,
      label,
      description,
      shownRows,
      flow.nodes,
      tweenedLinks,
      reveal,
      method,
      ratio,
      paddingInner,
      paddingOuter,
      nodeWidth,
      nodePadding,
      innerRadius,
      ringPadding,
      visibleDepth,
    ],
  );
  // The image is absolute over its box; the box is what holds its place in the
  // layout, or a centred parent would start the image at its own midpoint.
  return (
    <div style={{ position: "relative", width: box.width, height: box.height }}>
      <ChartSurface
        document={{ box, marks: [] }}
        markup={markup}
        label={label}
        description={description}
        testId={testId === undefined ? undefined : `${testId}-document`}
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
      />
    </div>
  );
};

export const leafRows = (
  rows: ReadonlyArray<HierarchyRow>,
): ReadonlyArray<HierarchyRow> =>
  rows.filter(
    (row) =>
      !Arr.some(
        rows,
        (other) => other.key !== row.key && other.key.startsWith(`${row.key}/`),
      ),
  );

export interface TreemapChartProps {
  readonly nodes: ReadonlyArray<HierarchyNode>;
  readonly size?: number;
  /** The chart's height when it is not square; `size` is then its width. */
  readonly height?: number;
  readonly method?: "squarify" | "binary" | "dice" | "slice" | "slice-dice";
  readonly ratio?: number;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly nodeColors?: ReadonlyMap<string, string>;
  readonly legend?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly testId?: string;
  readonly label?: string;
}

export const TreemapChart = ({
  nodes,
  size = 200,
  height,
  method,
  ratio,
  paddingInner,
  paddingOuter,
  colors,
  nodeColors,
  legend = true,
  valueFormat,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  testId,
  label = "Treemap",
}: TreemapChartProps) => {
  const rows = hierarchyRows(nodes);
  const leaves = leafRows(rows);
  const palette = paletteOf(useTheme(), colors);
  const description = Arr.map(leaves, (row) => `${row.name} ${row.value}`).join(
    ", ",
  );
  return (
    <div role="group" testId={testId} style={{ position: "relative" }}>
      <SceneChart
        kind="treemap"
        rows={rows}
        flow={{ nodes: [], links: [] }}
        colours={palette}
        size={size}
        {...(height === undefined ? {} : { height })}
        label={label}
        description={description}
        animate={animate}
        animationDuration={animationDuration}
        {...(method === undefined ? {} : { method })}
        {...(ratio === undefined ? {} : { ratio })}
        {...(paddingInner === undefined ? {} : { paddingInner })}
        {...(paddingOuter === undefined ? {} : { paddingOuter })}
        testId={testId}
      />
      {legend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(leaves, (row, index) => ({
            key: row.key,
            label:
              valueFormat === undefined
                ? row.name
                : `${row.name} · ${valueFormat(row.value)}`,
            color:
              nodeColors?.get(row.key) ??
              palette[index % Math.max(1, palette.length)] ??
              "#000000",
          }))}
        />
      ) : undefined}
    </div>
  );
};

export interface RadialBarChartProps {
  readonly data: ReadonlyArray<{
    readonly key: string;
    readonly label?: string;
    readonly value: number;
  }>;
  readonly size?: number;
  readonly radiusRatio?: number;
  readonly bandPadding?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly legend?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly testId?: string;
  readonly label?: string;
}

export const RadialBarChart = ({
  data,
  size = 200,
  radiusRatio,
  bandPadding,
  colors,
  legend = true,
  valueFormat,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  testId,
  label = "Radial bar",
}: RadialBarChartProps) => {
  const palette = paletteOf(useTheme(), colors);
  const rows = Arr.map(data, (row) => ({
    category: row.label ?? row.key,
    value: row.value,
  }));
  const description = Arr.map(
    rows,
    (row) => `${row.category} ${row.value}`,
  ).join(", ");
  const largest = Arr.reduce(rows, 0, (max, row) => Math.max(max, row.value));
  return (
    <div role="group" testId={testId} style={{ position: "relative" }}>
      <SceneChart
        kind="radial"
        rows={[]}
        flow={{ nodes: [], links: [] }}
        colours={palette}
        size={size}
        label={label}
        description={description}
        animate={animate}
        animationDuration={animationDuration}
        range={{ min: 0, max: largest }}
        series={[
          {
            key: "value",
            label: "Value",
            values: Arr.map(rows, (row) => row.value),
          },
        ]}
        labels={Arr.map(rows, (row) => row.category)}
        {...(radiusRatio === undefined ? {} : { radiusRatio })}
        {...(bandPadding === undefined ? {} : { bandPadding })}
        testId={testId}
      />
      {legend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(rows, (row, index) => ({
            key: row.category,
            label:
              valueFormat === undefined
                ? row.category
                : `${row.category} · ${valueFormat(row.value)}`,
            color: palette[index % Math.max(1, palette.length)] ?? "#000000",
          }))}
        />
      ) : undefined}
    </div>
  );
};

export interface SankeyChartProps {
  readonly nodes: ReadonlyArray<FlowNode>;
  readonly links: ReadonlyArray<FlowLink>;
  readonly size?: number;
  /** The chart's height when it is not square; `size` is then its width. */
  readonly height?: number;
  readonly nodeWidth?: number;
  readonly nodePadding?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly nodeColors?: ReadonlyMap<string, string>;
  readonly legend?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly testId?: string;
  readonly label?: string;
}

export const SankeyChart = ({
  nodes,
  links,
  size = 200,
  height,
  nodeWidth,
  nodePadding,
  colors,
  nodeColors,
  legend = true,
  valueFormat,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  testId,
  label = "Sankey",
}: SankeyChartProps) => {
  const graph = flowGraph(nodes, links);
  const palette = paletteOf(useTheme(), colors);
  const description = Arr.map(
    graph.links,
    (link) => `${link.source} to ${link.target} ${link.value}`,
  ).join(", ");
  return (
    <div role="group" testId={testId} style={{ position: "relative" }}>
      <SceneChart
        kind="sankey"
        rows={[]}
        flow={graph}
        colours={palette}
        named={sankeyColours(graph, palette, nodeColors)}
        size={size}
        {...(height === undefined ? {} : { height })}
        label={label}
        description={description}
        animate={animate}
        animationDuration={animationDuration}
        {...(nodeWidth === undefined ? {} : { nodeWidth })}
        {...(nodePadding === undefined ? {} : { nodePadding })}
        testId={testId}
      />
      {legend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(graph.nodes, (node, index) => ({
            key: node.id,
            label: node.name ?? node.id,
            value: (() => {
              const through = Arr.filter(
                graph.links,
                (link) => link.source === node.id || link.target === node.id,
              );
              const total = Arr.reduce(
                through,
                0,
                (sum, link) => sum + link.value,
              );
              return valueFormat === undefined
                ? String(total)
                : valueFormat(total);
            })(),
            color:
              nodeColors?.get(node.id) ??
              palette[index % Math.max(1, palette.length)] ??
              "#000000",
          }))}
        />
      ) : undefined}
    </div>
  );
};

export interface SunburstChartProps {
  readonly nodes: ReadonlyArray<HierarchyNode>;
  readonly size?: number;
  readonly innerRadius?: number;
  readonly ringPadding?: number;
  readonly visibleDepth?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly nodeColors?: ReadonlyMap<string, string>;
  readonly legend?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly testId?: string;
  readonly label?: string;
}

export const SunburstChart = ({
  nodes,
  size = 200,
  innerRadius,
  ringPadding,
  visibleDepth,
  colors,
  nodeColors,
  legend = true,
  valueFormat,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  testId,
  label = "Sunburst",
}: SunburstChartProps) => {
  const rows = hierarchyRows(nodes);
  const leaves = leafRows(rows);
  const palette = paletteOf(useTheme(), colors);
  const description = Arr.map(leaves, (row) => `${row.name} ${row.value}`).join(
    ", ",
  );
  return (
    <div role="group" testId={testId} style={{ position: "relative" }}>
      <SceneChart
        kind="sunburst"
        rows={rows}
        flow={{ nodes: [], links: [] }}
        colours={palette}
        size={size}
        label={label}
        description={description}
        animate={animate}
        animationDuration={animationDuration}
        {...(innerRadius === undefined ? {} : { innerRadius })}
        {...(ringPadding === undefined ? {} : { ringPadding })}
        {...(visibleDepth === undefined ? {} : { visibleDepth })}
        testId={testId}
      />
      {legend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(leaves, (row, index) => ({
            key: row.key,
            label:
              valueFormat === undefined
                ? row.name
                : `${row.name} · ${valueFormat(row.value)}`,
            color:
              nodeColors?.get(row.key) ??
              palette[index % Math.max(1, palette.length)] ??
              "#000000",
          }))}
        />
      ) : undefined}
    </div>
  );
};
