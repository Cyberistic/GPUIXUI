/**
 * Chart geometry, in pixels, as pure data.
 *
 * `@gpuix/native@0.11.0` has no chart host and no canvas, and an `<svg source>`
 * is rasterised into **one** tinted mask (`chart-raster` measured a five-layer
 * icon painting five colours as one). The route a chart takes is therefore
 * **stacked `<svg>` elements, one per series**, each carrying that series'
 * geometry in the same viewBox and tinted through `style.color`; the labels are
 * ordinary `<text>` beside the plot.
 *
 * Everything here is deterministic arithmetic over the caller's numbers: a
 * value that is not finite reads as `0`, a negative value paints nothing, and a
 * scale with no positive value still has a top of `1` so a bar chart of zeros
 * lays out instead of dividing by zero. A scale is measured over the **slots
 * the chart paints**: a value past the last label draws nowhere, so it cannot
 * raise the axis and shrink every painted bar.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One series: a stable key, its label, and one value per category. */
export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly values: ReadonlyArray<number>;
}

/** The plot's box, in pixels. */
export interface ChartBox {
  readonly width: number;
  readonly height: number;
}

/** One side of a plot: the caller's when it can paint, else the fallback. */
const paintableSide = (side: number, fallback: number): number =>
  Number.isFinite(side) && side > 0
    ? side
    : Math.max(1, Number.isFinite(fallback) && fallback > 0 ? fallback : 1);

/**
 * The plot box a chart lays out in, from the sides a caller gives.
 *
 * A side is often computed — a share of a pane, a measurement taken before the
 * first layout — and one the geometry cannot lay out (`NaN`, an infinity, zero
 * or a negative) reads as the fallback side. `Math.max(1, NaN)` is `NaN`, so an
 * unreadable width used to reach the `<svg>` viewBox, the axis column and every
 * category slot's width: the plot collapsed to `0 × 0` while the group kept its
 * name, and the labels lost their tracks. A finite positive side is kept as
 * given — a fractional width is paintable.
 */
export const chartBox = (
  width: number,
  height: number,
  fallback: ChartBox,
): ChartBox => ({
  width: paintableSide(width, fallback.width),
  height: paintableSide(height, fallback.height),
});

/** One painted shape, in the plot's pixel space. */
export type ChartMark =
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: "path"; readonly d: string };

/** A value the chart can draw: finite and not negative. */
export const drawableValue = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

/**
 * The number of slots a chart paints, when it names one.
 *
 * A count the chart cannot read is no count, so the caller's whole series is
 * measured. A finite count is the labelled slots, floored to a whole number and
 * never negative — and **zero stays zero**: a chart with no label paints no
 * slot. `Arr.makeBy` normalises a count to at least one, so the geometry has to
 * read the zero before it lays out any marks.
 */
const paintedSlots = (categories?: number): Option.Option<number> =>
  Option.map(
    Option.filter(Option.fromNullishOr(categories), Number.isFinite),
    (count) => Math.max(0, Math.floor(count)),
  );

/** `count` slot indexes, and none at all for a chart that paints no category. */
const slotIndexes = (count: number): ReadonlyArray<number> =>
  count <= 0 ? [] : Arr.makeBy(count, (index) => index);

/**
 * The values a series paints: only the labelled slots exist.
 *
 * A category the chart does not name draws nowhere, so it cannot raise the axis
 * either — a stray value past the last label would otherwise shrink every
 * painted bar towards a pixel while the axis named a value no slot shows. A
 * count the chart cannot read is no count, so the series is taken whole.
 */
const paintedValues = (
  values: ReadonlyArray<number>,
  categories?: number,
): ReadonlyArray<number> =>
  Option.match(paintedSlots(categories), {
    onNone: () => values,
    onSome: (count) => Arr.take(values, count),
  });

/** The largest drawable value in a series, over the slots it paints. */
export const seriesMax = (series: ChartSeries, categories?: number): number =>
  Arr.reduce(paintedValues(series.values, categories), 0, (max, value) =>
    Math.max(max, drawableValue(value)),
  );

/** The largest drawable value across every series, over the painted slots. */
export const chartMaxOf = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number =>
  Arr.reduce(series, 0, (max, one) =>
    Math.max(max, seriesMax(one, categories)),
  );

