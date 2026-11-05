/** @jsxImportSource @gpuix/react */
/**
 * The three charts that lay **themselves** out: a treemap, a sankey and a
 * sunburst.
 *
 * Each one draws a **structure** rather than a set of categories: a hierarchy
 * as nested rectangles, a flow between nodes, and the same hierarchy read as
 * rings. The library's own geometry cannot lay them out — a treemap's cell
 * area is its value's share of the whole, and a sunburst's arc angle is its
 * value's share of its parent — so the **scene compiler** resolves the
 * layout and the chart paints the document it produced.
 *
 * The paint is the same **document route** every other chart takes: one image
 * carrying every mark's own colour, decoded by the runtime's own SVG
 * renderer.
 */

import { useMemo } from "react";
import * as Arr from "effect/Array";
import { ChartLegend } from "./legend.js";
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
import type { ChartBox } from "./logic.js";

/**
 * The colour each node paints in.
 *
 * The colours come from the theme's categorical scale, and each node takes
 * the next one — so a hierarchy's branches are told apart by their colour,
 * the same rule every other chart follows. A node's own colour is looked up
 * by the **path the caller wrote**, so a caller may name a node's colour
 * itself.
 */
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

/**
 * The colour each flow node paints in.
 *
 * The nodes take the palette in order, and a caller may name a node's own
 * colour by its id.
 */
const sankeyColours = (
  graph: { readonly nodes: ReadonlyArray<FlowNode> },
  colours: ReadonlyArray<string>,
  named?: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  Arr.forEach(
    graph.nodes,
    (node, index) => {
      map.set(
        node.id,
        named?.get(node.id) ??
          colours[index % Math.max(1, colours.length)] ??
          "#000000",
      );
    },
  );
  return map;
};

/**
 * A chart whose layout the scene compiler resolved.
 *
 * The markup is computed when the props change and the surface pushes it —
 * the same push every other chart's document takes, so the runtime's own
 * decoder reads it.
 */
