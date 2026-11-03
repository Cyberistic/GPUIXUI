/** @jsxImportSource @gpuix/react */
/**
 * Charts, drawn as stacked `<svg>` masks.
 *
 * `@gpuix/native@0.11.0` has no chart host and no canvas, and an `<svg source>`
 * is rasterised into **one** tinted mask (`chart-raster` measured an icon with
 * five layers painting five colours as one). The route this module takes is the
 * one that measurement leaves: **one `<svg>` per series per layer**, each
 * carrying its geometry in the plot's viewBox and tinted through `style.color`,
 * stacked in paint order inside one relatively positioned plot. Labels, ticks
 * and the hover readout are ordinary `<text>` beside the plot; a legend is a row
 * of swatches in the series' own colours.
 *
 * Nothing paints a surface: a chart inherits the card or page it sits on, which
 * is also what the probe measured of a transparent raster margin.
 *
 * ```tsx
 * <AreaChart
 *   aria-label="Revenue by quarter"
 *   labels={["Q1", "Q2", "Q3", "Q4"]}
 *   series={[{ key: "revenue", label: "Revenue", values: [32, 48, 41, 60] }]}
 *   curve="smooth"
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon, isIconName, type IconName } from "@gpuixui/icons";
import { iconStepValue, spokenText } from "@gpuixui/primitives/core";
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
import { DEFAULT_ANIMATION_DURATION, useAnimatedValues } from "./animation.js";
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
import { textStyle, themeColors, useTheme } from "../theme.js";
import {
  CHART_LEGEND,
  CHART_LEGEND_ITEM,
  CHART_PLOT,
  CHART_ROOT,
  CHART_SWATCH,
} from "./recipe.js";

export {
  CHART_AXIS_WIDTH,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_WIDTH,
} from "./frame.js";

/** The side of a donut's square plot when the caller names none. */
const DEFAULT_RING_SIZE = 160;

/** The width of a sparkline's plot when the caller names none. */
const DEFAULT_SPARKLINE_WIDTH = 120;

/** The height of a sparkline's plot when the caller names none. */
const DEFAULT_SPARKLINE_HEIGHT = 32;

/**
 * The name a sparkline paints when the caller names none.
 *
 * The name is a stored value as often as a literal (a locale table with a
 * missing row, a preference a store saved empty), so a blank one reads as this
 * word rather than an unnamed image — the rule `spokenText` applies.
 */
export const DEFAULT_SPARKLINE_LABEL = "Trend";

/** The colour a caller names, or the fallback when it names none. */
const chosenColour = (colour: string | undefined, fallback: string): string =>
  Option.match(Option.fromNullishOr(colour), {
    onNone: () => fallback,
    onSome: (value) => (Str.isNonEmpty(Str.trim(value)) ? value : fallback),
  });

/** One legend entry. */
export interface ChartLegendItem {
  readonly key: string;
  /** The row's words. A blank label reads as `key`. */
  readonly label: string;
  /** A theme colour, usually a swatch from `seriesColors`. */
  readonly color: string;
  /** A value the row prints after its words, already formatted. */
  readonly value?: string;
}

export type { LegendShape, TooltipIndicator } from "./frame.js";

/** {@link ChartLegend} props. */
export interface ChartLegendProps extends Omit<Props, "children"> {
  /**
   * The rows, in paint order.
   *
   * A saved legend writes `null` where it carried no rows, so only a list is a
   * list: a slot with no list paints no rows rather than throwing out of the
   * render.
   */
  readonly items: ReadonlyArray<ChartLegendItem>;
  /** The mark beside each row: a square (default), a dot or a line. */
  readonly shape?: LegendShape;
  readonly testId?: string;
}

/**
 * The legend: one swatch and one label per series, in the colours they paint.
 *
 * The words are painted beside the colour, so a colour repeats what the text
 * already says — a reader who cannot separate two hues still reads the series.
 */