/**
 * A rounded ceiling above `raw`: 1, 2 or 5 times a power of ten.
 *
 * A chart's axis reads `0, 25, 50, 75, 100` for a maximum of 93 rather than
 * `0, 23.25, …`; the ceiling is a design decision, so it is one function.
 */
export const niceCeiling = (raw: number): number => {
  const value = drawableValue(raw);
  if (value === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return nice * magnitude;
};

/**
 * The scale a chart draws against: the rounded ceiling of every series.
 *
 * `categories` is the number of slots the chart paints — the labels it was
 * given. A value past the last label draws nowhere, so it cannot raise the axis
 * the painted bars are read against; without a count every value is measured,
 * which is what a chart with no labels paints.
 */
export const chartScale = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number => niceCeiling(chartMaxOf(series, categories));

/** How many category slots a series list spans, when the caller names none. */
const categoryCount = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number =>
  Option.getOrElse(paintedSlots(categories), () =>
    Arr.reduce(series, 0, (most, one) => Math.max(most, one.values.length)),
  );

/**
 * The scale a **stacked** chart draws against: the rounded ceiling of the
 * tallest painted category's total.
 *
 * A stack is read as one bar, so its axis is measured over the sums — a scale
 * taken from the widest single series would label a 120 total `100`, and every
 * bar in the plot would claim a value the axis does not name. `categories` is
 * the number of slots the chart paints: a value past the last label is drawn
 * nowhere, so it cannot raise the axis, and a chart that names no category
 * paints no slot at all — its ceiling is the empty chart's `1`.
 */
export const stackedScale = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number =>
  niceCeiling(
    Arr.reduce(
      Arr.map(slotIndexes(categoryCount(series, categories)), (index) =>
        Arr.reduce(
          series,
          0,
          (sum, one) => sum + drawableValue(one.values[index] ?? 0),
        ),
      ),
      0,
      Math.max,
    ),
  );

/** Evenly spaced axis values from `0` to `scale`, inclusive. */
export const axisTicks = (scale: number, count = 4): ReadonlyArray<number> => {
  const steps = Math.max(1, Math.floor(count));
  return Arr.makeBy(steps + 1, (index) => (scale / steps) * index);
};

/** The width of one category's slot and of the bar inside it. */
export interface BarSlot {
  readonly slot: number;
  readonly barWidth: number;
}

/** How many category slots a count spans: whole, and at least one. */
const slotCount = (count: number): number => Math.max(1, Math.floor(count));

/** The slot a bar chart gives each category. */
export const barSlot = (count: number, width: number, share = 0.6): BarSlot => {
  const slot = Math.max(0, width) / slotCount(count);
  return { slot, barWidth: slot * Math.min(1, Math.max(0, share)) };
};

/** The height one value paints, clamped into the box. */
const barHeight = (value: number, box: ChartBox, scale: number): number => {
  if (scale <= 0) return 0;
  const raw = (drawableValue(value) / scale) * Math.max(0, box.height);
  return Math.min(Math.max(0, box.height), raw);
};

/**
 * One bar per value, left to right, standing on the box's floor.
 *
 * A zero paints no bar (a bar of one pixel would claim a value the data does
 * not have); the layout keeps its slot, so the labels still line up. Only the
 * `categories` slots exist: a value past the last one draws nowhere.
 */
export const barMarks = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  scale: number,
  categories: number = values.length,
): ReadonlyArray<ChartMark> => {
  const { slot, barWidth } = barSlot(categories, box.width);
  return Arr.map(
    Arr.filter(
      Arr.map(paintedValues(values, categories), (value, index) => ({
        index,
        height: barHeight(value, box, scale),
      })),
      (one) => one.height > 0,
    ),
    (one): ChartMark => ({
      kind: "rect",
      x: one.index * slot + (slot - barWidth) / 2,
      y: box.height - one.height,
      width: barWidth,
      height: one.height,
    }),
  );
};

/**
 * Grouped bars: every series draws beside the others in each category slot.
 *
 * The group is centred in its slot, so three series still line up under one
 * label. A series with more values than there are slots paints only the
 * labelled ones; the rest draw nowhere.
 */
