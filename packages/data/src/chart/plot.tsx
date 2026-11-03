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
 * **The document route keeps a named element per series.** The document is
 * one image, so a reader would otherwise meet a chart with no named series
 * in it — and the accessibility tree is where a chart's numbers are
 * announced. So each series also gets a **transparent image element** that
 * carries its name, its values and its colour and paints nothing: the
 * document paints the picture, and these elements name the parts of it.
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
  /** The colour the grid paints in. */
  readonly gridColour?: string;
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
 * The document route paints **one** element for the whole plot and a named
 * element per series; the mask route paints one element per layer, each
 * tinted through its own `color`.
 */
export const ChartPlot = ({
  box,
  layers,
  colours,
  grid,
  gridColour = "#000000",
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
            colour: gridColour,
            opacity: grid.opacity,
          },
        ]),
    ...Arr.map(layers, (layer, index) => ({
      layer,
      colour: colours[index] ?? "#000000",
      opacity: layer.opacity,
    })),
  ];
  if (render === "mask") {
    return (
      <>
        {Arr.map(paints, (paint, index) => {
          // The grid is a layer like any other here, so it takes a name slot
          // of its own — the grid names nothing, so its slot is empty.
          const named = grid === undefined || index > 0;
          return (
            <ChartMask
              key={`${paint.layer.key}-${index}`}
              chartTestId={testId}
              layer={paint.layer}
              label={named ? (labels[index - 1] ?? "") : ""}
              description={named ? (descriptions[index - 1] ?? "") : ""}
              colour={paint.colour}
              box={box}
            />
          );
        })}
      </>
    );
  }
  const document = chartDocument(box, paints, gradients);
  return (
    <>
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
      {Arr.map(layers, (layer, index) => (
        <ChartSeriesName
          key={`${layer.key}-name`}
          chartTestId={testId}
          layer={layer}
          label={labels[index] ?? ""}
          description={descriptions[index] ?? ""}
          colour={colours[index] ?? "#000000"}
          box={box}
        />
      ))}
    </>
  );
};

/**
 * A series' **named element**: an image that paints nothing and names the
 * series.
 *
 * The document is one image, so this is where a series' name, its values and
 * its colour live — the three things the accessibility tree reads. It paints
 * nothing, so it is an empty image over the plot: the document below it is
 * the picture, and this is the caption.
 *
 * The test id carries the series' key, so a test can find the series by the
 * key it is stored under.
 */
export const ChartSeriesName = ({
  chartTestId,
  layer,
  label,
  description,
  colour,
  box,
}: {
  readonly chartTestId: string | undefined;
  readonly layer: PaintLayer;
  readonly label: string;
  readonly description: string;
  readonly colour: string;
  readonly box: ChartBox;
}) => {
  const decorative = layer.decorative === true;
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-description={decorative ? undefined : description}
      testId={
        chartTestId === undefined
          ? undefined
          : layer.kind === undefined
            ? `${chartTestId}-layer-${layer.key}`
            : `${chartTestId}-layer-${layer.key}-${layer.kind}`
      }
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: box.width,
        height: box.height,
        color: colour,
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