const SceneChart = ({
  kind,
  rows,
  flow,
  colours,
  named,
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
  testId,
}: {
  readonly kind: SceneChartKind;
  readonly rows: ReadonlyArray<HierarchyRow>;
  readonly flow: {
    readonly nodes: ReadonlyArray<FlowNode>;
    readonly links: ReadonlyArray<FlowLink>;
  };
  readonly colours: ReadonlyArray<string>;
  /**
   * The colour each node paints in, by its own key.
   *
   * The key is the path a hierarchy node was given, and the id a flow node
   * was given — the names the **caller** wrote.
   */
  readonly named?: ReadonlyMap<string, string>;
  readonly size: number;
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
  readonly testId?: string;
}) => {
  const box: ChartBox = { width: size, height: size };
  const markup = useMemo(
    () =>
      sceneSvg({
        series: [],
        labels: [],
        box,
        range: { min: 0, max: 1 },
        colours,
        kind,
        label,
        description,
        hierarchy: rows,
        flowNodes: flow.nodes,
        flowLinks: flow.links,
        nodeColours: named ?? nodeColours(rows, colours),
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
      kind,
      label,
      description,
      rows,
      flow.nodes,
      flow.links,
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
  return (
    <ChartSurface
      document={{ box, marks: [] }}
      markup={markup}
      label={label}
      description={description}
      testId={testId === undefined ? undefined : `${testId}-document`}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    />
  );
};

/**
 * The rows a hierarchy paints: its **leaves**.
 *
 * The root is the whole, and the whole is the plot's background, so it is
 * not painted. A treemap draws its leaves, and a sunburst its rings.
 */
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

/** {@link TreemapChart} props. */
export interface TreemapChartProps {
  /**
   * The hierarchy, one row per node.
   *
   * A node's **path** is its route through the tree — `"root/engineering"`
   * is a node named `engineering` under `root` — and the caller's list may
   * name only the leaves: a root is added when the list names none.
   */
  readonly nodes: ReadonlyArray<HierarchyNode>;
  /** The plot's size, in pixels. Defaults to `200` square. */
  readonly size?: number;
  /** How the cells are squared. Defaults to `squarify`. */
  readonly method?: "squarify" | "binary" | "dice" | "slice" | "slice-dice";
  /** The target aspect ratio of a cell. Defaults to the compiler's own. */
  readonly ratio?: number;
  /** The gap between adjacent cells, in pixels. */
  readonly paddingInner?: number;
  /** The gap between a parent's edge and its children, in pixels. */
  readonly paddingOuter?: number;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** The colour a named node paints in, by its path. */
  readonly nodeColors?: ReadonlyMap<string, string>;
  /** The legend paints under the cells. Defaults to `true`. */
  readonly legend?: boolean;
  /** How a value prints in the legend. */
  readonly valueFormat?: (value: number) => string;
  /** The chart's test id. A cell is `${testId}-cell-${path}`. */
  readonly testId?: string;
  /** The chart's name, for the document's accessible label. */
  readonly label?: string;
}

/**
 * Treemap: a hierarchy as nested rectangles, each area its value's share.
 *
 * The cells are squared by the compiler, so a cell's shape reads as its
 * value's shape: a large value is a wide cell, not a tall one.
 */
export const TreemapChart = ({
  nodes,
  size = 200,
  method,
  ratio,
  paddingInner,
  paddingOuter,
  colors,
  nodeColors,
  legend = true,
  valueFormat,
  testId,
  label = "Treemap",
}: TreemapChartProps) => {
  const rows = hierarchyRows(nodes);
  const leaves = leafRows(rows);
  const palette = colors ?? [];
  const description = Arr.map(
    leaves,
    (row) => `${row.name} ${row.value}`,
  ).join(", ");
  return (
    <div
      role="group"
      testId={testId}
      style={{ position: "relative" }}
    >
      <SceneChart
        kind="treemap"
        rows={rows}
        flow={{ nodes: [], links: [] }}
        colours={palette}
        size={size}
        label={label}
        description={description}
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

/** {@link SankeyChart} props. */
export interface SankeyChartProps {
  /** The nodes the flow runs through. */
  readonly nodes: ReadonlyArray<FlowNode>;
  /** The edges the flow runs along. */
  readonly links: ReadonlyArray<FlowLink>;
  /** The plot's size, in pixels. Defaults to `200` square. */
  readonly size?: number;
  /** A node's width in pixels. Defaults to the compiler's own. */
  readonly nodeWidth?: number;
  /** The gap between same-column nodes, in pixels. */
  readonly nodePadding?: number;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** The colour a named node paints in, by its id. */
  readonly nodeColors?: ReadonlyMap<string, string>;
  /** The legend paints under the flow. Defaults to `true`. */
  readonly legend?: boolean;
  /** How a value prints in the legend. */
  readonly valueFormat?: (value: number) => string;
  /** The chart's test id. */
  readonly testId?: string;
  /** The chart's name, for the document's accessible label. */
  readonly label?: string;
}

/**
 * Sankey: a flow between nodes, each ribbon's thickness its value.
 *
 * A link naming a node the graph does not hold is **dropped**: the compiler
 * rejects such a link, and a reader who drew a flow to a node that is not
 * there would rather see the flow that is.
 */
export const SankeyChart = ({
  nodes,
  links,
  size = 200,
  nodeWidth,
  nodePadding,
  colors,
  nodeColors,
  legend = true,
  valueFormat,
  testId,
  label = "Sankey",
}: SankeyChartProps) => {
  const graph = flowGraph(nodes, links);
  const palette = colors ?? [];
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
        label={label}
        description={description}
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
            // A node's row carries the flow **through** it: what leaves it
            // and what reaches it, so a reader sees the size of the node and
            // not the size of one edge.
            value: (() => {
              const through = Arr.filter(graph.links, (link) =>
                link.source === node.id || link.target === node.id,
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

/** {@link SunburstChart} props. */
export interface SunburstChartProps {
  /**
   * The hierarchy, one row per node.
   *
   * The paths are the same the treemap's are: a node's route through the
   * tree, and the caller's list may name only the leaves.
   */
  readonly nodes: ReadonlyArray<HierarchyNode>;
  /** The plot's size, in pixels. Defaults to `200` square. */
  readonly size?: number;
  /** The hole at the centre, as a share of the outer radius. */
  readonly innerRadius?: number;
  /** The gap between the rings, in pixels. */
  readonly ringPadding?: number;
  /** How many rings of the hierarchy are drawn. */
  readonly visibleDepth?: number;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** The colour a named node paints in, by its path. */
  readonly nodeColors?: ReadonlyMap<string, string>;
  /** The legend paints under the rings. Defaults to `true`. */
  readonly legend?: boolean;
  /** How a value prints in the legend. */
  readonly valueFormat?: (value: number) => string;
  /** The chart's test id. */
  readonly testId?: string;
  /** The chart's name, for the document's accessible label. */
  readonly label?: string;
}

/**
 * Sunburst: a hierarchy as concentric rings, each arc its value's share.
 *
 * The rings are drawn from the centre out, and a hierarchy deeper than
 * `visibleDepth` is not drawn.
 */
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
  testId,
  label = "Sunburst",
}: SunburstChartProps) => {
  const rows = hierarchyRows(nodes);
  const leaves = leafRows(rows);
  const palette = colors ?? [];
  const description = Arr.map(
    leaves,
    (row) => `${row.name} ${row.value}`,
  ).join(", ");
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
