/**
 * Charts, drawn as stacked `<svg>` masks.
 *
 * `@gpuix/native@0.11.0` has no chart host, no canvas and no transform, and an
 * `<svg source>` is rasterised into **one** tinted mask — `chart-raster`
 * measured an icon with five layers painting five colours as one. The route this
 * module takes is the one that measurement leaves: **one `<svg>` per series**,
 * each carrying that series' whole geometry in the plot's viewBox and tinted
 * through `style.color`, stacked in paint order inside one relatively positioned
 * plot. Labels and ticks are ordinary `<text>` beside the plot; a legend is a row
 * of swatches in the series' own colours.
 *
 * Nothing paints a surface: a chart inherits the card or page it sits on, which
 * is also what the probe measured of a transparent raster margin.
 *
 * ```tsx
 * <BarChart
 *   aria-label="Revenue by quarter"
 *   labels={["Q1", "Q2", "Q3", "Q4"]}
 *   series={[{ key: "revenue", label: "Revenue", values: [32, 48, 41, 60] }]}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { seriesColors } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { recipeStyle } from "../recipe.js";
import { textStyle, useTheme } from "../theme.js";
import {
  axisTicks,
  barSlot,
  chartMarkup,
  chartScale,
  donutSegments,
  groupedBarMarks,
  linePath,
  seriesColour,
  stackedBarMarks,
  stackedScale,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "./logic.js";
import {
  CHART_AXIS,
  CHART_AXIS_LABEL,
  CHART_CATEGORIES,
  CHART_CATEGORY,
  CHART_LABEL,
  CHART_LEGEND,
  CHART_LEGEND_ITEM,
  CHART_PLOT,
  CHART_ROOT,
  CHART_SWATCH,
} from "./recipe.js";

/** The plot's width when the caller names none. */
export const DEFAULT_CHART_WIDTH = 320;

/** The plot's height when the caller names none. */
export const DEFAULT_CHART_HEIGHT = 160;

/** The y-axis column's width: a measurement of the widest tick it holds. */
export const CHART_AXIS_WIDTH = 36;

/** One legend entry. */
export interface ChartLegendItem {
  readonly key: string;
  readonly label: string;
  /** A theme colour, usually a swatch from `seriesColors`. */
  readonly color: string;
}

/** {@link ChartLegend} props. */
export interface ChartLegendProps extends Omit<Props, "children"> {
  readonly items: ReadonlyArray<ChartLegendItem>;
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
  testId,
  style,
  ...rest
}: ChartLegendProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(recipeStyle(CHART_LEGEND, theme), style)}
    >
      {items.map((item) => (
        <div key={item.key} style={recipeStyle(CHART_LEGEND_ITEM, theme)}>
          <div
            testId={
              testId === undefined ? undefined : `${testId}-swatch-${item.key}`
            }
            style={{
              ...recipeStyle(CHART_SWATCH, theme),
              width: theme.iconSize.xs,
              height: theme.iconSize.xs,
              backgroundColor: item.color,
            }}
          />
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {item.label}
          </text>
        </div>
      ))}
    </div>
  );
};

/** The rules every series chart shares. */
export interface ChartProps extends Omit<Props, "children"> {
  /** The series, painted in the theme's categorical order. */
  readonly series: ReadonlyArray<ChartSeries>;
  /** One label per category, under the plot. */
  readonly labels: ReadonlyArray<string>;
  /** The plot's width, in pixels. Defaults to `320`. */
  readonly width?: number;
  /** The plot's height, in pixels. Defaults to `160`. */
  readonly height?: number;
  /** The legend paints under the labels. Defaults to `true` for two or more series. */
  readonly legend?: boolean;
  /** The y-axis tick column paints. Defaults to `true`. */
  readonly axis?: boolean;
  /** How many ticks the y axis divides its scale into. Defaults to `4`. */
  readonly ticks?: number;
  readonly className?: string;
  /** The chart's test id. A series layer is `${testId}-layer-${key}`. */
  readonly testId?: string;
}

/** The plot box from the caller's size, never zero. */
const boxOf = (width: number, height: number): ChartBox => ({
  width: Math.max(1, width),
  height: Math.max(1, height),
});

