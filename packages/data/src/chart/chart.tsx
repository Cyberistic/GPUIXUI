/** @jsxImportSource @gpuix/react */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon, isIconName, type IconName } from "@gpuixui/icons";
import { spokenText } from "@gpuixui/primitives/core";
import { themeModeOf } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { listOf, recordsOf, textsOf } from "../internal/list.js";
import type { ChartBox, ChartMark, ChartSeries } from "./logic.js";
import {
  categoriesFromData,
  configSeriesColour,
  seriesFromConfig,
  type ChartConfig,
  type ChartRow,
} from "./config.js";
import { lineStroke } from "./mark.js";
import {
  chartBox,
  chartScale,
  seriesDescription,
  seriesName,
} from "./logic.js";
import {
  areaBands,
  areaPath,
  barMarksInRange,
  candleAtMarks,
  candleUp,
  chartRange,
  curvePath,
  emphasisedPointMarks,
  funnelMarks,
  horizontalBarMarks,
  pointMarks,
  polygonPath,
  radarCircleGrid,
  radarGrid,
  radarPoints,
  radarSpokes,
  radialArcs,
  fullRing,
  scatterMarks,
  chartView,
  chartWindow,
  radarCircleGridAt,
  radarGridAt,
  ringBands,
  ringLabelPoints,
  ringOutsideLabels,
  ringSegments,
  scaleY,
  seriesPoints,
  valueLabel,
  type Candle,
  type ChartView,
  type Curve,
} from "./geometry.js";
import {
  DEFAULT_ANIMATION_DURATION,
  scaleSeries,
  scaleValue,
  useAnimatedValues,
  useMountReveal,
} from "./animation.js";
import type { MarkClip } from "./mark.js";
import {
  ChartFrame,
  ChartMask,
  PointTooltip,
  paletteOf,
  seriesColourOf,
  type LegendShape,
  type LegendSide,
  type TooltipIndicator,
  type PaintContext,
  type PaintLayer,
  type ValueLabel,
} from "./frame.js";
import { recipeStyle } from "../recipe.js";
import { ChartLegend } from "./legend.js";
import { textStyle, themeColors, useTheme } from "../theme.js";
import { CHART_PLOT, CHART_ROOT } from "./recipe.js";

export {
  CHART_AXIS_WIDTH,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_WIDTH,
} from "./frame.js";
export {
  ChartLegend,
  type ChartLegendItem,
  type ChartLegendProps,
} from "./legend.js";
export type { LegendShape, TooltipIndicator } from "./frame.js";

const DEFAULT_RING_SIZE = 160;

const DEFAULT_SPARKLINE_WIDTH = 120;

const DEFAULT_SPARKLINE_HEIGHT = 32;

export const DEFAULT_SPARKLINE_LABEL = "Trend";

const chosenColour = (colour: string | undefined, fallback: string): string =>
  Option.match(Option.fromNullishOr(colour), {
    onNone: () => fallback,
    onSome: (value) => (Str.isNonEmpty(Str.trim(value)) ? value : fallback),
  });

const revealOf = (reveal: number | undefined): number => reveal ?? 1;

const revealClip = (
  reveal: number | undefined,
  box: ChartBox,
): MarkClip | undefined =>
  revealOf(reveal) >= 1
    ? undefined
    : { x: 0, y: 0, width: box.width * revealOf(reveal), height: box.height };

const scaleCandles = (
  candles: ReadonlyArray<Candle>,
  progress: number,
): ReadonlyArray<Candle> =>
  Arr.map(candles, (candle) => ({
    open: scaleValue(candle.open, progress),
    high: scaleValue(candle.high, progress),
    low: scaleValue(candle.low, progress),
    close: scaleValue(candle.close, progress),
  }));

export interface ChartProps extends Omit<Props, "children"> {
  readonly series?: ReadonlyArray<ChartSeries>;
  readonly labels?: ReadonlyArray<string>;
  readonly config?: ChartConfig;
  readonly data?: ReadonlyArray<ChartRow>;
  readonly width?: number;
  readonly height?: number;
  readonly legend?: boolean | LegendSide;
  readonly legendShape?: LegendShape;
  readonly axis?: boolean;
  readonly grid?: boolean;
  readonly xLabels?: boolean;
  readonly ticks?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly tooltip?: boolean;
  readonly tooltipIndicator?: TooltipIndicator;
  readonly tooltipIcons?: ReadonlyArray<IconName>;
  readonly labelFormat?: (label: string) => string;
  readonly activeBand?: boolean;
  readonly crosshair?: boolean;
  readonly domain?: readonly [number, number];
  readonly view?: readonly [number, number];
  readonly zoom?: boolean;
  readonly onViewChange?: (view: readonly [number, number]) => void;
  readonly brush?: boolean;
  readonly onDomainChange?: (domain: readonly [number, number]) => void;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly valueFormat?: (value: number) => string;
  readonly className?: string;
  readonly testId?: string;
}

const seriesOf = (
  series: ReadonlyArray<ChartSeries> | undefined,
): ReadonlyArray<ChartSeries> =>
  Arr.map(recordsOf(series), (one) => ({
    ...one,
    values: listOf(one.values),
  }));

const seriesFor = (
  series: ReadonlyArray<ChartSeries> | undefined,
  config: ChartConfig | undefined,
  data: ReadonlyArray<ChartRow> | undefined,
): ReadonlyArray<ChartSeries> =>
  config === undefined || data === undefined
    ? seriesOf(series)
    : seriesFromConfig(config, data);

const labelsFor = (
  labels: ReadonlyArray<string> | undefined,
  data: ReadonlyArray<ChartRow> | undefined,
): ReadonlyArray<string> => {
  const own = labelsOf(labels);
  if (data === undefined || data.length === 0) return own;
  const fromData = categoriesFromData(data);
  return fromData.length === 0 ? own : fromData;
};