export const ChartLegend = ({
  items,
  shape = "square",
  testId,
  style,
  ...rest
}: ChartLegendProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const rows = recordsOf(items);
  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(recipeStyle(CHART_LEGEND, theme), style)}
    >
      {Arr.map(rows, (item) => (
        <div key={item.key} style={recipeStyle(CHART_LEGEND_ITEM, theme)}>
          <div
            testId={
              testId === undefined ? undefined : `${testId}-swatch-${item.key}`
            }
            style={{
              ...recipeStyle(CHART_SWATCH, theme),
              width:
                shape === "line"
                  ? iconStepValue(theme, "xs") * 2
                  : iconStepValue(theme, "xs"),
              height: shape === "line" ? 2 : iconStepValue(theme, "xs"),
              borderRadius:
                shape === "dot"
                  ? iconStepValue(theme, "xs") / 2
                  : shape === "line"
                    ? 1
                    : undefined,
              backgroundColor: item.color,
            }}
          />
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: colors.mutedForeground,
            }}
          >
            {item.value === undefined
              ? seriesName(item.label, item.key)
              : `${seriesName(item.label, item.key)} ${item.value}`}
          </text>
        </div>
      ))}
    </div>
  );
};

/** The rules every series chart shares. */
export interface ChartProps extends Omit<Props, "children"> {
  /**
   * The series, painted in the theme's categorical order.
   *
   * A saved chart writes `null` where it carried no series, so only a list is a
   * list: a chart with no series paints its frame and no layer.
   */
  /**
   * The series, painted in the theme's categorical order.
   *
   * A chart that names a `config` **and** a `data` paints the series the two
   * make, and needs no `series` of its own — so the prop is optional beside a
   * config. A chart that names neither paints nothing.
   */
  readonly series?: ReadonlyArray<ChartSeries>;
  /**
   * One label per category, under the plot.
   *
   * A chart that names a `data` reads the categories the data carries, so the
   * prop is optional beside one.
   */
  readonly labels?: ReadonlyArray<string>;
  /**
   * The chart's **config**: a keyed table of label, icon and colour.
   *
   * The config is shadcn's `ChartConfig`, and it is **decoupled from the
   * data**: one table can be shared by several charts, and a theme can own the
   * colours. A chart that names a config **and** a `data` paints the series
   * the config and the data make; a chart that names no config keeps the
   * caller's own `series`.
   */
  readonly config?: ChartConfig;
  /**
   * The chart's data: one row per category, one field per series.
   *
   * A row is a record, and the series' key is the field it is read by — the
   * `dataKey` route a Recharts chart takes.
   */
  readonly data?: ReadonlyArray<ChartRow>;
  /** The plot's width, in pixels. Defaults to `320`. */
  readonly width?: number;
  /** The plot's height, in pixels. Defaults to `160`. */
  readonly height?: number;
  /** Where the legend paints; `false` hides it. Defaults to below for 2+ series. */
  readonly legend?: boolean | LegendSide;
  /** The mark beside each legend row: a square, a dot or a line. */
  readonly legendShape?: LegendShape;
  /** The y-axis tick column paints. Defaults to `true`. */
  readonly axis?: boolean;
  /** The horizontal grid lines paint. Defaults to `true`. */
  readonly grid?: boolean;
  /** The category labels paint under the plot. Defaults to `true`. */
  readonly xLabels?: boolean;
  /** How many steps the axis divides its range into. Defaults to `4`. */
  readonly ticks?: number;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** A hovered column shows every series' value. Defaults to `true`. */
  readonly tooltip?: boolean;
  /** The mark beside a readout row: a dot (default), a line, an icon or none. */
  readonly tooltipIndicator?: TooltipIndicator;
  /** An icon per series, used when `tooltipIndicator` is `"icon"`. */
  readonly tooltipIcons?: ReadonlyArray<IconName>;
  /** How the hovered category's name prints. */
  readonly labelFormat?: (label: string) => string;
  /** A wash paints behind the hovered column. Defaults to `false`. */
  readonly activeBand?: boolean;
  /** The category window a brush leaves in the plot, as `[start, end)` indexes. */
  readonly domain?: readonly [number, number];
  /** The continuous window a zoom or pan shows, in category units. */
  readonly view?: readonly [number, number];
  /** A navigation strip under the plot pans on drag and zooms on the wheel. */
  readonly zoom?: boolean;
  /** The window a zoom or pan reports, in category units. */
  readonly onViewChange?: (view: readonly [number, number]) => void;
  /** A brush strip under the plot reports a dragged category window. */
  readonly brush?: boolean;
  /** The dragged window, as `[start, end)` category indexes. */
  readonly onDomainChange?: (domain: readonly [number, number]) => void;
  /** A data change tweens its values over `animationDuration`. Defaults to `false`. */
  readonly animate?: boolean;
  /** How long a data change takes, in milliseconds. Defaults to `320`. */
  readonly animationDuration?: number;
  /** How a value prints in the tooltip. Defaults to one decimal. */
  readonly valueFormat?: (value: number) => string;
  readonly className?: string;
  /** The chart's test id. A series layer is `${testId}-layer-${key}`. */
  readonly testId?: string;
}