export const groupedBarMarks = (
  series: ReadonlyArray<ChartSeries>,
  box: ChartBox,
  scale: number,
  categories?: number,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const count = categoryCount(series, categories);
  const { slot } = barSlot(count, box.width);
  const width = series.length === 0 ? 0 : (slot * 0.8) / series.length;
  return Arr.map(series, (one, seriesIndex) =>
    Arr.map(
      Arr.filter(
        Arr.map(paintedValues(one.values, count), (value, index) => ({
          index,
          height: barHeight(value, box, scale),
        })),
        (candidate) => candidate.height > 0,
      ),
      (candidate): ChartMark => ({
        kind: "rect",
        x: candidate.index * slot + slot * 0.1 + seriesIndex * width,
        y: box.height - candidate.height,
        width,
        height: candidate.height,
      }),
    ),
  );
};

/**
 * Stacked bars: the first series stands on the floor and each later one stands
 * on the series before it.
 *
 * The stack's height is the sum, so the scale it draws against is
 * {@link stackedScale} — the one measure its axis prints. Passing the widest
 * single series' scale instead draws every stack against an axis that does not
 * name it.
 */
export const stackedBarMarks = (
  series: ReadonlyArray<ChartSeries>,
  box: ChartBox,
  scale: number,
  categories?: number,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const count = categoryCount(series, categories);
  const totals = Arr.map(slotIndexes(count), (index) =>
    Arr.reduce(
      series,
      0,
      (sum, one) => sum + drawableValue(one.values[index] ?? 0),
    ),
  );
  const { slot, barWidth } = barSlot(count, box.width, 0.7);
  return Arr.map(series, (_, seriesIndex) =>
    Arr.map(
      Arr.filter(
        Arr.map(totals, (_, index) => {
          // The height of everything below this series in the same slot.
          const below = Arr.reduce(
            Arr.take(series, seriesIndex),
            0,
            (sum, one) => sum + drawableValue(one.values[index] ?? 0),
          );
          const value = drawableValue(series[seriesIndex]?.values[index] ?? 0);
          const height = barHeight(value, box, scale);
          return {
            index,
            height,
            base: barHeight(below + value, box, scale),
          };
        }),
        (candidate) => candidate.height > 0,
      ),
      (candidate): ChartMark => ({
        kind: "rect",
        x: candidate.index * slot + (slot - barWidth) / 2,
        y: box.height - candidate.base,
        width: barWidth,
        height: candidate.height,
      }),
    ),
  );
};

