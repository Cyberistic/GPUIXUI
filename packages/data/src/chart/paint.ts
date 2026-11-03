/**
 * The whole chart as one document: the grid, every series' marks, and the
 * colours they paint in.
 *
 * The frame owns the plot — its box, its range, its palette and the layers a
 * type supplies. This is where those become **one** SVG document: the grid's
 * rules first, then each layer's marks in the layer's own colour.
 *
 * The colour is resolved **here**, not in the geometry. The geometry knows a
 * line's weight and a shape's place; the colour belongs to the series, and
 * the series' colour is the frame's palette. That split is what lets the
 * same marks feed two painters — this document and the one-tint mask — with
 * neither of them knowing about the other.
 */

import * as Arr from "effect/Array";
import type { ChartBox } from "./logic.js";
import type { ChartMark } from "./mark.js";
import type { ChartDocument, ChartGradient } from "./svg.js";
import type { PaintLayer } from "./frame.js";

/** One layer's marks, in the colour the layer paints. */
export interface LayerPaint {
  readonly layer: PaintLayer;
  /** The colour the layer's marks paint in. */
  readonly colour: string;
  /** The layer's own alpha, when it has one. */
  readonly opacity?: number;
}

/**
 * The marks one layer paints, in its own colour.
 *
 * A mark that names a fill keeps it — a gradient is the layer's own — and a
 * mark that names only a stroke has the stroke coloured here, because a
 * stroke's colour is the series' colour just as a fill's is.
 */
export const layerMarks = (paint: LayerPaint): ReadonlyArray<ChartMark> =>
  Arr.map(paint.layer.marks, (mark): ChartMark => {
    const alpha = paint.opacity;
    if (mark.fill === undefined && mark.stroke === undefined) {
      // A mark with no paint of its own takes the layer's colour, so a shape
      // the geometry placed is never colourless.
      return { ...mark, fill: { color: paint.colour, opacity: alpha } };
    }
    return {
      ...mark,
      fill:
        mark.fill === undefined
          ? undefined
          : {
              ...mark.fill,
              color: mark.fill.color === "#000000" ? paint.colour : mark.fill.color,
              opacity: mark.fill.opacity ?? alpha,
            },
      stroke:
        mark.stroke === undefined
          ? undefined
          : {
              ...mark.stroke,
              color:
                mark.stroke.color === "#000000" ? paint.colour : mark.stroke.color,
            },
    };
  });

/**
 * The grid's rules, in the border role.
 *
 * The grid is one layer like any other: the horizontal rules at the tick
 * heights, and the vertical rules when the chart asks for them. A grid the
 * chart does not draw is no layer at all.
 */
export const gridLayer = (
  box: ChartBox,
  tickValues: ReadonlyArray<number>,
  range: { readonly min: number; readonly max: number },
  vertical: ReadonlyArray<{ readonly x: number; readonly width: number }>,
): PaintLayer => ({
  key: "grid",
  kind: "grid",
  series: { key: "grid", label: "grid", values: [] },
  seriesIndex: 0,
  decorative: true,
  opacity: 0.55,
  marks: [
    ...Arr.map(tickValues, (value) => ({
      kind: "rect" as const,
      x: 0,
      y:
        box.height -
        ((value - range.min) / Math.max(1e-9, range.max - range.min)) *
          box.height,
      width: box.width,
      height: 1,
    })),
    ...Arr.map(vertical, (rule) => ({
      kind: "rect" as const,
      x: rule.x,
      y: 0,
      width: rule.width,
      height: box.height,
    })),
  ],
});

/**
 * The document a chart's layers make.
 *
 * The layers paint in the order they are given — the grid first, so a series
 * paints over it — and each layer's marks carry that layer's colour.
 */
export const chartDocument = (
  box: ChartBox,
  layers: ReadonlyArray<LayerPaint>,
  gradients: ReadonlyArray<ChartGradient> = [],
): ChartDocument => ({
  box,
  gradients,
  marks: Arr.flatten(
    Arr.map(layers, (paint) => layerMarks(paint)),
  ),
});

/**
 * A gradient for a series' area fill: its own colour, fading to nothing.
 *
 * The fade is a **real gradient** now, not a stack of nested bands — the
 * document route carries `linearGradient`, and the mask route cannot. The
 * gradient's id is the series' key, so a document names each gradient once.
 */
export const areaGradient = (
  key: string,
  colour: string,
  opacity: number,
): ChartGradient => ({
  id: `chart-area-${key}`,
  from: colour,
  to: colour,
  fromOpacity: opacity,
  toOpacity: 0,
});
