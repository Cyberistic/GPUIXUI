/** @jsxImportSource @gpuix/react */
/**
 * A chart's shared frame: axis, grid, plot, labels, legend and hover readout.
 *
 * The frame owns everything a chart type does not: where the plot sits, how the
 * axis divides its range, the hovered column, and the legend. A type supplies
 * marks per series — its geometry — and the frame paints them as one `<svg>`
 * layer per series, tinted through `style.color`.
 */

import type { Props } from "@gpuix/react";
import { Icon, isIconName, type IconName } from "@gpuixui/icons";
import { mergeStyles } from "@gpuix/react/floating";
import { seriesColors } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useRef, useState, type ReactNode } from "react";
import {
  chartBox,
  chartMarkup,
  seriesDescription,
  seriesName,
  tickLabel,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "./logic.js";
import {
  chartRange,
  chartView,
  chartWindow,
  rangeTicks,
  valueLabel,
  type ChartRange,
  type ChartView,
  type Point,
} from "./geometry.js";
import { DEFAULT_ANIMATION_DURATION, useAnimatedSeries } from "./animation.js";
import { recipeStyle } from "../recipe.js";
import { textStyle, themeColors, useTheme } from "../theme.js";
import {
  CHART_AXIS,
  CHART_AXIS_LABEL,
  CHART_BRUSH,
  CHART_BRUSH_BAND,
  CHART_BRUSH_HANDLE,
  CHART_BRUSH_TRACK,
  CHART_CATEGORIES,
  CHART_CATEGORY,
  CHART_CATEGORY_LABEL,
  CHART_PLOT,
  CHART_ROOT,
  CHART_TOOLTIP,
  CHART_TOOLTIP_HEAD,
  CHART_TOOLTIP_ROW,
  CHART_TOOLTIP_VALUE,
  CHART_TOOLTIP_ZONE,
  CHART_VALUE_LABEL,
} from "./recipe.js";

/** The plot's width when the caller names none. */
export const DEFAULT_CHART_WIDTH = 320;

/** The plot's height when the caller names none. */
export const DEFAULT_CHART_HEIGHT = 160;

/** The y-axis column's width: a measurement of the widest tick it holds. */
export const CHART_AXIS_WIDTH = 36;

/** One painted layer: a series' marks at one opacity. */
export interface PaintLayer {
  /** The series the layer belongs to. */
  readonly key: string;
  readonly series: ChartSeries;
  readonly seriesIndex: number;
  readonly marks: ReadonlyArray<ChartMark>;
  /** The layer's own alpha; a named layer paints at 1. */
  readonly opacity?: number;
  /** The suffix the layer's test id carries (`area`, `dots`, `line`). */
  readonly kind?: string;
  /** Decorative layers carry no role and no name. */
  readonly decorative?: boolean;
}

/** One point a per-point readout can be hovered over. */
export interface PointZone {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  /** The category the point belongs to. */
  readonly category: string;
  /** The series' name. */
  readonly label: string;
  /** The value, already formatted. */
  readonly value: string;
  readonly colour: string;
}

/** A bar's value, placed over its own bar. */
export interface ValueLabel {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** The text painted; a caller formats before handing it over. */
  readonly text: string;
}

/** Where a legend sits relative to the plot. */
export type LegendSide = "top" | "bottom";

/** How a legend draws the mark beside each row. */
export type LegendShape = "square" | "dot" | "line";

/** How the hover readout marks each series. */
export type TooltipIndicator = "dot" | "line" | "none" | "icon";

/** What a type's geometry is given: the lists, the box, the range and colours. */
export interface PaintContext {
  readonly series: ReadonlyArray<ChartSeries>;
  readonly labels: ReadonlyArray<string>;
  readonly box: ChartBox;
  readonly range: ChartRange;
  readonly palette: ReadonlyArray<string>;
  /** The plot's origin in the window, when the runtime reported it. */
  readonly origin: Option.Option<Point>;
  /** The continuous window a zoom shows, when the caller named one. */
  readonly view?: ChartView;
}

/** The frame's props: everything a type inherits and nothing it paints. */
export interface ChartFrameProps extends Omit<Props, "children"> {
  readonly series: ReadonlyArray<ChartSeries>;
  readonly labels: ReadonlyArray<string>;
  readonly width?: number;
  readonly height?: number;
  /** Where the legend paints; `false` hides it. Defaults to below for 2+ series. */
  readonly legend?: boolean | LegendSide;
  /** The mark beside each legend row. Defaults to a square. */
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
  /** The category window the chart paints, as `[start, end)` indexes. */
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
  /** Every category, so a brushed chart's strip is not windowed by its own drag. */
  readonly domainLabels?: ReadonlyArray<string>;
  /** A data change tweens its values over `animationDuration`. Defaults to `false`. */
  readonly animate?: boolean;
  /** How long a data change takes, in milliseconds. Defaults to `320`. */
  readonly animationDuration?: number;
  /** How a value prints in the tooltip. */
  readonly valueFormat?: (value: number) => string;
  /** Each bar's value prints above it; a type that cannot place one ignores it. */
  readonly valueLabels?: (context: PaintContext) => ReadonlyArray<ValueLabel>;
  /** The signed range the marks were laid out against. */
  readonly range?: ChartRange;
  /** The layered marks a type paints, in paint order. */
  readonly paint: (context: PaintContext) => ReadonlyArray<PaintLayer>;
  /** The legend a type wants; the frame places it. */
  readonly legendNode?: (side: LegendSide) => ReactNode;
  /** Extra marks painted over the plot: axis labels, a centre label. */
  readonly overlay?: (context: PaintContext) => ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/** One mask, tinted by the element's `color`. */
export const ChartMask = ({
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
    <svg
      source={chartMarkup(layer.marks, box)}
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
        opacity: layer.opacity,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * The palette a chart paints: the caller's, else the theme's categorical scale.
 *
 * A stored palette can carry a blank swatch; a blank is absence, so it falls
 * back rather than handing `style.color` a colour the runtime drops.
 */
export const paletteOf = (
  theme: ReturnType<typeof useTheme>,
  colors: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> => {
  const chosen = Arr.filter(colors ?? [], (colour) => colour.trim().length > 0);
  return chosen.length > 0 ? chosen : seriesColors(theme);
};

/** The colour one series paints: its own, else its palette position. */
export const seriesColourOf = (
  palette: ReadonlyArray<string>,
  series: ChartSeries,
  index: number,
): string =>
  Option.match(
    Option.filter(
      Option.fromNullishOr(series.color),
      (colour) => colour.trim().length > 0,
    ),
    {
      onNone: () => palette[index % Math.max(1, palette.length)] ?? "#000000",
      onSome: (colour) => colour,
    },
  );

/** The icon a readout row paints: the caller's, else a plain dot mark. */
const tooltipIcon = (
  icons: ReadonlyArray<IconName> | undefined,
  index: number,
): IconName => {
  const name = icons?.[index];
  return name !== undefined && isIconName(name) ? name : "circle";
};

/** The category position a window x names, in category units. */
const pointerIndex = (
  windowX: number | undefined,
  origin: Option.Option<Point>,
  box: ChartBox,
  count: number,
): number =>
  Option.match(origin, {
    onNone: () => 0,
    onSome: (base) => {
      const x = windowX ?? base.x;
      return Math.max(
        0,
        Math.min(count, ((x - base.x) / Math.max(1, box.width)) * count),
      );
    },
  });

/** How many slots the plot paints. */
const slotsOf = (
  series: ReadonlyArray<ChartSeries>,
  labels: ReadonlyArray<string>,
): number =>
  labels.length > 0
    ? labels.length
    : Math.max(
        1,
        Arr.reduce(series, 0, (most, one) => Math.max(most, one.values.length)),
      );

/**
 * The frame every cartesian chart paints in.
 *
 * A series keeps its named layer while it has a labelled slot, even when no
 * value draws: a zero paints no bar but the series' numbers still reach the
 * tree. Decorative layers — an area fill, its fade, the dots — carry no name,
 * so a reader hears each series once.
 */
export const ChartFrame = ({
  series,
  labels,
  width = DEFAULT_CHART_WIDTH,
  height = DEFAULT_CHART_HEIGHT,
  legend,
  axis = true,
  grid = true,
  xLabels = true,
  ticks = 4,
  colors,
  tooltip = true,
  tooltipIndicator = "dot",
  tooltipIcons,
  labelFormat,
  activeBand = false,
  domain,
  view,
  zoom = false,
  onViewChange,
  brush = false,
  onDomainChange,
  domainLabels,
  animate = false,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  valueFormat,
  valueLabels,
  range,
  paint,
  legendNode,
  overlay,
  className,
  testId,
  style,
  ...rest
}: ChartFrameProps) => {
  const theme = useTheme();
  const palette = paletteOf(theme, colors);
  const box = chartBox(width, height, {
    width: DEFAULT_CHART_WIDTH,
    height: DEFAULT_CHART_HEIGHT,
  });
  const targetRows = Arr.map(series, (one) => ({
    ...one,
    values: Arr.take(one.values, Math.max(1, labels.length)),
  }));
  const rows = useAnimatedSeries(targetRows, animate, animationDuration);
  const categories = labels;
  const shownView = Option.getOrUndefined(chartView(categories.length, view));
  const labelView = shownView ?? {
    start: 0,
    end: Math.max(1, categories.length),
  };
  const measured = range ?? chartRange(targetRows, categories.length);
  const tickValues = rangeTicks(measured, ticks);
  const tickStep =
    tickValues.length > 1
      ? (measured.max - measured.min) / (tickValues.length - 1)
      : measured.max;
  const showLegend = legend === undefined ? rows.length > 1 : legend !== false;
  const side: LegendSide = legend === "top" ? "top" : "bottom";
  const slot = box.width / slotsOf(rows, categories);
  const [hovered, setHovered] = useState<Option.Option<number>>(Option.none());
  const [pointer, setPointer] = useState<Option.Option<Point>>(Option.none());
  const selectFrom = useRef<Option.Option<number>>(Option.none());
  const [selectTo, setSelectTo] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [origin, setOrigin] = useState<Option.Option<Point>>(Option.none());
  const format = valueFormat ?? valueLabel;
  const context: PaintContext = {
    series: rows,
    labels: categories,
    box,
    range: measured,
    palette,
    origin,
    view: shownView,
  };
  const layers = paint(context);
  const legendBody =
    legendNode === undefined || !showLegend ? undefined : legendNode(side);
  return (
    <div
      {...rest}
      role="group"
      testId={testId}
      style={mergeStyles(recipeStyle(cn(CHART_ROOT, className), theme), style)}
    >
      {side === "top" ? legendBody : undefined}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {axis ? (
          <div
            testId={testId === undefined ? undefined : `${testId}-axis`}
            style={{
              ...recipeStyle(CHART_AXIS, theme),
              width: CHART_AXIS_WIDTH,
              height: box.height,
            }}
          >
            {Arr.map(Arr.reverse(tickValues), (value) => (
              <text
                key={`tick-${value}`}
                testId={
                  testId === undefined ? undefined : `${testId}-tick-${value}`
                }
                style={{
                  ...recipeStyle(CHART_AXIS_LABEL, theme),
                  textAlign: "right",
                }}
              >
                {tickLabel(value, tickStep)}
              </text>
            ))}
          </div>
        ) : undefined}
        <div
          testId={testId === undefined ? undefined : `${testId}-plot`}
          onLayout={(event) =>
            setOrigin(
              Option.all([
                Option.fromNullishOr(event.x),
                Option.fromNullishOr(event.y),
              ]).pipe(Option.map(([x, y]) => ({ x, y }))),
            )
          }
          style={{
            ...recipeStyle(CHART_PLOT, theme),
            width: box.width,
            height: box.height,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: box.width,
              height: box.height,
              overflow: "hidden",
            }}
          >
            {activeBand
              ? Option.match(hovered, {
                  onNone: () => null,
                  onSome: (index) => (
                    <div
                      style={{
                        position: "absolute",
                        left: slot * index,
                        top: 0,
                        width: slot,
                        height: box.height,
                        backgroundColor: themeColors(theme).muted,
                        opacity: 0.5,
                        pointerEvents: "none",
                      }}
                    />
                  ),
                })
              : undefined}
            {grid ? (
              <ChartMask
                chartTestId={testId}
                layer={{
                  key: "grid",
                  kind: "grid",
                  series: { key: "grid", label: "grid", values: [] },
                  seriesIndex: 0,
                  decorative: true,
                  opacity: 0.55,
                  marks: Arr.map(tickValues, (value) => ({
                    kind: "rect" as const,
                    x: 0,
                    y:
                      box.height -
                      ((value - measured.min) /
                        Math.max(1e-9, measured.max - measured.min)) *
                        box.height,
                    width: box.width,
                    height: 1,
                  })),
                }}
                label=""
                description=""
                colour={themeColors(theme).border ?? "#000000"}
                box={box}
              />
            ) : undefined}
            {Arr.map(layers, (layer, layerIndex) => (
              <ChartMask
                key={`${layer.key}-${layerIndex}`}
                chartTestId={testId}
                layer={layer}
                label={seriesName(layer.series.label, layer.series.key)}
                description={seriesDescription(layer.series.values, categories)}
                colour={seriesColourOf(
                  palette,
                  layer.series,
                  layer.seriesIndex,
                )}
                box={box}
              />
            ))}
          </div>
          {valueLabels === undefined ? undefined : (
            <ValueLabels
              labels={valueLabels(context)}
              theme={theme}
              testId={testId}
            />
          )}
          {zoom ? (
            <div
              testId={testId === undefined ? undefined : `${testId}-gesture`}
              onMouseDown={(event) => {
                const at = pointerIndex(
                  event.x,
                  origin,
                  box,
                  categories.length,
                );
                selectFrom.current = Option.some(at);
                setSelectTo(Option.some(at));
              }}
              onMouseMove={(event) => {
                const index = pointerIndex(
                  event.x,
                  origin,
                  box,
                  categories.length,
                );
                setHovered(
                  Option.some(
                    Math.max(
                      0,
                      Math.min(
                        Math.max(0, categories.length - 1),
                        Math.floor(index),
                      ),
                    ),
                  ),
                );
                setPointer(
                  Option.all([
                    Option.fromNullishOr(event.x),
                    Option.fromNullishOr(event.y),
                  ]).pipe(Option.map(([x, y]) => ({ x, y }))),
                );
                if (Option.isSome(selectFrom.current)) {
                  setSelectTo(Option.some(index));
                }
              }}
              onMouseUp={() => {
                Option.match(selectFrom.current, {
                  onNone: () => {},
                  onSome: (from) =>
                    Option.match(selectTo, {
                      onNone: () => {},
                      onSome: (to) => {
                        if (Math.abs(to - from) >= 0.5) {
                          onViewChange?.([
                            Math.min(from, to),
                            Math.max(from, to),
                          ]);
                        }
                      },
                    }),
                });
                selectFrom.current = Option.none();
                setSelectTo(Option.none());
              }}
              onScroll={(event) => {
                const delta = event.deltaY ?? 0;
                if (delta === 0) return;
                const span = labelView.end - labelView.start;
                const factor = Math.max(
                  0.25,
                  Math.min(4, Math.exp(delta * 0.01)),
                );
                const centre = labelView.start + span / 2;
                const next = span * factor;
                onViewChange?.([
                  Math.max(
                    0,
                    Math.min(categories.length - 1, centre - next / 2),
                  ),
                  Math.min(
                    categories.length,
                    Math.max(centre - next / 2 + 1, centre + next / 2),
                  ),
                ]);
              }}
              onMouseLeave={() => {
                setHovered(Option.none());
                setPointer(Option.none());
                selectFrom.current = Option.none();
                setSelectTo(Option.none());
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: box.width,
                height: box.height,
              }}
            >
              {Option.match(selectFrom.current, {
                onNone: () => null,
                onSome: (from) =>
                  Option.match(selectTo, {
                    onNone: () => null,
                    onSome: (to) => {
                      const low = Math.min(from, to);
                      const high = Math.max(from, to);
                      const width = box.width / Math.max(1, categories.length);
                      return (
                        <div
                          style={{
                            position: "absolute",
                            left: low * width,
                            top: 0,
                            width: Math.max(1, (high - low) * width),
                            height: box.height,
                            backgroundColor: themeColors(theme).accent,
                            opacity: 0.25,
                            pointerEvents: "none",
                          }}
                        />
                      );
                    },
                  }),
              })}
            </div>
          ) : tooltip && rows.length > 0 && categories.length > 0 ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: box.width,
                height: box.height,
                display: "flex",
                flexDirection: "row",
              }}
            >
              {Arr.makeBy(categories.length, (index) => (
                <div
                  key={`zone-${index}`}
                  testId={
                    testId === undefined ? undefined : `${testId}-zone-${index}`
                  }
                  onMouseEnter={() => setHovered(Option.some(index))}
                  onMouseMove={(event) =>
                    setPointer(
                      Option.all([
                        Option.fromNullishOr(event.x),
                        Option.fromNullishOr(event.y),
                      ]).pipe(Option.map(([x, y]) => ({ x, y }))),
                    )
                  }
                  onMouseLeave={() => {
                    setHovered(Option.none());
                    setPointer(Option.none());
                  }}
                  style={{
                    ...recipeStyle(CHART_TOOLTIP_ZONE, theme),
                    width: slot,
                    height: box.height,
                  }}
                />
              ))}
            </div>
          ) : undefined}
          {tooltip
            ? Option.match(hovered, {
                onNone: () => null,
                onSome: (index) => (
                  <ChartTooltip
                    series={targetRows}
                    labels={categories}
                    palette={palette}
                    theme={theme}
                    index={index}
                    slot={slot}
                    box={box}
                    pointer={Option.flatMap(pointer, (at) =>
                      Option.map(origin, (base) => ({
                        x: at.x - base.x,
                        y: at.y - base.y,
                      })),
                    )}
                    format={format}
                    indicator={tooltipIndicator}
                    tooltipIcons={tooltipIcons}
                    labelFormat={labelFormat}
                    testId={testId}
                  />
                ),
              })
            : undefined}
          {overlay === undefined ? undefined : overlay(context)}
        </div>
      </div>
      {xLabels && view !== undefined ? (
        <div
          testId={testId === undefined ? undefined : `${testId}-categories`}
          style={{
            position: "relative",
            height: 16,
            width: box.width,
            marginLeft: axis ? CHART_AXIS_WIDTH : 0,
            overflow: "hidden",
          }}
        >
          {Arr.map(categories, (label, index) => {
            const width =
              box.width / Math.max(1, labelView.end - labelView.start);
            return (
              <text
                key={`category-${index}`}
                testId={
                  testId === undefined ? undefined : `${testId}-label-${index}`
                }
                style={{
                  ...recipeStyle(CHART_CATEGORY_LABEL, theme),
                  position: "absolute",
                  left: (index - labelView.start) * width,
                  top: 0,
                  width,
                  textAlign: "center",
                }}
              >
                {label}
              </text>
            );
          })}
        </div>
      ) : xLabels ? (
        <div
          testId={testId === undefined ? undefined : `${testId}-categories`}
          style={{
            ...recipeStyle(CHART_CATEGORIES, theme),
            paddingLeft: axis ? CHART_AXIS_WIDTH : 0,
          }}
        >
          {Arr.map(categories, (label, index) => (
            <div
              key={`category-${index}`}
              testId={
                testId === undefined ? undefined : `${testId}-label-${index}`
              }
              style={{ ...recipeStyle(CHART_CATEGORY, theme), width: slot }}
            >
              <text
                style={{
                  ...recipeStyle(CHART_CATEGORY_LABEL, theme),
                  width: slot,
                  textAlign: "center",
                }}
              >
                {label}
              </text>
            </div>
          ))}
        </div>
      ) : undefined}
      {zoom ? (
        <ChartZoom
          length={categories.length}
          view={shownView}
          theme={theme}
          onViewChange={onViewChange}
          width={box.width}
          padding={axis ? CHART_AXIS_WIDTH : 0}
          testId={testId}
        />
      ) : undefined}
      {brush ? (
        <ChartBrush
          labels={domainLabels ?? categories}
          domain={domain}
          theme={theme}
          onDomainChange={onDomainChange}
          width={box.width}
          padding={axis ? CHART_AXIS_WIDTH : 0}
          testId={testId}
        />
      ) : undefined}
      {side === "bottom" ? legendBody : undefined}
    </div>
  );
};

/**
 * Per-point readout: a hit zone on every mark, and the one under the pointer.
 *
 * A chart with dots and a line has no natural column to hover when the pointer
 * is between categories; this is the reference set's point tooltip, and it is
 * one zone per series point, so the card names the series and the datum.
 */
export const PointTooltip = ({
  zones,
  box,
  origin,
  testId,
}: {
  readonly zones: ReadonlyArray<PointZone>;
  readonly box: ChartBox;
  readonly origin: Option.Option<Point>;
  readonly testId: string | undefined;
}) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const [active, setActive] = useState<Option.Option<number>>(Option.none());
  const [pointer, setPointer] = useState<Option.Option<Point>>(Option.none());
  const width = 128;
  return (
    <>
      {Arr.map(zones, (zone, index) => (
        <div
          key={`${zone.key}-${index}`}
          testId={
            testId === undefined
              ? undefined
              : `${testId}-point-${zone.key}-${index}`
          }
          onMouseEnter={() => setActive(Option.some(index))}
          onMouseMove={(event) =>
            setPointer(
              Option.all([
                Option.fromNullishOr(event.x),
                Option.fromNullishOr(event.y),
                origin,
              ]).pipe(
                Option.map(([x, y, base]) => ({
                  x: x - base.x,
                  y: y - base.y,
                })),
              ),
            )
          }
          onMouseLeave={() => {
            setActive(Option.none());
            setPointer(Option.none());
          }}
          style={{
            position: "absolute",
            left: zone.x - 9,
            top: zone.y - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
          }}
        />
      ))}
      {Option.match(active, {
        onNone: () => null,
        onSome: (index) => {
          const zone = zones[index];
          if (zone === undefined) return null;
          return (
            <div
              testId={testId === undefined ? undefined : `${testId}-point-tip`}
              style={{
                ...recipeStyle(CHART_TOOLTIP, theme),
                position: "absolute",
                left: Option.match(pointer, {
                  onNone: () => Math.max(0, zone.x + 10),
                  onSome: (at) =>
                    Math.max(0, Math.min(box.width - 8, at.x + 12)),
                }),
                top: Option.match(pointer, {
                  onNone: () => Math.max(0, zone.y - 40),
                  onSome: (at) => Math.max(0, at.y + 12),
                }),
                width,
                pointerEvents: "none",
              }}
            >
              <text
                style={{
                  ...recipeStyle(CHART_TOOLTIP_HEAD, theme),
                  ...textStyle(theme, "caption"),
                  color: colors.mutedForeground,
                }}
              >
                {zone.category}
              </text>
              <div style={recipeStyle(CHART_TOOLTIP_ROW, theme)}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: zone.colour,
                  }}
                />
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: colors.mutedForeground,
                  }}
                >
                  {zone.label}
                </text>
                <text
                  style={{
                    ...recipeStyle(CHART_TOOLTIP_VALUE, theme),
                    ...textStyle(theme, "caption"),
                    color: colors.foreground,
                  }}
                >
                  {zone.value}
                </text>
              </div>
            </div>
          );
        },
      })}
    </>
  );
};