const labelsOf = (
  labels: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> => textsOf(labels);

const viewOf = (
  labels: ReadonlyArray<string>,
  view: readonly [number, number] | undefined,
): ChartView | undefined =>
  Option.getOrUndefined(chartView(labels.length, view));

const windowOf = (
  rows: ReadonlyArray<ChartSeries>,
  labels: ReadonlyArray<string>,
  domain: readonly [number, number] | undefined,
): {
  readonly rows: ReadonlyArray<ChartSeries>;
  readonly labels: ReadonlyArray<string>;
} =>
  Option.match(chartWindow(labels.length, domain), {
    onNone: () => ({ rows, labels }),
    onSome: (window) => {
      const width = window.end - window.start;
      return {
        rows: Arr.map(rows, (one) => ({
          ...one,
          values: Arr.take(Arr.drop(one.values, window.start), width),
        })),
        labels: Arr.take(Arr.drop(labels, window.start), width),
      };
    },
  });

const dataOf = (
  data: ReadonlyArray<ChartDatum> | undefined,
): ReadonlyArray<ChartDatum> =>
  Arr.map(recordsOf(data), (one) => ({
    ...one,
    value: one.value,
  }));

const layersFor = (
  series: ReadonlyArray<ChartSeries>,
  layers: ReadonlyArray<ReadonlyArray<ChartMark>>,
): ReadonlyArray<PaintLayer> =>
  Arr.flatMap(series, (one, seriesIndex) => [
    {
      key: one.key,
      series: one,
      seriesIndex,
      marks: layers[seriesIndex] ?? [],
    },
  ]);

const barValueLabels =
  (
    format: (value: number, one: ChartSeries, category: string) => string,
    horizontal: boolean,
    view: ChartView | undefined,
  ) =>
  ({
    series,
    box,
    range,
    labels,
    reveal,
  }: PaintContext): ReadonlyArray<ValueLabel> => {
    if (revealOf(reveal) < 1) return [];
    if (series.length !== 1) return [];
    const [layer] = horizontal
      ? horizontalBarMarks(series, box, range, labels.length)
      : barMarksInRange(series, box, range, labels.length, 0, view);
    const one = series[0];
    if (one === undefined) return [];
    return Arr.flatMap(layer ?? [], (mark, index) => {
      if (mark.kind !== "rect") return [];
      return [
        {
          key: one.key,
          x: horizontal ? mark.x + mark.width + 4 : mark.x,
          y: horizontal
            ? mark.y + mark.height / 2 - 8
            : Math.max(0, mark.y - 16),
          width: horizontal ? 40 : mark.width,
          text: format(one.values[index] ?? 0, one, labels[index] ?? one.key),
        },
      ];
    });
  };

const pointValueLabels =
  (format: (value: number) => string) =>
  ({
    series,
    box,
    range,
    labels,
    reveal,
  }: PaintContext): ReadonlyArray<ValueLabel> => {
    if (revealOf(reveal) < 1) return [];
    if (series.length !== 1) return [];
    const [one] = series;
    if (one === undefined) return [];
    const points = seriesPoints(one.values, box, range, labels.length);
    return Arr.map(points, (point, index) => ({
      key: one.key,
      x: point.x - 24,
      y: Math.max(0, point.y - 16),
      width: 48,
      text: format(one.values[index] ?? 0),
    }));
  };

export interface BarChartProps extends ChartProps {
  readonly orientation?: "vertical" | "horizontal";
  readonly radius?: number;
  readonly valueLabels?: boolean;
  readonly valueLabelFormat?: (
    value: number,
    series: ChartSeries,
    category: string,
  ) => string;
}

export const BarChart = ({
  orientation = "vertical",
  radius = 3,
  valueLabels = false,
  valueLabelFormat,
  valueFormat,
  ...props
}: BarChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = windowed.labels;
  const range = chartRange(rows, labels.length);
  const view = viewOf(labels, props.view);
  const horizontal = orientation === "horizontal";
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      grid={props.grid ?? !horizontal}
      paint={({ series, labels, box, reveal }) => {
        const shown = scaleSeries(series, revealOf(reveal));
        return layersFor(
          shown,
          horizontal
            ? horizontalBarMarks(shown, box, range, labels.length, radius)
            : barMarksInRange(shown, box, range, labels.length, radius, view),
        );
      }}
      valueLabels={
        valueLabels
          ? barValueLabels(
              (value, one, category) =>
                valueLabelFormat === undefined
                  ? (valueFormat ?? valueLabel)(value)
                  : valueLabelFormat(value, one, category),
              horizontal,
              view,
            )
          : undefined
      }
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface StackedBarProps extends ChartProps {
  readonly radius?: number;
  readonly percent?: boolean;
}

const percentOf = (
  series: ReadonlyArray<ChartSeries>,
  categories: number,
): ReadonlyArray<ChartSeries> =>
  Arr.map(series, (one) => ({
    ...one,
    values: Arr.map(Arr.take(one.values, categories), (value, index) => {
      const total = Arr.reduce(
        series,
        0,
        (sum, entry) => sum + Math.max(0, entry.values[index] ?? 0),
      );
      return total <= 0 ? 0 : (Math.max(0, value) / total) * 100;
    }),
  }));

export const StackedBar = ({
  radius = 3,
  percent = false,
  ...props
}: StackedBarProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const labels = windowed.labels;
  const source = windowed.rows;
  const rows = percent ? percentOf(source, labels.length) : source;
  const range = percent
    ? { min: 0, max: 100 }
    : chartRange(rows, labels.length, true);
  const view = viewOf(labels, props.view);
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ series, labels: slots, box, reveal }) => {
        const shown = scaleSeries(series, revealOf(reveal));
        return layersFor(
          shown,
          stackedLayers(shown, box, range, slots.length, radius, view),
        );
      }}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

const stackedLayers = (
  series: ReadonlyArray<ChartSeries>,
  box: ChartBox,
  range: { readonly min: number; readonly max: number },
  categories: number,
  radius: number,
  view?: ChartView,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const span = view === undefined ? categories : view.end - view.start;
  const offset = view === undefined ? 0 : view.start;
  const slot = box.width / Math.max(1, span);
  const width = series.length === 0 ? 0 : Math.max(1, (slot * 0.8) / 1);
  const [, levels] = Arr.mapAccum(series, [] as Array<number>, (stack, one) => {
    const next = Arr.makeBy(Math.max(0, categories), (index) => {
      const sum = (stack[index] ?? 0) + Math.max(0, one.values[index] ?? 0);
      return Number.isFinite(sum) ? sum : (stack[index] ?? 0);
    });
    return [next, next];
  });
  return Arr.map(series, (_, seriesIndex) => {
    const upper = levels[seriesIndex] ?? [];
    const lower = seriesIndex === 0 ? [] : (levels[seriesIndex - 1] ?? []);
    return Arr.flatMap(upper, (value, index) => {
      const top = scaleY(value, box, range);
      const bottom = scaleY(lower[index] ?? 0, box, range);
      const height = Math.abs(bottom - top);
      if (height < 0.5) return [];
      return [
        {
          kind: "rect" as const,
          x: (index - offset) * slot + (slot - width) / 2,
          y: Math.min(top, bottom),
          width,
          height,
          rx: Math.min(radius, width / 2, height / 2),
        },
      ];
    });
  });
};

export interface ComposedChartProps extends ChartProps {
  readonly lineKeys?: ReadonlyArray<string>;
  readonly radius?: number;
}