/** One series' mask, tinted by the element's `color`. */
const ChartLayer = ({
  chartTestId,
  seriesKey,
  label,
  colour,
  marks,
  box,
}: {
  readonly chartTestId: string | undefined;
  readonly seriesKey: string;
  readonly label: string;
  readonly colour: string;
  readonly marks: ReadonlyArray<ChartMark>;
  readonly box: ChartBox;
}) => (
  <svg
    source={chartMarkup(marks, box)}
    role="img"
    aria-label={label}
    testId={
      chartTestId === undefined
        ? undefined
        : `${chartTestId}-layer-${seriesKey}`
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

/** A series chart's shared frame: axis, plot, labels and legend. */
const ChartFrame = ({
  series,
  labels,
  width = DEFAULT_CHART_WIDTH,
  height = DEFAULT_CHART_HEIGHT,
  legend,
  axis = true,
  ticks = 4,
  className,
  testId,
  marks,
  scaleOf = chartScale,
  style,
  ...rest
}: ChartProps & {
  /**
   * The scale the axis prints and the marks draw against.
   *
   * A grouped bar or a line reads the widest single value; a stack reads its
   * totals (`stackedScale`). Both come from the same call, so the axis cannot
   * name a value the plot did not draw.
   */
  readonly scaleOf?: (series: ReadonlyArray<ChartSeries>) => number;
  readonly marks: (
    box: ChartBox,
    scale: number,
  ) => ReadonlyArray<ReadonlyArray<ChartMark>>;
}) => {
  const theme = useTheme();
  const box = boxOf(width, height);
  const scale = scaleOf(series);
  const palette = seriesColors(theme);
  const layers = marks(box, scale);
  const slot = barSlot(labels.length, box.width).slot;
  const showLegend = legend ?? series.length > 1;
  return (
    <div
      {...rest}
      role="group"
      testId={testId}
      style={mergeStyles(recipeStyle(cn(CHART_ROOT, className), theme), style)}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        {axis ? (
          <div
            style={{
              ...recipeStyle(CHART_AXIS, theme),
              width: CHART_AXIS_WIDTH,
              height,
            }}
          >
            {axisTicks(scale, ticks).map((tick) => (
              <text
                key={`tick-${tick}`}
                testId={
                  testId === undefined ? undefined : `${testId}-tick-${tick}`
                }
                style={{
                  ...recipeStyle(CHART_AXIS_LABEL, theme),
                  textAlign: "right",
                }}
              >
                {`${Math.round(tick * 100) / 100}`}
              </text>
            ))}
          </div>
        ) : undefined}
        <div
          testId={testId === undefined ? undefined : `${testId}-plot`}
          style={{
            ...recipeStyle(CHART_PLOT, theme),
            width: box.width,
            height: box.height,
          }}
        >
          {Arr.map(series, (one, index) =>
            Arr.match(layers[index] ?? [], {
              onEmpty: () => null,
              onNonEmpty: (marks) => (
                <ChartLayer
                  key={one.key}
                  chartTestId={testId}
                  seriesKey={one.key}
                  label={one.label}
                  colour={seriesColour(palette, index)}
                  marks={marks}
                  box={box}
                />
              ),
            }),
          )}
        </div>
      </div>
      <div
        testId={testId === undefined ? undefined : `${testId}-categories`}
        style={{
          ...recipeStyle(CHART_CATEGORIES, theme),
          paddingLeft: axis ? CHART_AXIS_WIDTH : 0,
        }}
      >
        {labels.map((label, index) => (
          <div
            key={`category-${index}`}
            testId={
              testId === undefined ? undefined : `${testId}-label-${index}`
            }
            style={{ ...recipeStyle(CHART_CATEGORY, theme), width: slot }}
          >
            <text
              style={{
                ...recipeStyle(CHART_LABEL, theme),
                textAlign: "center",
              }}
            >
              {label}
            </text>
          </div>
        ))}
      </div>
      {showLegend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(series, (one, index) => ({
            key: one.key,
            label: one.label,
            color: seriesColour(palette, index),
          }))}
        />
      ) : undefined}
    </div>
  );
};

/** {@link BarChart} props. */
export type BarChartProps = ChartProps;

