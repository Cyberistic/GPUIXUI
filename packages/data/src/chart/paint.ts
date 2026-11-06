import * as Arr from "effect/Array";
import type { ChartBox } from "./logic.js";
import type { ChartMark } from "./mark.js";
import type { ChartDocument, ChartGradient } from "./svg.js";
import type { PaintLayer } from "./frame.js";

export interface LayerPaint {
  readonly layer: PaintLayer;
  /** The colour the layer's marks paint in. */
  readonly colour: string;
  /** The layer's own alpha, when it has one. */
  readonly opacity?: number;
}

export const layerMarks = (paint: LayerPaint): ReadonlyArray<ChartMark> =>
  Arr.map(paint.layer.marks, (mark): ChartMark => {
    const alpha = paint.opacity;
    const clip =
      paint.layer.clip === undefined ? {} : { clip: paint.layer.clip };
    if (mark.fill === undefined && mark.stroke === undefined) {
      // the geometry placed is never colourless.
      return {
        ...mark,
        ...clip,
        fill: { color: paint.colour, opacity: alpha },
      };
    }
    return {
      ...mark,
      ...clip,
      fill:
        mark.fill === undefined
          ? undefined
          : {
              ...mark.fill,
              color:
                mark.fill.color === "#000000" ? paint.colour : mark.fill.color,
              opacity: mark.fill.opacity ?? alpha,
            },
      stroke:
        mark.stroke === undefined
          ? undefined
          : {
              ...mark.stroke,
              color:
                mark.stroke.color === "#000000"
                  ? paint.colour
                  : mark.stroke.color,
            },
    };
  });

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

export const chartDocument = (
  box: ChartBox,
  layers: ReadonlyArray<LayerPaint>,
  gradients: ReadonlyArray<ChartGradient> = [],
): ChartDocument => ({
  box,
  gradients,
  marks: Arr.flatten(Arr.map(layers, (paint) => layerMarks(paint))),
});

export const areaGradient = (
  key: string,
  colour: string,
  opacity: number,
): ChartGradient => ({
  id: `chart-area-${key}`,
  from: colour,
  to: colour,
  fromOpacity: opacity,
  toOpacity: 0.1,
});