/** The series a saved chart hands over, read through the stored-list rules. */
const seriesOf = (
  series: ReadonlyArray<ChartSeries> | undefined,
): ReadonlyArray<ChartSeries> =>
  Arr.map(recordsOf(series), (one) => ({
    ...one,
    values: listOf(one.values),
  }));

/**
 * The series a chart paints: the caller's own, or the ones its **config**
 * and its **data** make.
 *
 * The config is shadcn's `ChartConfig` — a keyed table of label, icon and
 * colour, decoupled from the data — so one table can be shared by several
 * charts and a theme can own the colours. A chart that names no config keeps
 * the caller's own series, so the config is an addition rather than a
 * replacement.
 */
const seriesFor = (
  series: ReadonlyArray<ChartSeries> | undefined,
  config: ChartConfig | undefined,
  data: ReadonlyArray<ChartRow> | undefined,
): ReadonlyArray<ChartSeries> =>
  config === undefined || data === undefined
    ? seriesOf(series)
    : seriesFromConfig(config, data);

/**
 * The categories a chart paints: the caller's own, or the ones its data
 * names.
 *
 * The data's **first** row carries the category, so a table of
 * `{ month, desktop, mobile }` reads `January … June` under the plot. A
 * chart that names no data keeps the caller's own `labels`.
 */
const labelsFor = (
  labels: ReadonlyArray<string> | undefined,
  data: ReadonlyArray<ChartRow> | undefined,
): ReadonlyArray<string> => {
  const own = labelsOf(labels);
  if (data === undefined || data.length === 0) return own;
  const fromData = categoriesFromData(data);
  return fromData.length === 0 ? own : fromData;
};