/** The zoom strip: drag to pan, wheel to zoom, and reset to show everything. */
const ChartZoom = ({
  length,
  view,
  theme,
  onViewChange,
  width,
  padding,
  testId,
}: {
  readonly length: number;
  readonly view: ChartView | undefined;
  readonly theme: ReturnType<typeof useTheme>;
  readonly onViewChange:
    | ((view: readonly [number, number]) => void)
    | undefined;
  readonly width: number;
  readonly padding: number;
  readonly testId: string | undefined;
}) => {
  const span = view === undefined ? Math.max(1, length) : view.end - view.start;
  const start = view === undefined ? 0 : view.start;
  const [anchor, setAnchor] = useState<
    Option.Option<{ readonly x: number; readonly start: number }>
  >(Option.none());
  const apply = (nextStart: number, nextSpan: number): void => {
    const spanNow = Math.max(1, Math.min(length, nextSpan));
    const startNow = Math.max(0, Math.min(length - spanNow, nextStart));
    onViewChange?.([startNow, startNow + spanNow]);
  };
  return (
    <div style={{ marginLeft: padding, width }}>
      <div
        testId={testId === undefined ? undefined : `${testId}-zoom`}
        onMouseDown={(event) =>
          setAnchor(
            Option.map(Option.fromNullishOr(event.x), (x) => ({
              x,
              start,
            })),
          )
        }
        onMouseLeave={() => setAnchor(Option.none())}
        onMouseMove={(event) => {
          if (Option.isNone(anchor)) return;
          Option.match(anchor, {
            onNone: () => {},
            onSome: (base) => {
              const delta = ((event.x ?? base.x) - base.x) / Math.max(1, width);
              apply(base.start - delta * span, span);
            },
          });
        }}
        onMouseUp={() => setAnchor(Option.none())}
        onScroll={(event) => {
          const delta = event.deltaY ?? 0;
          if (delta === 0) return;
          const factor = Math.max(0.25, Math.min(4, Math.exp(delta * 0.01)));
          const centre = start + span / 2;
          const nextSpan = span * factor;
          apply(centre - nextSpan / 2, nextSpan);
        }}
        style={{
          position: "relative",
          width,
          height: 16,
          backgroundColor: themeColors(theme).muted,
          borderRadius: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: (start / Math.max(1, length)) * width,
            width: (span / Math.max(1, length)) * width,
            backgroundColor: themeColors(theme).accent,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        role="button"
        testId={testId === undefined ? undefined : `${testId}-zoom-reset`}
        onClick={() => {
          onViewChange?.([0, Math.max(1, length)]);
        }}
        style={{
          marginTop: 2,
          fontSize: 11,
          color: themeColors(theme).mutedForeground,
        }}
      >
        Reset
      </div>
    </div>
  );
};

/**
 * The brush strip: drag across it to window the plotted categories.
 *
 * The strip spans the plot's own width, so an edge maps to a category by
 * proportion. `onDomainChange` reports every step of the drag (a live window) —
 * the chart is controlled, and `domain` is what paints the selection.
 */
const ChartBrush = ({
  labels,
  domain,
  theme,
  onDomainChange,
  width,
  padding,
  testId,
}: {
  readonly labels: ReadonlyArray<string>;
  readonly domain: readonly [number, number] | undefined;
  readonly theme: ReturnType<typeof useTheme>;
  readonly onDomainChange:
    | ((domain: readonly [number, number]) => void)
    | undefined;
  readonly width: number;
  readonly padding: number;
  readonly testId: string | undefined;
}) => {
  const colors = themeColors(theme);
  const [origin, setOrigin] = useState<Option.Option<Point>>(Option.none());
  const drag = useRef<Option.Option<number>>(Option.none());
  const [edge, setEdge] = useState<Option.Option<number>>(Option.none());
  const [, redraw] = useState(0);
  const count = Math.max(1, labels.length);
  const committed = Option.getOrElse(
    chartWindow(labels.length, domain),
    () => ({
      start: 0,
      end: Math.max(1, labels.length),
    }),
  );
  const selected = Option.match(drag.current, {
    onNone: () => committed,
    onSome: (start) =>
      Option.match(edge, {
        onNone: () => ({ start, end: start + 1 }),
        onSome: (end) => ({
          start: Math.min(start, end),
          end: Math.max(start, end) + 1,
        }),
      }),
  });
  const indexAt = (windowX: number): number =>
    Option.match(origin, {
      onNone: () => 0,
      onSome: (base) => {
        const ratio = (windowX - base.x) / Math.max(1, width);
        return Math.max(0, Math.min(count - 1, Math.floor(ratio * count)));
      },
    });
  const report = (start: number, end: number): void => {
    onDomainChange?.([Math.min(start, end), Math.max(start, end) + 1]);
  };
  const left = (selected.start / count) * width;
  const selectedWidth = Math.max(
    2,
    ((selected.end - selected.start) / count) * width,
  );
  return (
    <div
      testId={testId === undefined ? undefined : `${testId}-brush`}
      onLayout={(event) =>
        setOrigin(
          Option.all([
            Option.fromNullishOr(event.x),
            Option.fromNullishOr(event.y),
          ]).pipe(Option.map(([x, y]) => ({ x, y }))),
        )
      }
      onMouseDown={(event) => {
        const at = indexAt(event.x ?? 0);
        drag.current = Option.some(at);
        setEdge(Option.some(at));
        redraw((tick) => tick + 1);
        report(at, at);
      }}
      onMouseMove={(event) => {
        if (Option.isNone(drag.current)) return;
        const at = indexAt(event.x ?? 0);
        setEdge(Option.some(at));
        Option.match(drag.current, {
          onNone: () => {},
          onSome: (start) => report(start, at),
        });
      }}
      onMouseUp={() => {
        drag.current = Option.none();
        setEdge(Option.none());
        redraw((tick) => tick + 1);
      }}
      onMouseLeave={() => {
        drag.current = Option.none();
        setEdge(Option.none());
        redraw((tick) => tick + 1);
      }}
      style={{
        ...recipeStyle(CHART_BRUSH, theme),
        width,
        height: 16,
        marginLeft: padding,
      }}
    >
      <div style={recipeStyle(CHART_BRUSH_TRACK, theme)}>
        <div
          testId={
            testId === undefined ? undefined : `${testId}-brush-selection`
          }
          style={{
            ...recipeStyle(CHART_BRUSH_BAND, theme),
            position: "absolute",
            left,
            width: selectedWidth,
            backgroundColor: colors.accent,
          }}
        />
        <div
          style={{
            ...recipeStyle(CHART_BRUSH_HANDLE, theme),
            position: "absolute",
            left,
            backgroundColor: colors.primary,
          }}
        />
        <div
          style={{
            ...recipeStyle(CHART_BRUSH_HANDLE, theme),
            position: "absolute",
            left: left + selectedWidth - 4,
            backgroundColor: colors.primary,
          }}
        />
      </div>
    </div>
  );
};

/**
 * The hovered column's readout: the category and each series' value.
 *
 * The card is the theme's surface, so it reads over the plot the way a tooltip
 * does elsewhere in the library.
 */
const ChartTooltip = ({
  series,
  labels,
  palette,
  theme,
  index,
  slot,
  box,
  pointer,
  format,
  indicator,
  tooltipIcons,
  labelFormat,
  testId,
}: {
  readonly series: ReadonlyArray<ChartSeries>;
  readonly labels: ReadonlyArray<string>;
  readonly palette: ReadonlyArray<string>;
  readonly theme: ReturnType<typeof useTheme>;
  readonly index: number;
  readonly slot: number;
  readonly box: ChartBox;
  /** The pointer, in plot coordinates, when the runtime reported one. */
  readonly pointer: Option.Option<Point>;
  readonly format: (value: number) => string;
  readonly indicator: TooltipIndicator;
  readonly tooltipIcons: ReadonlyArray<IconName> | undefined;
  readonly labelFormat: ((label: string) => string) | undefined;
  readonly testId: string | undefined;
}) => {
  const colors = themeColors(theme);
  const width = 132;
  const column = slot * index + slot / 2 - width / 2;
  const left = Option.match(pointer, {
    onNone: () => Math.max(0, Math.min(box.width - width, column)),
    onSome: (at) => Math.max(0, Math.min(box.width - width, at.x + 12)),
  });
  const top = Option.match(pointer, {
    onNone: () => 0,
    onSome: (at) => Math.max(0, Math.min(box.height - 64, at.y + 12)),
  });
  return (
    <div
      testId={testId === undefined ? undefined : `${testId}-tooltip`}
      style={{
        ...recipeStyle(CHART_TOOLTIP, theme),
        position: "absolute",
        left,
        top,
        width,
        pointerEvents: "none",
      }}
    >
      <text
        style={{
          ...recipeStyle(CHART_TOOLTIP_HEAD, theme),
          ...textStyle(theme, "caption"),
          color: colors.mutedForeground,
        }}
      >
        {Option.match(Option.fromNullishOr(labels[index]), {
          onNone: () => "",
          onSome: (label) =>
            labelFormat === undefined ? label : labelFormat(label),
        })}
      </text>
      {Arr.map(series, (one, seriesIndex) => (
        <div
          key={one.key}
          testId={
            testId === undefined ? undefined : `${testId}-tooltip-${one.key}`
          }
          style={recipeStyle(CHART_TOOLTIP_ROW, theme)}
        >
          {indicator === "none" ? undefined : indicator === "icon" ? (
            <Icon
              color={seriesColourOf(palette, one, seriesIndex)}
              name={tooltipIcon(tooltipIcons, seriesIndex)}
              size={12}
              testId={
                testId === undefined
                  ? undefined
                  : `${testId}-tooltip-icon-${one.key}`
              }
            />
          ) : (
            <div
              testId={
                testId === undefined
                  ? undefined
                  : `${testId}-tooltip-indicator-${one.key}`
              }
              style={{
                width: indicator === "line" ? 10 : 6,
                height: indicator === "line" ? 2 : 6,
                borderRadius: indicator === "line" ? 1 : 3,
                backgroundColor: seriesColourOf(palette, one, seriesIndex),
              }}
            />
          )}
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: colors.mutedForeground,
            }}
          >
            {seriesName(one.label, one.key)}
          </text>
          <text
            style={{
              ...recipeStyle(CHART_TOOLTIP_VALUE, theme),
              ...textStyle(theme, "caption"),
              color: colors.foreground,
            }}
          >
            {format(one.values[index] ?? 0)}
          </text>
        </div>
      ))}
    </div>
  );
};

/** The values a bar chart paints above its bars. */
const ValueLabels = ({
  labels,
  theme,
  testId,
}: {
  readonly labels: ReadonlyArray<ValueLabel>;
  readonly theme: ReturnType<typeof useTheme>;
  readonly testId: string | undefined;
}) => {
  const colors = themeColors(theme);
  return Arr.map(labels, (label) => (
    <text
      key={`${label.key}-${label.x}`}
      testId={testId === undefined ? undefined : `${testId}-value-${label.key}`}
      style={{
        ...recipeStyle(CHART_VALUE_LABEL, theme),
        position: "absolute",
        left: label.x,
        top: label.y,
        width: label.width,
        textAlign: "center",
        color: colors.mutedForeground,
      }}
    >
      {label.text}
    </text>
  ));
};