export const ComposedChart = ({
  lineKeys = [],
  radius = 3,
  ...props
}: ComposedChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = windowed.labels;
  const range = chartRange(rows, labels.length);
  const view = viewOf(labels, props.view);
  const isLine = (key: string): boolean =>
    Arr.some(lineKeys, (candidate) => candidate === key);
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      view={props.view}
      range={range}
      paint={({ series, labels: slots, box, reveal }) => {
        const shown = scaleSeries(series, revealOf(reveal));
        const clip = revealClip(reveal, box);
        const bars = Arr.filter(shown, (one) => !isLine(one.key));
        const barMarks = barMarksInRange(
          bars,
          box,
          range,
          slots.length,
          radius,
          view,
        );
        return Arr.flatten([
          Arr.map(bars, (one, barIndex) => ({
            key: one.key,
            series: one,
            seriesIndex: Arr.findFirstIndex(
              series,
              (entry) => entry.key === one.key,
            ).pipe(Option.getOrElse(() => barIndex)),
            marks: barMarks[barIndex] ?? [],
          })),
          Arr.flatMap(shown, (one, seriesIndex) => {
            if (!isLine(one.key)) return [];
            const points = seriesPoints(one.values, box, range, slots.length);
            return [
              {
                key: one.key,
                series: one,
                seriesIndex,
                ...(clip === undefined ? {} : { clip }),
                marks: Option.match(curvePath(points, "linear"), {
                  onNone: () => [],
                  onSome: (d): ReadonlyArray<ChartMark> => [
                    { kind: "path" as const, d, stroke: lineStroke(2) },
                  ],
                }),
              } satisfies PaintLayer,
            ];
          }),
        ]);
      }}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface LineChartProps extends ChartProps {
  readonly curve?: Curve;
  readonly dots?: boolean;
  readonly dashed?: boolean;
  readonly lineWidth?: number;
  readonly showLabels?: boolean;
  readonly dotIcons?: ReadonlyArray<IconName>;
  readonly pointTooltip?: boolean;
}

export interface ScatterChartProps extends ChartProps {
  readonly radius?: number;
}

export const ScatterChart = ({ radius = 3, ...props }: ScatterChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = windowed.labels;
  const range = chartRange(rows, labels.length);
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ series, labels: slots, box, reveal }) => {
        const progress = revealOf(reveal);
        return progress <= 0
          ? layersFor(
              series,
              Arr.map(series, () => []),
            )
          : layersFor(
              series,
              Arr.map(series, (one) =>
                scatterMarks(
                  one.values,
                  box,
                  range,
                  slots.length,
                  radius * progress,
                ),
              ),
            );
      }}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface CandleChartProps extends ChartProps {
  readonly candles: ReadonlyArray<Candle>;
  readonly width?: number;
  readonly upColor?: string;
  readonly downColor?: string;
}

export const CandleChart = ({
  candles,
  width = 6,
  upColor,
  downColor,
  ...props
}: CandleChartProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = windowed.labels;
  const range = chartRange(
    [
      {
        key: "close",
        label: "Close",
        values: Arr.map(candles, (one) => one.close),
      },
    ],
    labels.length,
  );
  const up = upColor ?? colors.success ?? "#22c55e";
  const down = downColor ?? colors.destructive ?? "#ef4444";
  const tweened = useAnimatedValues(
    [
      Arr.map(candles, (one) => one.open),
      Arr.map(candles, (one) => one.high),
      Arr.map(candles, (one) => one.low),
      Arr.map(candles, (one) => one.close),
    ],
    props.animate ?? true,
    props.animationDuration ?? DEFAULT_ANIMATION_DURATION,
  );
  const shownCandles = Arr.map(candles, (candle, index) => ({
    open: tweened[0]?.[index] ?? candle.open,
    high: tweened[1]?.[index] ?? candle.high,
    low: tweened[2]?.[index] ?? candle.low,
    close: tweened[3]?.[index] ?? candle.close,
  }));
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ box, reveal }) => [
        {
          key: "candles",
          series: { key: "candles", label: "Candles", values: [] },
          seriesIndex: 0,
          marks:
            revealOf(reveal) <= 0
              ? []
              : Arr.flatMap(
                  scaleCandles(shownCandles, revealOf(reveal)),
                  (candle, index) =>
                    Arr.map(
                      candleAtMarks(
                        candle,
                        index,
                        labels.length,
                        box,
                        range,
                        width,
                      ),
                      (mark) => ({
                        ...mark,
                        fill: { color: candleUp(candle) ? up : down },
                      }),
                    ),
                ),
        },
      ]}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface FunnelChartProps extends ChartProps {
  readonly stages: ReadonlyArray<number>;
  readonly stageLabels?: ReadonlyArray<string>;
}