/** A number as the markup spells it: at most two decimals, no `NaN`. */
const num = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 100) / 100}` : "0";

/**
 * The path through a series' points, left to right.
 *
 * A point sits at the **centre of its category slot**, which is where a bar
 * stands and where the label under it is centred. Spacing the path edge to
 * edge instead (`0 … width`) put the first and last points half a slot away
 * from their own labels, and measured a two-value series across the whole plot
 * while the axis named four categories. A value past the last category draws
 * nowhere, the rule the bars follow.
 *
 * A single value paints a half-pixel run rather than a zero-length path, which
 * some rasterisers drop; an empty series paints nothing.
 */
export const linePath = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  scale: number,
  categories: number = values.length,
): Option.Option<string> => {
  const painted = paintedValues(values, categories);
  if (painted.length === 0) return Option.none();
  const { slot } = barSlot(
    Option.getOrElse(paintedSlots(categories), () => values.length),
    box.width,
  );
  const points = Arr.map(painted, (value, index) => ({
    x: index * slot + slot / 2,
    y: box.height - barHeight(value, box, scale),
  }));
  const path = Arr.join(
    Arr.map(
      points,
      (point, index) =>
        `${index === 0 ? "M" : "L"}${num(point.x)} ${num(point.y)}`,
    ),
    "",
  );
  return Option.some(painted.length === 1 ? `${path}h1` : path);
};

/** The ring segment between two angles, in radians. */
const arcPath = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string => {
  const point = (radius: number, angle: number): string =>
    `${num(cx + radius * Math.cos(angle))} ${num(cy + radius * Math.sin(angle))}`;
  const span = end - start;
  const large = span > Math.PI ? 1 : 0;
  return [
    `M${point(outer, start)}`,
    `A${num(outer)} ${num(outer)} 0 ${large} 1 ${point(outer, end)}`,
    `L${point(inner, end)}`,
    `A${num(inner)} ${num(inner)} 0 ${large} 0 ${point(inner, start)}`,
    "Z",
  ].join("");
};

/**
 * Ring segments, one entry per **datum**, in data order.
 *
 * The entry holds the marks that datum paints: usually one segment, and two
 * halves when a single value fills the ring — an arc from an angle to itself is
 * empty, so a full turn is drawn as two half turns. A value that is zero,
 * negative or not a number paints nothing, so its entry is empty and its slice
 * keeps no slot.
 */
export const donutSegments = (
  values: ReadonlyArray<number>,
  box: ChartBox,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const drawable = Arr.map(values, drawableValue);
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  if (total <= 0) return Arr.map(values, () => []);
  const size = Math.min(box.width, box.height);
  const cx = box.width / 2;
  const cy = box.height / 2;
  const outer = size / 2;
  const inner = outer * 0.6;
  const start = -Math.PI / 2;
  const full = Math.PI * 2;

  const [, segments] = Arr.mapAccum(
    drawable,
    start,
    (angle, value): readonly [number, ReadonlyArray<ChartMark>] => {
      if (value <= 0) return [angle, []];
      const span = (value / total) * full;
      if (span >= full - 1e-9) {
        return [
          angle + full,
          [
            {
              kind: "path",
              d: arcPath(cx, cy, outer, inner, angle, angle + Math.PI),
            },
            {
              kind: "path",
              d: arcPath(cx, cy, outer, inner, angle + Math.PI, angle + full),
            },
          ],
        ];
      }
      return [
        angle + span,
        [
          {
            kind: "path",
            d: arcPath(cx, cy, outer, inner, angle, angle + span),
          },
        ],
      ];
    },
  );
  return segments;
};

/** Every ring segment, flattened — a donut chart's marks in one list. */
export const donutMarks = (
  values: ReadonlyArray<number>,
  box: ChartBox,
): ReadonlyArray<ChartMark> => Arr.flatten(donutSegments(values, box));

/**
 * The words a series paints, category by category.
 *
 * A chart is a picture of numbers, and the accessibility tree has no way to
 * read a picture: without this line a series image is named by its label alone
 * and every value it draws — the thing the chart exists for — is silent. A
 * category is read as `label value` (`Q1 32`), a value with no label as the
 * number alone, and a value that is not a number as `no value` rather than the
 * zero the geometry substitutes — a reader should not be told a datum is zero
 * when the caller never supplied one.
 */
export const seriesDescription = (
  values: ReadonlyArray<number>,
  labels: ReadonlyArray<string> = [],
): string => {
  const count = labels.length === 0 ? values.length : labels.length;
  return Arr.join(
    Arr.map(Arr.take(values, count), (value, index) => {
      const readout = Number.isFinite(value)
        ? `${Math.round(value * 100) / 100}`
        : "no value";
      const label = labels[index];
      return label === undefined ? readout : `${label} ${readout}`;
    }),
    ", ",
  );
};

/** The SVG document one series paints, tinted by the element's `color`. */
export const chartMarkup = (
  marks: ReadonlyArray<ChartMark>,
  box: ChartBox,
): string => {
  const shapes = Arr.map(marks, (mark) =>
    mark.kind === "rect"
      ? `<rect x="${num(mark.x)}" y="${num(mark.y)}" width="${num(mark.width)}" height="${num(mark.height)}" fill="#000"/>`
      : `<path d="${mark.d}" fill="#000"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(box.width)}" height="${num(box.height)}" viewBox="0 0 ${num(box.width)} ${num(box.height)}">${Arr.join(shapes, "")}</svg>`;
};

/** The colour a series paints: the categorical scale, cycling. */
export const seriesColour = (
  palette: ReadonlyArray<string>,
  index: number,
): string => {
  if (palette.length === 0) return "#000000";
  const at =
    ((Math.floor(index) % palette.length) + palette.length) % palette.length;
  return palette[at] ?? "#000000";
};
