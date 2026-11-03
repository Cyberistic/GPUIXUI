/** @jsxImportSource @gpuix/react */
/**
 * The plot's marks: the grid, the series' layers, and the route they take.
 *
 * The route is the decision this component makes. A chart that paints one
 * **document** carries every series' colour in one element, so a fill can be
 * a real gradient and a mark can be translucent over a mark beneath it. A
 * chart that paints one **mask** per series is the route a host that cannot
 * decode an image needs: each element is a single tint, and the geometry is
 * the same.
 *
 * The grid is a layer like any other, so it paints in the same document and
 * the same mask — there is one grid, not two.
 */

import * as Arr from "effect/Array";
import { chartDocument, type LayerPaint } from "./paint.js";
import { ChartMask } from "./frame.js";
import { ChartSurface, type ChartRender } from "./surface.js";
import type { ChartGradient } from "./svg.js";
import type { ChartBox, ChartMark } from "./logic.js";
import type { PaintLayer } from "./frame.js";

/** {@link ChartPlot} props. */
export interface ChartPlotProps {
  /** The plot's box, in pixels. */
  readonly box: ChartBox;
  /** The layers the chart paints, in paint order. */
  readonly layers: ReadonlyArray<PaintLayer>;
  /** The colour each layer paints in. */
  readonly colours: ReadonlyArray<string>;
  /** The grid's layer, when the chart draws one. */
  readonly grid?: PaintLayer;
  /** The gradients the document's fills use. */
  readonly gradients?: ReadonlyArray<ChartGradient>;
  /** The route the marks take. Defaults to `document`. */
  readonly render?: ChartRender;
  /** The chart's test id. */
  readonly testId?: string;
  /** The name each layer's image carries. */
  readonly labels?: ReadonlyArray<string>;
  /** The values each layer's image describes. */
  readonly descriptions?: ReadonlyArray<string>;
}

/**
 * The plot's marks.
 *
 * The document route paints **one** element for the whole plot; the mask
 * route paints one element per layer, each tinted through its own `color`.
 */
export const ChartPlot = ({
  box,
  layers,
  colours,
  grid,
  gradients = [],
  render = "document",
  testId,
  labels = [],
  descriptions = [],
}: ChartPlotProps) => {
  const paints: ReadonlyArray<LayerPaint> = [
    ...(grid === undefined
      ? []
      : [
          {
            layer: grid,
            colour: colours[0] ?? "#000000",
            opacity: grid.opacity,
          },
        ]),
    ...Arr.map(layers, (layer, index) => ({
      layer,
      colour: colours[index + (grid === undefined ? 0 : 1)] ?? "#000000",
      opacity: layer.opacity,
    })),
  ];
  if (render === "mask") {
    return (
      <>
        {Arr.map(paints, (paint, index) => (
          <ChartMask
            key={`${paint.layer.key}-${index}`}
            chartTestId={testId}
            layer={paint.layer}
            label={labels[index] ?? ""}
            description={descriptions[index] ?? ""}
            colour={paint.colour}
            box={box}
          />
        ))}
      </>
    );
  }
  const document = chartDocument(box, paints, gradients);
  return (
    <ChartSurface
      document={document}
      testId={testId === undefined ? undefined : `${testId}-document`}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
      }}
    />
  );
};

/** The marks a layer paints, for a caller that reads them directly. */
export const layerMarkList = (
  layers: ReadonlyArray<PaintLayer>,
): ReadonlyArray<ChartMark> =>
  Arr.flatten(Arr.map(layers, (layer) => layer.marks));