export const FunnelChart = ({
  stages,
  stageLabels,
  ...props
}: FunnelChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = stageLabels ?? labelsFor(props.labels, props.data);
  const range = chartRange(
    [{ key: "stage", label: "Stage", values: stages }],
    labels.length,
  );
  const tweened =
    useAnimatedValues(
      [stages],
      props.animate ?? true,
      props.animationDuration ?? DEFAULT_ANIMATION_DURATION,
    )[0] ?? stages;
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ box, reveal }) => {
        const shown = Arr.map(tweened, (value) =>
          scaleValue(value, revealOf(reveal)),
        );
        return [
          {
            key: "funnel",
            series: { key: "funnel", label: "Funnel", values: shown },
            seriesIndex: 0,
            marks: funnelMarks(shown, box),
          },
        ];
      }}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export const LineChart = ({
  curve = "linear",
  dots = false,
  dashed = false,
  lineWidth = 2,
  showLabels = false,
  dotIcons,
  pointTooltip = false,
  ...props
}: LineChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const rows = windowed.rows;
  const labels = windowed.labels;
  const range = chartRange(rows, labels.length);
  const view = viewOf(labels, props.view);
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      view={props.view}
      range={range}
      paint={({ series, labels, box, hovered, reveal }) => {
        const clip = revealClip(reveal, box);
        return Arr.flatMap(series, (one, seriesIndex) => {
          const points = seriesPoints(
            one.values,
            box,
            range,
            labels.length,
            view,
          );
          const path = curvePath(points, curve);
          const line: PaintLayer = {
            key: one.key,
            series: one,
            seriesIndex,
            ...(clip === undefined ? {} : { clip }),
            marks: Option.match(path, {
              onNone: () => [],
              onSome: (d): ReadonlyArray<ChartMark> => [
                { kind: "path", d, stroke: lineStroke(lineWidth, dashed) },
              ],
            }),
          };
          return dots
            ? [
                {
                  ...line,
                  kind: "dots",
                  decorative: true,
                  marks: emphasisedPointMarks(
                    points,
                    lineWidth + 1.5,
                    Option.getOrUndefined(hovered ?? Option.none()),
                  ),
                },
                line,
              ]
            : [line];
        });
      }}
      valueLabels={
        showLabels
          ? pointValueLabels(props.valueFormat ?? valueLabel)
          : undefined
      }
      overlay={
        dotIcons === undefined && !pointTooltip
          ? undefined
          : ({ series, labels, box, range, palette, origin, reveal }) => {
              const zones = pointTooltip
                ? Arr.flatMap(series, (one, seriesIndex) =>
                    Arr.map(
                      seriesPoints(one.values, box, range, labels.length, view),
                      (point, index) => ({
                        key: one.key,
                        x: point.x,
                        y: point.y,
                        category: labels[index] ?? "",
                        label: seriesName(one.label, one.key),
                        value: (props.valueFormat ?? valueLabel)(
                          one.values[index] ?? 0,
                        ),
                        colour: seriesColourOf(palette, one, seriesIndex),
                      }),
                    ),
                  )
                : [];
              return (
                <>
                  {pointTooltip ? (
                    <PointTooltip
                      zones={zones}
                      box={box}
                      origin={origin}
                      testId={props.testId}
                    />
                  ) : null}
                  {dotIcons === undefined || revealOf(reveal) < 1
                    ? null
                    : Arr.flatMap(series, (one, seriesIndex) =>
                        Arr.map(
                          seriesPoints(one.values, box, range, labels.length),
                          (point, index) => {
                            const name = dotIcons[index];
                            return name === undefined ||
                              !isIconName(name) ? null : (
                              <div
                                key={`${one.key}-icon-${index}`}
                                style={{
                                  position: "absolute",
                                  left: point.x - 7,
                                  top: point.y - 7,
                                }}
                              >
                                <Icon
                                  color={seriesColourOf(
                                    palette,
                                    one,
                                    seriesIndex,
                                  )}
                                  name={name}
                                  size={14}
                                  testId={
                                    props.testId === undefined
                                      ? undefined
                                      : `${props.testId}-dot-${one.key}-${index}`
                                  }
                                />
                              </div>
                            );
                          },
                        ),
                      )}
                </>
              );
            }
      }
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface AreaChartProps extends ChartProps {
  readonly curve?: Curve;
  readonly stacked?: boolean;
  readonly gradient?: boolean;
  readonly fillOpacity?: number;
  readonly dots?: boolean;
  readonly lineWidth?: number;
  readonly showLabels?: boolean;
  readonly pointTooltip?: boolean;
  readonly dotIcons?: ReadonlyArray<IconName>;
}

export const AreaChart = ({
  curve = "smooth",
  stacked = false,
  gradient = true,
  fillOpacity = 0.35,
  dots = false,
  lineWidth = 2,
  showLabels = false,
  pointTooltip = false,
  dotIcons,
  ...props
}: AreaChartProps) => {
  const windowed = windowOf(
    seriesFor(props.series, props.config, props.data),
    labelsFor(props.labels, props.data),
    props.domain,
  );
  const labels = windowed.labels;
  const source = windowed.rows;
  const rows = stacked ? cumulativeSeries(source) : source;
  const range = chartRange(source, labels.length, stacked);
  const view = viewOf(labels, props.view);
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      view={props.view}
      range={range}
      paint={({ series, labels, box, hovered, reveal }) => {
        const clip = revealClip(reveal, box);
        return Arr.flatMap(series, (one, seriesIndex) => {
          const points = seriesPoints(
            one.values,
            box,
            range,
            labels.length,
            view,
          );
          const fill = areaPath(points, box, range, curve);
          const bands = gradient ? areaBands(points, box, range, 3) : [];
          const line = curvePath(points, curve);
          return Arr.flatten([
            [
              {
                key: one.key,
                series: one,
                seriesIndex,
                opacity: fillOpacity,
                ...(clip === undefined ? {} : { clip }),
                marks: Option.match(fill, {
                  onNone: () => [],
                  onSome: (d): ReadonlyArray<ChartMark> => [
                    { kind: "path", d },
                  ],
                }),
              } satisfies PaintLayer,
            ],
            Arr.map(bands, (d, bandIndex) => ({
              key: one.key,
              series: one,
              seriesIndex,
              kind: `fade-${bandIndex}`,
              decorative: true,
              opacity: gradient ? fillOpacity / 3 : 0,
              ...(clip === undefined ? {} : { clip }),
              marks: [{ kind: "path" as const, d }],
            })),
            gradient
              ? []
              : [
                  {
                    key: one.key,
                    series: one,
                    seriesIndex,
                    kind: "fade",
                    decorative: true,
                    ...(clip === undefined ? {} : { clip }),
                    marks: [],
                  } satisfies PaintLayer,
                ],
            [
              {
                key: one.key,
                series: one,
                seriesIndex,
                kind: "line",
                decorative: true,
                ...(clip === undefined ? {} : { clip }),
                marks: Option.match(line, {
                  onNone: () => [],
                  onSome: (d): ReadonlyArray<ChartMark> => [
                    { kind: "path", d, stroke: lineStroke(lineWidth) },
                  ],
                }),
              } satisfies PaintLayer,
            ],
            dots
              ? [
                  {
                    key: one.key,
                    series: one,
                    seriesIndex,
                    kind: "dots",
                    decorative: true,
                    ...(clip === undefined ? {} : { clip }),
                    marks: emphasisedPointMarks(
                      points,
                      lineWidth + 1.5,
                      Option.getOrUndefined(hovered ?? Option.none()),
                    ),
                  } satisfies PaintLayer,
                ]
              : [],
          ]);
        });
      }}
      valueLabels={
        showLabels
          ? pointValueLabels(props.valueFormat ?? valueLabel)
          : undefined
      }
      overlay={
        pointTooltip || dotIcons !== undefined
          ? ({
              series,
              labels: slots,
              box,
              range: window,
              palette,
              origin,
              reveal,
            }) => (
              <>
                {pointTooltip ? (
                  <PointTooltip
                    zones={Arr.flatMap(series, (one, seriesIndex) =>
                      Arr.map(
                        seriesPoints(
                          one.values,
                          box,
                          window,
                          slots.length,
                          view,
                        ),
                        (point, index) => ({
                          key: one.key,
                          x: point.x,
                          y: point.y,
                          category: slots[index] ?? "",
                          label: seriesName(one.label, one.key),
                          value: (props.valueFormat ?? valueLabel)(
                            one.values[index] ?? 0,
                          ),
                          colour: seriesColourOf(palette, one, seriesIndex),
                        }),
                      ),
                    )}
                    box={box}
                    origin={origin}
                    testId={props.testId}
                  />
                ) : null}
                {dotIcons === undefined || revealOf(reveal) < 1
                  ? null
                  : Arr.flatMap(series, (one, seriesIndex) =>
                      Arr.map(
                        seriesPoints(
                          one.values,
                          box,
                          window,
                          slots.length,
                          view,
                        ),
                        (point, index) => {
                          const name = dotIcons[index];
                          return name === undefined ||
                            !isIconName(name) ? null : (
                            <div
                              key={`${one.key}-icon-${index}`}
                              style={{
                                position: "absolute",
                                left: point.x - 7,
                                top: point.y - 7,
                              }}
                            >
                              <Icon
                                color={seriesColourOf(
                                  palette,
                                  one,
                                  seriesIndex,
                                )}
                                name={name}
                                size={14}
                                testId={
                                  props.testId === undefined
                                    ? undefined
                                    : `${props.testId}-dot-${one.key}-${index}`
                                }
                              />
                            </div>
                          );
                        },
                      ),
                    )}
              </>
            )
          : undefined
      }
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

const cumulativeSeries = (
  series: ReadonlyArray<ChartSeries>,
): ReadonlyArray<ChartSeries> => {
  const [, running] = Arr.mapAccum(
    series,
    [] as ReadonlyArray<number>,
    (stack, one) => {
      const next = Arr.map(
        one.values,
        (value, index) => (stack[index] ?? 0) + Math.max(0, value),
      );
      return [next, next] as const;
    },
  );
  return Arr.map(series, (one, index) => ({
    ...one,
    values: running[index] ?? [],
  }));
};

const LegendFor = ({
  series,
  colors,
  config,
  shape,
  testId,
}: {
  readonly series: ReadonlyArray<ChartSeries>;
  readonly colors: ReadonlyArray<string> | undefined;
  readonly config?: ChartConfig;
  readonly shape?: LegendShape;
  readonly testId?: string;
}) => {
  const theme = useTheme();
  const palette = paletteOf(theme, colors);
  const mode = themeModeOf(theme);
  return (
    <ChartLegend
      shape={shape}
      testId={testId}
      items={Arr.map(series, (one, index) => ({
        key: one.key,
        label: one.label,
        color: Option.getOrElse(configSeriesColour(config, one.key, mode), () =>
          seriesColourOf(palette, one, index),
        ),
      }))}
    />
  );
};

export interface ChartDatum {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

export interface PieChartProps extends Omit<Props, "children"> {
  readonly data: ReadonlyArray<ChartDatum>;
  readonly size?: number;
  readonly innerRadius?: number;
  readonly padAngle?: number;
  readonly legend?: boolean;
  readonly legendValues?: boolean;
  readonly colors?: ReadonlyArray<string>;
  readonly valueFormat?: (value: number) => string;
  readonly centerLabel?: string;
  readonly showLabels?: boolean;
  readonly labelPosition?: "inside" | "outside";
  readonly labelFormat?: (datum: ChartDatum, share: number) => string;
  readonly activeIndex?: number;
  readonly stacked?: boolean;
  readonly onSliceActivate?: (datum: ChartDatum, index: number) => void;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly className?: string;
  readonly testId?: string;
}

const Ring = ({
  data,
  size,
  innerRadius,
  padAngle,
  colors,
  centerLabel,
  showLabels = false,
  labelPosition = "inside",
  labelFormat,
  activeIndex,
  stacked = false,
  onSliceActivate,
  testId,
}: {
  readonly data: ReadonlyArray<ChartDatum>;
  readonly size: number;
  readonly innerRadius: number;
  readonly padAngle: number;
  readonly colors: ReadonlyArray<string> | undefined;
  readonly centerLabel: string | undefined;
  readonly showLabels?: boolean;
  readonly labelPosition?: "inside" | "outside";
  readonly labelFormat?: (datum: ChartDatum, share: number) => string;
  readonly activeIndex?: number;
  readonly stacked?: boolean;
  readonly onSliceActivate?: (datum: ChartDatum, index: number) => void;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  const palette = paletteOf(theme, colors);
  const box = chartBox(size, size, {
    width: DEFAULT_RING_SIZE,
    height: DEFAULT_RING_SIZE,
  });
  const slices = Arr.filter(data, (one) => one !== null && one !== undefined);
  const values = Arr.map(slices, (one) => one.value);
  const total = Arr.reduce(
    values,
    0,
    (sum, value) => sum + Math.max(0, Number.isFinite(value) ? value : 0),
  );
  const segments = stacked
    ? ringBands(values, box, innerRadius, padAngle, activeIndex)
    : ringSegments(values, box, innerRadius, padAngle, activeIndex);
  const labelPoints = ringLabelPoints(values, box, innerRadius);
  const outsideLabels = ringOutsideLabels(values, box);
  return (
    <div
      testId={testId === undefined ? undefined : `${testId}-plot`}
      style={{
        ...recipeStyle(CHART_PLOT, theme),
        width: box.width,
        height: box.height,
      }}
    >
      {Arr.map(slices, (one, index) => (
        <ChartMask
          key={one.key}
          chartTestId={testId}
          layer={{
            key: one.key,
            series: { key: one.key, label: one.label, values: [one.value] },
            seriesIndex: index,
            marks: segments[index] ?? [],
          }}
          label={seriesName(one.label, one.key)}
          description={seriesDescription([one.value])}
          colour={seriesColourOf(
            palette,
            { key: one.key, label: one.label, values: [] },
            index,
          )}
          box={box}
        />
      ))}
      {onSliceActivate === undefined
        ? undefined
        : Arr.map(slices, (one, index) => {
            const point = labelPoints[index];
            if (point === undefined || Option.isNone(point)) return null;
            return (
              <div
                key={`${one.key}-hit`}
                testId={
                  testId === undefined
                    ? undefined
                    : `${testId}-slice-${one.key}`
                }
                onClick={() => onSliceActivate(one, index)}
                style={{
                  position: "absolute",
                  left: point.value.x - 16,
                  top: point.value.y - 16,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                }}
              />
            );
          })}
      {showLabels && labelPosition === "outside" ? (
        <ChartMask
          chartTestId={testId}
          layer={{
            key: "leaders",
            series: { key: "leaders", label: "leaders", values: [] },
            seriesIndex: 0,
            decorative: true,
            opacity: 0.8,
            marks: Arr.flatMap(outsideLabels, (label) =>
              Option.match(label, {
                onNone: () => [],
                onSome: (found): ReadonlyArray<ChartMark> => [
                  { kind: "path", d: found.leader, stroke: lineStroke(1) },
                ],
              }),
            ),
          }}
          label=""
          description=""
          colour={themeColors(theme).border ?? "#000000"}
          box={box}
        />
      ) : undefined}
      {showLabels && labelPosition === "outside"
        ? Arr.map(slices, (one, index) => {
            const label = outsideLabels[index];
            if (label === undefined || Option.isNone(label)) return null;
            const share = total <= 0 ? 0 : Math.max(0, one.value) / total;
            const words =
              labelFormat === undefined
                ? seriesName(one.label, one.key)
                : labelFormat(one, share);
            const anchor = label.value.point;
            return (
              <text
                key={`${one.key}-outside`}
                style={{
                  ...textStyle(theme, "caption"),
                  position: "absolute",
                  left: label.value.right ? anchor.x + 4 : anchor.x - 84,
                  top: anchor.y - 8,
                  width: 80,
                  textAlign: label.value.right ? "left" : "right",
                  color: themeColors(theme).mutedForeground,
                }}
              >
                {words}
              </text>
            );
          })
        : undefined}
      {showLabels && labelPosition === "inside"
        ? Arr.map(slices, (one, index) => {
            const point = labelPoints[index];
            if (point === undefined || Option.isNone(point)) return null;
            const share = total <= 0 ? 0 : Math.max(0, one.value) / total;
            const words =
              labelFormat === undefined
                ? seriesName(one.label, one.key)
                : labelFormat(one, share);
            return (
              <text
                key={`${one.key}-label`}
                style={{
                  ...textStyle(theme, "caption"),
                  position: "absolute",
                  left: point.value.x - 30,
                  top: point.value.y - 8,
                  width: 60,
                  textAlign: "center",
                  color: themeColors(theme).background,
                }}
              >
                {words}
              </text>
            );
          })
        : undefined}
      {centerLabel === undefined ||
      centerLabel.trim().length === 0 ? undefined : (
        <text
          style={{
            ...textStyle(theme, "label"),
            position: "absolute",
            left: 0,
            top: box.height / 2 - 10,
            width: box.width,
            textAlign: "center",
            color: themeColors(theme).foreground,
          }}
        >
          {centerLabel}
        </text>
      )}
    </div>
  );
};

const RingLegend = ({
  data,
  colors,
  values,
  format,
  testId,
}: {
  readonly data: ReadonlyArray<ChartDatum>;
  readonly colors: ReadonlyArray<string> | undefined;
  readonly values: boolean;
  readonly format: (value: number) => string;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  const palette = paletteOf(theme, colors);
  return (
    <ChartLegend
      testId={testId}
      items={Arr.map(data, (one, index) => ({
        key: one.key,
        label: values
          ? `${seriesName(one.label, one.key)} · ${format(one.value)}`
          : one.label,
        color: seriesColourOf(
          palette,
          { key: one.key, label: one.label, values: [] },
          index,
        ),
      }))}
    />
  );
};

export const PieChart = ({
  data,
  size = DEFAULT_RING_SIZE,
  innerRadius = 0,
  padAngle = 0.02,
  legend = true,
  legendValues = false,
  colors,
  valueFormat,
  centerLabel,
  showLabels = false,
  labelPosition = "inside",
  labelFormat,
  activeIndex,
  stacked = false,
  onSliceActivate,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  className,
  testId,
  style,
  ...rest
}: PieChartProps) => {
  const theme = useTheme();
  const rows = dataOf(data);
  const animated = useAnimatedValues(
    Arr.map(rows, (one) => [one.value]),
    animate,
    animationDuration,
  );
  const reveal = useMountReveal(animate, animationDuration);
  const shown = Arr.map(rows, (one, index) => ({
    ...one,
    value: scaleValue(animated[index]?.[0] ?? one.value, reveal),
  }));
  return (
    <div
      {...rest}
      role="group"
      testId={testId}
      style={mergeStyles(recipeStyle(cn(CHART_ROOT, className), theme), style)}
    >
      <Ring
        data={shown}
        size={size}
        innerRadius={innerRadius}
        padAngle={padAngle}
        colors={colors}
        centerLabel={centerLabel}
        showLabels={showLabels && reveal >= 1}
        labelPosition={labelPosition}
        labelFormat={labelFormat}
        activeIndex={activeIndex}
        stacked={stacked}
        onSliceActivate={onSliceActivate}
        testId={testId}
      />
      {legend ? (
        <RingLegend
          data={rows}
          colors={colors}
          values={legendValues}
          format={valueFormat ?? valueLabel}
          testId={testId === undefined ? undefined : `${testId}-legend`}
        />
      ) : undefined}
    </div>
  );
};

export type DonutChartProps = PieChartProps;

export const DonutChart = ({ innerRadius = 0.62, ...props }: PieChartProps) => (
  <PieChart {...props} innerRadius={innerRadius} />
);

const circleAxes = (shape: "polygon" | "circle", axes: number): number =>
  shape === "circle" ? 4 : axes;

export interface RadarChartProps extends ChartProps {
  readonly levels?: number;
  readonly dots?: boolean;
  readonly fillOpacity?: number;
  readonly webs?: boolean;
  readonly gridShape?: "polygon" | "circle";
  readonly gridFill?: boolean;
  readonly fill?: boolean;
  readonly radius?: number;
  readonly gridAt?: ReadonlyArray<number>;
  readonly dotIcons?: ReadonlyArray<IconName>;
  readonly axisLabelFormat?: (label: string, index: number) => string;
  readonly pointTooltip?: boolean;
}

export const RadarChart = ({
  levels = 4,
  dots = false,
  fillOpacity = 0.25,
  webs = true,
  gridShape = "polygon",
  gridFill = false,
  fill = true,
  radius,
  gridAt,
  dotIcons,
  axisLabelFormat,
  pointTooltip = false,
  ...props
}: RadarChartProps) => {
  const rows = seriesFor(props.series, props.config, props.data);
  const labels = labelsFor(props.labels, props.data);
  const axes = Math.max(3, labels.length);
  const max = chartScale(rows, axes);
  const range = { min: 0, max };
  const theme = useTheme();
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      axis={false}
      grid={false}
      xLabels={false}
      range={range}
      paint={({ series, box, reveal }) => {
        const shown = scaleSeries(series, revealOf(reveal));
        return Arr.flatMap(shown, (one, seriesIndex) => {
          const points = radarPoints(one.values, axes, box, max, radius);
          const outline = polygonPath(points);
          return Arr.flatten([
            webs
              ? [
                  {
                    key: one.key,
                    series: one,
                    seriesIndex,
                    kind: "web",
                    decorative: true,
                    opacity: 0.6,
                    marks: Arr.map(
                      [
                        ...(gridAt === undefined
                          ? gridShape === "circle"
                            ? radarCircleGrid(levels, box, radius)
                            : radarGrid(levels, axes, box, max, radius)
                          : gridShape === "circle"
                            ? radarCircleGridAt(gridAt, box, radius)
                            : radarGridAt(gridAt, axes, box, max, radius)),
                        ...radarSpokes(
                          circleAxes(gridShape, axes),
                          box,
                          max,
                          radius,
                        ),
                      ],
                      (d): ChartMark => ({
                        kind: "path",
                        d,
                        stroke: lineStroke(1),
                      }),
                    ),
                  } satisfies PaintLayer,
                  ...(gridFill
                    ? [
                        {
                          key: one.key,
                          series: one,
                          seriesIndex,
                          kind: "web-fill",
                          decorative: true,
                          opacity: 0.06,
                          marks: Arr.map(
                            radarGrid(levels, axes, box, max, radius),
                            (d): ChartMark => ({ kind: "path", d }),
                          ),
                        } satisfies PaintLayer,
                      ]
                    : []),
                ]
              : [],
            [
              ...(fill
                ? [
                    {
                      key: one.key,
                      series: one,
                      seriesIndex,
                      opacity: fillOpacity,
                      marks: Option.match(outline, {
                        onNone: () => [],
                        onSome: (d): ReadonlyArray<ChartMark> => [
                          { kind: "path" as const, d },
                        ],
                      }),
                    } satisfies PaintLayer,
                  ]
                : []),
              {
                key: one.key,
                series: one,
                seriesIndex,
                kind: "line",
                decorative: true,
                marks: Option.match(outline, {
                  onNone: () => [],
                  onSome: (d): ReadonlyArray<ChartMark> => [
                    { kind: "path", d, stroke: lineStroke(2) },
                  ],
                }),
              } satisfies PaintLayer,
            ],
            dots
              ? [
                  {
                    key: one.key,
                    series: one,
                    seriesIndex,
                    kind: "dots",
                    decorative: true,
                    marks: pointMarks(points, 3),
                  } satisfies PaintLayer,
                ]
              : [],
          ]);
        });
      }}
      overlay={({ box, series, palette, origin, reveal }) => (
        <>
          {Arr.map(labels, (label, index) => {
            const angle = -Math.PI / 2 + (index / axes) * Math.PI * 2;
            const reach =
              radius === undefined
                ? Math.min(box.width, box.height) / 2 - 4
                : radius;
            const x = box.width / 2 + reach * Math.cos(angle);
            const y = box.height / 2 + reach * Math.sin(angle);
            return (
              <text
                key={`axis-${index}`}
                style={{
                  ...textStyle(theme, "caption"),
                  position: "absolute",
                  left: x - 40,
                  top: y - 8,
                  width: 80,
                  textAlign: "center",
                  color: themeColors(theme).mutedForeground,
                }}
              >
                {axisLabelFormat === undefined
                  ? label
                  : axisLabelFormat(label, index)}
              </text>
            );
          })}
          {pointTooltip && revealOf(reveal) >= 1 ? (
            <PointTooltip
              zones={Arr.flatMap(series, (one, seriesIndex) =>
                Arr.map(
                  radarPoints(one.values, axes, box, max, radius),
                  (point, index) => ({
                    key: one.key,
                    x: point.x,
                    y: point.y,
                    category: labels[index] ?? "",
                    label: seriesName(one.label, one.key),
                    value: (props.valueFormat ?? valueLabel)(
                      one.values[index] ?? 0,
                    ),
                    colour: seriesColourOf(palette, one, seriesIndex),
                  }),
                ),
              )}
              box={box}
              origin={origin}
              testId={props.testId}
            />
          ) : undefined}
          {dotIcons === undefined || revealOf(reveal) < 1
            ? undefined
            : Arr.flatMap(series, (one, seriesIndex) =>
                Arr.map(
                  radarPoints(one.values, axes, box, max, radius),
                  (point, index) => {
                    const name = dotIcons[index];
                    return name === undefined || !isIconName(name) ? null : (
                      <div
                        key={`${one.key}-icon-${index}`}
                        style={{
                          position: "absolute",
                          left: point.x - 7,
                          top: point.y - 7,
                        }}
                      >
                        <Icon
                          color={seriesColourOf(palette, one, seriesIndex)}
                          name={name}
                          size={14}
                          testId={
                            props.testId === undefined
                              ? undefined
                              : `${props.testId}-dot-${one.key}-${index}`
                          }
                        />
                      </div>
                    );
                  },
                ),
              )}
        </>
      )}
      legendNode={() => (
        <LegendFor
          series={rows}
          colors={props.colors}
          config={props.config}
          shape={props.legendShape}
          testId={
            props.testId === undefined ? undefined : `${props.testId}-legend`
          }
        />
      )}
    />
  );
};

export interface RadialChartProps extends Omit<Props, "children"> {
  readonly data: ReadonlyArray<ChartDatum>;
  readonly size?: number;
  readonly max?: number;
  readonly thickness?: number;
  readonly gap?: number;
  readonly track?: boolean;
  readonly grid?: boolean;
  readonly rounded?: boolean;
  readonly showLabels?: boolean;
  readonly animate?: boolean;
  readonly animationDuration?: number;
  readonly legend?: boolean;
  readonly colors?: ReadonlyArray<string>;
  readonly valueFormat?: (value: number) => string;
  readonly centerLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

export const RadialChart = ({
  data,
  size = DEFAULT_RING_SIZE,
  max,
  thickness = 10,
  gap = 4,
  track = false,
  grid = false,
  rounded = false,
  showLabels = false,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  legend = true,
  colors,
  valueFormat,
  centerLabel,
  className,
  testId,
  style,
  ...rest
}: RadialChartProps) => {
  const theme = useTheme();
  const palette = paletteOf(theme, colors);
  const rows = dataOf(data);
  const animated = useAnimatedValues(
    Arr.map(rows, (one) => [one.value]),
    animate,
    animationDuration,
  );
  const reveal = useMountReveal(animate, animationDuration);
  const shown = Arr.map(rows, (one, index) => ({
    ...one,
    value: scaleValue(animated[index]?.[0] ?? one.value, reveal),
  }));
  const box = chartBox(size, size, {
    width: DEFAULT_RING_SIZE,
    height: DEFAULT_RING_SIZE,
  });
  const ceiling = Option.match(Option.fromNullishOr(max), {
    onNone: () =>
      Arr.reduce(rows, 0, (most, one) =>
        Math.max(most, Math.max(0, one.value)),
      ) || 1,
    onSome: (value) => (Number.isFinite(value) && value > 0 ? value : 1),
  });
  const arcs = Arr.map(
    radialArcs(
      Arr.map(shown, (one) => one.value),
      box,
      ceiling,
      thickness,
      gap,
    ),
    (marks, index) => {
      if (!rounded) return marks;
      const value = shown[index]?.value ?? 0;
      const span =
        ceiling <= 0 ? 0 : (Math.max(0, value) / ceiling) * Math.PI * 2;
      if (span <= 0 || span >= Math.PI * 2 - 1e-9) return marks;
      const outer =
        Math.min(box.width, box.height) / 2 - 1 - index * (thickness + gap);
      const mid = outer - thickness / 2;
      const cap = (angle: number): ChartMark => ({
        kind: "circle",
        cx: box.width / 2 + mid * Math.cos(angle),
        cy: box.height / 2 + mid * Math.sin(angle),
        r: thickness / 2,
      });
      return [...marks, cap(-Math.PI / 2), cap(-Math.PI / 2 + span)];
    },
  );
  return (
    <div
      {...rest}
      role="group"
      testId={testId}
      style={mergeStyles(recipeStyle(cn(CHART_ROOT, className), theme), style)}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-plot`}
        style={{
          ...recipeStyle(CHART_PLOT, theme),
          width: box.width,
          height: box.height,
        }}
      >
        {grid ? (
          <ChartMask
            chartTestId={testId}
            layer={{
              key: "grid",
              series: { key: "grid", label: "grid", values: [] },
              seriesIndex: 0,
              decorative: true,
              opacity: 0.6,
              marks: Arr.makeBy(4, (index) => ({
                kind: "path" as const,
                d: fullRing(
                  box.width / 2,
                  box.height / 2,
                  ((Math.min(box.width, box.height) / 2 - 1) * (index + 1)) / 4,
                  ((Math.min(box.width, box.height) / 2 - 1) * (index + 1)) /
                    4 -
                    1,
                ),
                stroke: lineStroke(1),
              })),
            }}
            label=""
            description=""
            colour={themeColors(theme).border ?? "#000000"}
            box={box}
          />
        ) : undefined}
        {track
          ? Arr.map(rows, (one, index) => (
              <ChartMask
                key={`${one.key}-track`}
                chartTestId={testId}
                layer={{
                  key: one.key,
                  series: { key: one.key, label: one.label, values: [] },
                  seriesIndex: index,
                  kind: "track",
                  decorative: true,
                  opacity: 0.18,
                  marks: Arr.makeBy(1, () => {
                    const outer =
                      Math.min(box.width, box.height) / 2 -
                      1 -
                      index * (thickness + gap);
                    return {
                      kind: "path" as const,
                      d: fullRing(
                        box.width / 2,
                        box.height / 2,
                        Math.max(0, outer),
                        Math.max(0, outer - thickness),
                      ),
                    };
                  }),
                }}
                label=""
                description=""
                colour={themeColors(theme).muted ?? "#000000"}
                box={box}
              />
            ))
          : undefined}
        {Arr.map(rows, (one, index) => (
          <ChartMask
            key={one.key}
            chartTestId={testId}
            layer={{
              key: one.key,
              series: { key: one.key, label: one.label, values: [one.value] },
              seriesIndex: index,
              marks: arcs[index] ?? [],
            }}
            label={seriesName(one.label, one.key)}
            description={seriesDescription([one.value])}
            colour={seriesColourOf(
              palette,
              { key: one.key, label: one.label, values: [] },
              index,
            )}
            box={box}
          />
        ))}
        {showLabels && reveal >= 1
          ? Arr.map(rows, (one, index) => {
              const span =
                ceiling <= 0
                  ? 0
                  : (Math.max(0, one.value) / ceiling) * Math.PI * 2;
              if (span <= 0) return null;
              const outer =
                Math.min(box.width, box.height) / 2 -
                1 -
                index * (thickness + gap);
              const mid = outer - thickness / 2;
              const angle = -Math.PI / 2 + span;
              return (
                <text
                  key={`${one.key}-value`}
                  testId={
                    testId === undefined
                      ? undefined
                      : `${testId}-value-${one.key}`
                  }
                  style={{
                    ...textStyle(theme, "caption"),
                    position: "absolute",
                    left: box.width / 2 + mid * Math.cos(angle) + 6,
                    top: box.height / 2 + mid * Math.sin(angle) - 8,
                    width: 48,
                    color: themeColors(theme).mutedForeground,
                  }}
                >
                  {(valueFormat ?? valueLabel)(one.value)}
                </text>
              );
            })
          : undefined}
        {centerLabel === undefined ||
        centerLabel.trim().length === 0 ? undefined : (
          <text
            style={{
              ...textStyle(theme, "label"),
              position: "absolute",
              left: 0,
              top: box.height / 2 - 10,
              width: box.width,
              textAlign: "center",
              color: themeColors(theme).foreground,
            }}
          >
            {centerLabel}
          </text>
        )}
      </div>
      {legend ? (
        <RingLegend
          data={rows}
          colors={colors}
          values
          format={valueFormat ?? valueLabel}
          testId={testId === undefined ? undefined : `${testId}-legend`}
        />
      ) : undefined}
    </div>
  );
};

export interface SparklineProps extends Omit<Props, "children"> {
  readonly values: ReadonlyArray<number>;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly curve?: Curve;
  /** The line is filled down to the floor. Defaults to `false`. */
  readonly filled?: boolean;
  /** A data change tweens the line's values. Defaults to `false`. */
  readonly animate?: boolean;
  /** How long a data change takes, in milliseconds. Defaults to `320`. */
  readonly animationDuration?: number;
  readonly className?: string;
  readonly testId?: string;
}

export const Sparkline = ({
  values,
  width = DEFAULT_SPARKLINE_WIDTH,
  height = DEFAULT_SPARKLINE_HEIGHT,
  color,
  curve = "smooth",
  filled = false,
  animate = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  className,
  testId,
  style,
  "aria-label": ariaLabel,
  ...rest
}: SparklineProps) => {
  const theme = useTheme();
  const box = chartBox(width, height, {
    width: DEFAULT_SPARKLINE_WIDTH,
    height: DEFAULT_SPARKLINE_HEIGHT,
  });
  const points = Arr.filter(listOf(values), Number.isFinite);
  const tweened = useAnimatedValues([points], animate, animationDuration);
  const shownPoints = tweened[0] ?? points;
  const reveal = useMountReveal(animate, animationDuration);
  const clip =
    reveal >= 1
      ? undefined
      : { x: 0, y: 0, width: box.width * reveal, height: box.height };
  const series: ChartSeries = {
    key: "sparkline",
    label: "sparkline",
    values: shownPoints,
  };
  const range = chartRange([series]);
  const path = curvePath(
    seriesPoints(shownPoints, box, range, shownPoints.length),
    curve,
  );
  const area = filled
    ? areaPath(
        seriesPoints(shownPoints, box, range, shownPoints.length),
        box,
        range,
        curve,
      )
    : Option.none();
  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(recipeStyle(cn(CHART_ROOT, className), theme), style)}
    >
      <div
        style={{
          ...recipeStyle(CHART_PLOT, theme),
          width: box.width,
          height: box.height,
        }}
      >
        {Option.isNone(area) ? undefined : (
          <ChartMask
            chartTestId={testId}
            layer={{
              key: "sparkline",
              series,
              seriesIndex: 0,
              kind: "area",
              decorative: true,
              opacity: 0.2,
              ...(clip === undefined ? {} : { clip }),
              marks: [{ kind: "path", d: Option.getOrElse(area, () => "") }],
            }}
            label=""
            description=""
            colour={chosenColour(
              color,
              paletteOf(theme, undefined)[0] ?? "#000000",
            )}
            box={box}
          />
        )}
        <ChartMask
          chartTestId={testId}
          layer={{
            key: "sparkline",
            series,
            seriesIndex: 0,
            ...(clip === undefined ? {} : { clip }),
            marks: Option.match(path, {
              onNone: () => [],
              onSome: (d): ReadonlyArray<ChartMark> => [
                { kind: "path", d, stroke: lineStroke(1.5) },
              ],
            }),
          }}
          label={spokenText(
            Option.fromNullishOr(ariaLabel),
            DEFAULT_SPARKLINE_LABEL,
          )}
          description={seriesDescription(shownPoints)}
          colour={chosenColour(
            color,
            paletteOf(theme, undefined)[0] ?? "#000000",
          )}
          box={box}
        />
      </div>
    </div>
  );
};