/** The labels a saved chart hands over, at their own slots. */
const labelsOf = (
  labels: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> => textsOf(labels);

/** The continuous window a chart paints, normalized to its categories. */
const viewOf = (
  labels: ReadonlyArray<string>,
  view: readonly [number, number] | undefined,
): ChartView | undefined =>
  Option.getOrUndefined(chartView(labels.length, view));

/** The categories a brush leaves in the plot, when it names a window. */
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

/** The data a saved ring hands over. */
const dataOf = (
  data: ReadonlyArray<ChartDatum> | undefined,
): ReadonlyArray<ChartDatum> =>
  Arr.map(recordsOf(data), (one) => ({
    ...one,
    // A stored value the geometry cannot draw keeps its place and its reading:
    // a `NaN` announces `no value` rather than the zero the paint substitutes.
    value: one.value,
  }));

/** The layers one series paints, named and decorative. */
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

/** The value labels a bar chart paints over its bars. */
const barValueLabels =
  (
    format: (value: number, one: ChartSeries, category: string) => string,
    horizontal: boolean,
    view: ChartView | undefined,
  ) =>
  ({ series, box, range, labels }: PaintContext): ReadonlyArray<ValueLabel> => {
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

/** The value labels a line or an area paints over its points. */
const pointValueLabels =
  (format: (value: number) => string) =>
  ({ series, box, range, labels }: PaintContext): ReadonlyArray<ValueLabel> => {
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

/** {@link BarChart} props. */
export interface BarChartProps extends ChartProps {
  /** Bars run up (vertical) or right (horizontal). Defaults to `vertical`. */
  readonly orientation?: "vertical" | "horizontal";
  /** The bar's corner radius in pixels. Defaults to `3`. */
  readonly radius?: number;
  /** Each bar's value paints above it. Defaults to `false`. */
  readonly valueLabels?: boolean;
  /** What a bar's label says. Defaults to `valueFormat`, then the value. */
  readonly valueLabelFormat?: (
    value: number,
    series: ChartSeries,
    category: string,
  ) => string;
}

/**
 * Bars: every series stands in the same category slot, up from zero.
 *
 * A negative value stands below the axis; a zero paints no bar but keeps its
 * slot, so the labels still line up.
 */
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
      paint={({ series, labels, box }) =>
        layersFor(
          series,
          horizontal
            ? horizontalBarMarks(series, box, range, labels.length, radius)
            : barMarksInRange(series, box, range, labels.length, radius, view),
        )
      }
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

/** {@link StackedBar} props. */
export interface StackedBarProps extends ChartProps {
  /** The bar's corner radius in pixels. Defaults to `3`. */
  readonly radius?: number;
  /** Each category reads as 100%, and its stacks as shares of it. */
  readonly percent?: boolean;
}

/** A series' values as shares of each category's total. */
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

/**
 * Stacked bars: the first series on the floor, each later one above it.
 *
 * The axis is measured over the totals, so a stack of `120` is not labelled
 * `100`. `percent` divides each category by its own total and scales to 100.
 */
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
      paint={({ series, labels: slots, box }) =>
        layersFor(
          series,
          stackedLayers(series, box, range, slots.length, radius, view),
        )
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

/** Stacked bars, first series on the floor, each later one above it. */
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

/** {@link ComposedChart} props. */
export interface ComposedChartProps extends ChartProps {
  /**
   * The series painted as lines; every other series paints as a bar.
   *
   * The bar-mixed example's shape: a count as bars and a rate beside it as a
   * line, over one shared axis.
   */
  readonly lineKeys?: ReadonlyArray<string>;
  /** The bar's corner radius in pixels. Defaults to `3`. */
  readonly radius?: number;
}

/**
 * Bars and lines on one axis.
 *
 * A key named in `lineKeys` paints as a stroked path through its slot centres;
 * the rest paint as grouped bars. The scale is measured over both, so a line
 * and a bar at the same value land on the same axis reading.
 */
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
      paint={({ series, labels: slots, box }) => {
        const bars = Arr.filter(series, (one) => !isLine(one.key));
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
          Arr.flatMap(series, (one, seriesIndex) => {
            if (!isLine(one.key)) return [];
            const points = seriesPoints(one.values, box, range, slots.length);
            return [
              {
                key: one.key,
                series: one,
                seriesIndex,
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

/** {@link LineChart} props. */
export interface LineChartProps extends ChartProps {
  /** How a line joins its points. Defaults to `linear`. */
  readonly curve?: Curve;
  /** A dot paints on every point. Defaults to `false`. */
  readonly dots?: boolean;
  /** The line paints dashes. Defaults to `false`. */
  readonly dashed?: boolean;
  /** The stroke's weight in pixels. Defaults to `2`. */
  readonly lineWidth?: number;
  /** Each point's value paints above it. Defaults to `false`. */
  readonly showLabels?: boolean;
  /** An icon per category paints on each point, in place of a dot. */
  readonly dotIcons?: ReadonlyArray<IconName>;
  /** A hit zone on every point shows that datum's readout. */
  readonly pointTooltip?: boolean;
}

/** {@link ScatterChart} props. */
export interface ScatterChartProps extends ChartProps {
  /** The radius of each point, in pixels. Defaults to `3`. */
  readonly radius?: number;
}

/**
 * Scatter: one point per datum, and no line between them.
 *
 * A point sits where its value sits, so a point outside the range is clipped
 * to the plot's edge rather than drawing outside the frame. A datum with no
 * number paints no point — the rule every mark follows.
 */
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
      paint={({ series, labels: slots, box }) =>
        layersFor(
          series,
          Arr.map(series, (one) =>
            scatterMarks(one.values, box, range, slots.length, radius),
          ),
        )
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

/** {@link CandleChart} props. */
export interface CandleChartProps extends ChartProps {
  /**
   * The candles, one per category.
   *
   * A candle is the open, high, low and close of a period, and a candle that
   * closed above its open is an **up** day.
   */
  readonly candles: ReadonlyArray<Candle>;
  /** The width of each candle's body, in pixels. Defaults to `6`. */
  readonly width?: number;
  /** The colour an up day paints. Defaults to the theme's positive role. */
  readonly upColor?: string;
  /** The colour a down day paints. Defaults to the theme's negative role. */
  readonly downColor?: string;
}

/**
 * Candle: the open, high, low and close of each period.
 *
 * A candle that closed above its open paints in the **up** colour and one
 * that closed at or below it in the **down** colour, so a reader who cannot
 * separate two hues still reads the direction.
 */
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
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ box }) => [
        {
          key: "candles",
          series: { key: "candles", label: "Candles", values: [] },
          seriesIndex: 0,
          // Each candle paints in the colour of **its own** direction: a
          // candle that closed above its open is an up day and one that
          // closed at or below it is a down day. A reader who cannot
          // separate two hues still reads the direction.
          marks: Arr.flatMap(candles, (candle, index) =>
            // Each candle's own marks, so the colour follows **its**
            // direction rather than the list's position.
            Arr.map(
              candleAtMarks(candle, index, labels.length, box, range, width),
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

/** {@link FunnelChart} props. */
export interface FunnelChartProps extends ChartProps {
  /** The stages, one per category, each a share of the first. */
  readonly stages: ReadonlyArray<number>;
  /** The labels the stages answer to. */
  readonly stageLabels?: ReadonlyArray<string>;
}

/**
 * Funnel: a stage per datum, each a share of the first.
 *
 * The stages are centred and narrow, so a funnel reads as a funnel rather than
 * as bars of different widths stacked to one side.
 */
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
  return (
    <ChartFrame
      {...props}
      series={rows}
      labels={labels}
      domainLabels={labelsFor(props.labels, props.data)}
      range={range}
      paint={({ box }) => [
        {
          key: "funnel",
          series: { key: "funnel", label: "Funnel", values: stages },
          seriesIndex: 0,
          marks: funnelMarks(stages, box),
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

/**
 * One path per series through its points, left to right.
 *
 * The path is spaced over the **labelled** categories, like the bars, so a
 * point sits above its own label.
 */
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
      paint={({ series, labels, box }) =>
        Arr.flatMap(series, (one, seriesIndex) => {
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
                  marks: pointMarks(points, lineWidth + 1.5),
                },
                line,
              ]
            : [line];
        })
      }
      valueLabels={
        showLabels
          ? pointValueLabels(props.valueFormat ?? valueLabel)
          : undefined
      }
      overlay={
        dotIcons === undefined && !pointTooltip
          ? undefined
          : ({ series, labels, box, range, palette, origin }) => {
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
                  {dotIcons === undefined
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

/** {@link AreaChart} props. */
export interface AreaChartProps extends ChartProps {
  /** How the area's edge joins its points. Defaults to `smooth`. */
  readonly curve?: Curve;
  /** Each series stands on the one before it. Defaults to `false`. */
  readonly stacked?: boolean;
  /** The fill fades toward the axis. Defaults to `true`. */
  readonly gradient?: boolean;
  /** The fill's top opacity, 0–1. Defaults to `0.35`. */
  readonly fillOpacity?: number;
  /** A dot paints on every point. Defaults to `false`. */
  readonly dots?: boolean;
  /** The edge's stroke weight in pixels. Defaults to `2`. */
  readonly lineWidth?: number;
  /** Each point's value paints above it. Defaults to `false`. */
  readonly showLabels?: boolean;
  /** A hit zone on every point shows that datum's readout. */
  readonly pointTooltip?: boolean;
  /** An icon per category paints on each point. */
  readonly dotIcons?: ReadonlyArray<IconName>;
}

/**
 * A filled area under each series' line, with a fade toward the axis.
 *
 * The fade is a stack of nested bands at equal opacity, because the runtime has
 * no gradient inside a one-tint mask: the region nearest the line is covered by
 * every band, the baseline by one.
 */
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
      paint={({ series, labels, box }) =>
        Arr.flatMap(series, (one, seriesIndex) => {
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
                    marks: pointMarks(points, lineWidth + 1.5),
                  } satisfies PaintLayer,
                ]
              : [],
          ]);
        })
      }
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
                {dotIcons === undefined
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

/**
 * The cumulative series a stacked area draws.
 *
 * Each series' value becomes the running total up to it, so its band sits on
 * the one before and the top band reaches the category's total.
 */
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

/**
 * The legend a series chart paints, in its series' colours.
 *
 * The colour is the one the **plot** paints the series in, so the legend and
 * the plot cannot disagree: the config's colour when it names one, and the
 * theme's categorical scale otherwise.
 */
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

/** One slice of a ring. */
export interface ChartDatum {
  readonly key: string;
  /** The datum's name in the legend. A blank label reads as `key`. */
  readonly label: string;
  readonly value: number;
}

/** {@link PieChart} props. */
export interface PieChartProps extends Omit<Props, "children"> {
  /** One slice per datum, in the theme's categorical order. */
  readonly data: ReadonlyArray<ChartDatum>;
  /** The plot's size, in pixels. Defaults to `160` square. */
  readonly size?: number;
  /** The hole's share of the radius, 0–0.95. Defaults to `0` (a pie). */
  readonly innerRadius?: number;
  /** The gap between slices, in radians. Defaults to `0.02`. */
  readonly padAngle?: number;
  /** The legend paints under the ring. Defaults to `true`. */
  readonly legend?: boolean;
  /** The legend rows print their value. Defaults to `true`. */
  readonly legendValues?: boolean;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** How a value prints in the legend. Defaults to one decimal. */
  readonly valueFormat?: (value: number) => string;
  /** A label paints in the ring's centre. */
  readonly centerLabel?: string;
  /** Each slice's label paints on its own arc. Defaults to `false`. */
  readonly showLabels?: boolean;
  /** Where a slice's label sits: inside the arc, or outside with a leader. */
  readonly labelPosition?: "inside" | "outside";
  /** What a slice's label says. Defaults to the datum's label. */
  readonly labelFormat?: (datum: ChartDatum, share: number) => string;
  /** The slice that stands proud of the ring, as the active example's cue. */
  readonly activeIndex?: number;
  /** Each datum owns a concentric band instead of a slice of one ring. */
  readonly stacked?: boolean;
  /** A press on a slice reports the datum it belongs to. */
  readonly onSliceActivate?: (datum: ChartDatum, index: number) => void;
  /** A data change tweens the ring's values. Defaults to `false`. */
  readonly animate?: boolean;
  /** How long a data change takes, in milliseconds. Defaults to `320`. */
  readonly animationDuration?: number;
  readonly className?: string;
  /** The chart's test id. A slice is `${testId}-layer-${key}`. */
  readonly testId?: string;
}

/** The ring a pie, a donut and a radial chart paint in. */
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

/** The legend a ring paints: one row per datum, with its value beside it. */
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

/** A pie: one slice per datum, from twelve o'clock. */
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
  animate = false,
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
  const shown = Arr.map(rows, (one, index) => ({
    ...one,
    value: animated[index]?.[0] ?? one.value,
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
        showLabels={showLabels}
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

/** {@link DonutChart} props: the ring takes every pie option. */
export type DonutChartProps = PieChartProps;

/** A ring: a pie with a hole, the value at its centre when one is named. */
export const DonutChart = ({ innerRadius = 0.62, ...props }: PieChartProps) => (
  <PieChart {...props} innerRadius={innerRadius} />
);

/** The spokes a circular grid draws: four, or one per axis on a polygon. */
const circleAxes = (shape: "polygon" | "circle", axes: number): number =>
  shape === "circle" ? 4 : axes;

/** {@link RadarChart} props. */
export interface RadarChartProps extends ChartProps {
  /** How many webs the grid draws. Defaults to `4`. */
  readonly levels?: number;
  /** A dot paints on every corner. Defaults to `false`. */
  readonly dots?: boolean;
  /** The series polygon's opacity, 0–1. Defaults to `0.25`. */
  readonly fillOpacity?: number;
  /** The webs and spokes paint. Defaults to `true`. */
  readonly webs?: boolean;
  /** The web's shape: a polygon through the axes, or a circle per level. */
  readonly gridShape?: "polygon" | "circle";
  /** The webs fill at a low opacity, so the grid reads as a target. */
  readonly gridFill?: boolean;
  /** The series polygon fills. Defaults to `true`; `false` draws lines only. */
  readonly fill?: boolean;
  /** The outer radius in pixels; defaults to the box's half, less its padding. */
  readonly radius?: number;
  /** The webs at these radii, as fractions of the outer radius. */
  readonly gridAt?: ReadonlyArray<number>;
  /** An icon per axis paints on every corner. */
  readonly dotIcons?: ReadonlyArray<IconName>;
  /** How an axis label prints. Defaults to the label as given. */
  readonly axisLabelFormat?: (label: string, index: number) => string;
  /** A hit zone on every corner shows that axis' datum. */
  readonly pointTooltip?: boolean;
}

/**
 * Radar: one closed polygon per series over a shared set of axes.
 *
 * A point sits on its axis at its share of the widest value, so a series keeps
 * its shape as the axes grow. The labels are painted at each axis' rim.
 */
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
      paint={({ series, box }) =>
        Arr.flatMap(series, (one, seriesIndex) => {
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
        })
      }
      overlay={({ box, series, palette, origin }) => (
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
          {pointTooltip ? (
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
          {dotIcons === undefined
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

/** {@link RadialChart} props. */
export interface RadialChartProps extends Omit<Props, "children"> {
  /** One ring per datum, outermost first. */
  readonly data: ReadonlyArray<ChartDatum>;
  /** The plot's size, in pixels. Defaults to `160` square. */
  readonly size?: number;
  /** The value a full ring stands for. Defaults to the largest datum. */
  readonly max?: number;
  /** One ring's thickness in pixels. Defaults to `10`. */
  readonly thickness?: number;
  /** The gap between rings in pixels. Defaults to `4`. */
  readonly gap?: number;
  /** A muted ring paints behind each value, so the dial reads as a gauge. */
  readonly track?: boolean;
  /** Guide rings paint at each quarter of the radius. */
  readonly grid?: boolean;
  /** Each arc's ends round off with a cap. Defaults to `false`. */
  readonly rounded?: boolean;
  /** Each ring's value prints at the end of its arc. Defaults to `false`. */
  readonly showLabels?: boolean;
  /** A data change tweens the rings' values. Defaults to `false`. */
  readonly animate?: boolean;
  /** How long a data change takes, in milliseconds. Defaults to `320`. */
  readonly animationDuration?: number;
  /** The legend paints under the rings. Defaults to `true`. */
  readonly legend?: boolean;
  /** The categorical palette; defaults to the theme's series scale. */
  readonly colors?: ReadonlyArray<string>;
  /** How a value prints in the legend. Defaults to one decimal. */
  readonly valueFormat?: (value: number) => string;
  /** A label paints in the rings' centre. */
  readonly centerLabel?: string;
  readonly className?: string;
  /** The chart's test id. A ring is `${testId}-layer-${key}`. */
  readonly testId?: string;
}

/**
 * Radial bars: one concentric ring per datum, filled to its share of `max`.
 *
 * The rings start at twelve o'clock and grow clockwise, the dial every gauge
 * uses; a zero keeps its ring in the stack and paints no arc.
 */
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
  animate = false,
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
  const shown = Arr.map(rows, (one, index) => ({
    ...one,
    value: animated[index]?.[0] ?? one.value,
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
        {showLabels
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

/** {@link Sparkline} props. */
export interface SparklineProps extends Omit<Props, "children"> {
  /** The values, one point each, in paint order. */
  readonly values: ReadonlyArray<number>;
  /** The plot's width, in pixels. Defaults to `120`. */
  readonly width?: number;
  /** The plot's height, in pixels. Defaults to `32`. */
  readonly height?: number;
  /** The line's colour; defaults to the theme's first categorical swatch. */
  readonly color?: string;
  /** How the line joins its points. Defaults to `smooth`. */
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

/**
 * A word-sized line: no axis, no labels, no legend.
 *
 * It is one `<svg>` in the first categorical colour, so a stat card's trend and
 * a chart's first series agree without the caller naming a colour twice.
 */
export const Sparkline = ({
  values,
  width = DEFAULT_SPARKLINE_WIDTH,
  height = DEFAULT_SPARKLINE_HEIGHT,
  color,
  curve = "smooth",
  filled = false,
  animate = false,
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