/** Grouped bars: every series stands in the same category slot. */
export const BarChart = (props: BarChartProps) => (
  <ChartFrame
    {...props}
    marks={(box, scale) =>
      groupedBarMarks(props.series, box, scale, props.labels.length)
    }
  />
);

/** {@link StackedBar} props. */
export type StackedBarProps = ChartProps;

/**
 * Stacked bars: the first series on the floor, each later one above it.
 *
 * The axis and the bars both read {@link stackedScale}: a stack is one bar of
 * its totals, so a scale measured over the widest single series would label a
 * `120` stack `100`.
 */
export const StackedBar = (props: StackedBarProps) => (
  <ChartFrame
    {...props}
    scaleOf={stackedScale}
    marks={(box, scale) =>
      stackedBarMarks(props.series, box, scale, props.labels.length)
    }
  />
);

/** {@link LineChart} props. */
export type LineChartProps = ChartProps;

/** One path per series through its points, left to right. */
export const LineChart = (props: LineChartProps) => (
  <ChartFrame
    {...props}
    marks={(box, scale) =>
      Arr.map(props.series, (one) =>
        Option.match(linePath(one.values, box, scale), {
          onNone: () => [],
          onSome: (d): ReadonlyArray<ChartMark> => [{ kind: "path", d }],
        }),
      )
    }
  />
);

/** One slice of a ring. */
export interface ChartDatum {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/** {@link DonutChart} props. */
export interface DonutChartProps extends Omit<Props, "children"> {
  /** One slice per datum, in the theme's categorical order. */
  readonly data: ReadonlyArray<ChartDatum>;
  /** The plot's size, in pixels. Defaults to `160` square. */
  readonly size?: number;
  /** The legend paints under the ring. Defaults to `true`. */
  readonly legend?: boolean;
  readonly className?: string;
  /** The chart's test id. A slice is `${testId}-layer-${key}`. */
  readonly testId?: string;
}

/**
 * A ring: one slice per datum, each its own `<svg>` because each is its own
 * tint, with the segments drawn from twelve o'clock.
 *
 * A single datum that fills the ring paints two halves — an arc from an angle
 * to itself is empty, which the geometry suite measures.
 */
export const DonutChart = ({
  data,
  size = 160,
  legend = true,
  className,
  testId,
  style,
  ...rest
}: DonutChartProps) => {
  const theme = useTheme();
  const box = boxOf(size, size);
  const palette = seriesColors(theme);
  const segments = donutSegments(
    Arr.map(data, (one) => one.value),
    box,
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
        {data.map((one, index) =>
          Arr.match(segments[index] ?? [], {
            onEmpty: () => null,
            onNonEmpty: (marks) => (
              <ChartLayer
                key={one.key}
                chartTestId={testId}
                seriesKey={one.key}
                label={one.label}
                colour={seriesColour(palette, index)}
                marks={marks}
                box={box}
              />
            ),
          }),
        )}
      </div>
      {legend ? (
        <ChartLegend
          testId={testId === undefined ? undefined : `${testId}-legend`}
          items={Arr.map(data, (one, index) => ({
            key: one.key,
            label: one.label,
            color: seriesColour(palette, index),
          }))}
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
  /** The line's colour. Defaults to the theme's first categorical swatch. */
  readonly color?: string;
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
  width = 120,
  height = 32,
  color,
  className,
  testId,
  style,
  "aria-label": ariaLabel,
  ...rest
}: SparklineProps) => {
  const theme = useTheme();
  const box = boxOf(width, height);
  const scale = chartScale([{ key: "sparkline", label: "sparkline", values }]);
  const d = linePath(values, box, scale);
  return (
    <div
      {...rest}
      role="img"
      aria-label={ariaLabel}
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
        <ChartLayer
          chartTestId={testId}
          seriesKey="sparkline"
          label={ariaLabel ?? "Trend"}
          colour={color ?? seriesColour(seriesColors(theme), 0)}
          marks={Option.match(d, {
            onNone: () => [],
            onSome: (path): ReadonlyArray<ChartMark> => [
              { kind: "path", d: path },
            ],
          })}
          box={box}
        />
      </div>
    </div>
  );
};
