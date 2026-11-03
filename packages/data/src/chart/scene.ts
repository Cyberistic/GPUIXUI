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
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { createChartScene, defineChart } from "@tanstack/charts/scene";
import { tickX, tickY } from "@tanstack/charts/tick";
import { renderChartSvg } from "@tanstack/charts/svg";
import type { ChartPoint, ChartScene } from "@tanstack/charts/types/core";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ChartBox, ChartSeries } from "./logic.js";
import type { ChartRange } from "./geometry.js";

/** How a chart's marks are drawn. */
export type SceneChartKind = "bar" | "line" | "area";

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
  kind: SceneChartKind,
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
 * The definition a chart's props make.
 *
 * The marks are the chart's own series, in the order the caller gave them,
 * and the scales are the ones the frame measured.
 */
export const sceneDefinition = (options: SceneChartOptions) => {
  const rows = sceneRows(options.series, options.labels);
  const marks = Arr.map(options.series, (one, index) =>
    seriesMark(options.kind, rows, one, options.colours[index] ?? "#000000"),
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
