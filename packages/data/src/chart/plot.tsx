/** @jsxImportSource @gpuix/react */

import * as Arr from "effect/Array";
import { chartDocument, type LayerPaint } from "./paint.js";
import { ChartMask } from "./frame.js";
import { ChartSurface, type ChartRender } from "./surface.js";
import type { ChartGradient } from "./svg.js";
import type { ChartBox, ChartMark } from "./logic.js";
import type { PaintLayer } from "./frame.js";

export interface ChartPlotProps {
  readonly box: ChartBox;
  readonly layers: ReadonlyArray<PaintLayer>;
  readonly colours: ReadonlyArray<string>;
  readonly grid?: PaintLayer;
  readonly gridColour?: string;
  readonly gradients?: ReadonlyArray<ChartGradient>;
  readonly render?: ChartRender;
  readonly testId?: string;
  readonly labels?: ReadonlyArray<string>;
  /** The values each layer's image describes. */
  readonly descriptions?: ReadonlyArray<string>;
}

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
          key={`${layer.key}-${layer.kind ?? "main"}-name`}
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
