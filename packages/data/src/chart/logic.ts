import { spokenText } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { flatMark, marksMarkup, num, type ChartMark } from "./mark.js";

export { type ChartMark } from "./mark.js";

export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly values: ReadonlyArray<number>;
  readonly color?: string;
}

export interface ChartBox {
  readonly width: number;
  readonly height: number;
}

const paintableSide = (side: number, fallback: number): number =>
  Number.isFinite(side) && side > 0
    ? side
    : Math.max(1, Number.isFinite(fallback) && fallback > 0 ? fallback : 1);

export const chartBox = (
  width: number,
  height: number,
  fallback: ChartBox,
): ChartBox => ({
  width: paintableSide(width, fallback.width),
  height: paintableSide(height, fallback.height),
});

export const drawableValue = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const paintedSlots = (categories?: number): Option.Option<number> =>
  Option.map(
    Option.filter(Option.fromNullishOr(categories), Number.isFinite),
    (count) => Math.max(0, Math.floor(count)),
  );

const slotIndexes = (count: number): ReadonlyArray<number> =>
  count <= 0 ? [] : Arr.makeBy(count, (index) => index);

const paintedValues = (
  values: ReadonlyArray<number>,
  categories?: number,
): ReadonlyArray<number> =>
  Option.match(paintedSlots(categories), {
    onNone: () => values,
    onSome: (count) => Arr.take(values, count),
  });

export const seriesMax = (series: ChartSeries, categories?: number): number =>
  Arr.reduce(paintedValues(series.values, categories), 0, (max, value) =>
    Math.max(max, drawableValue(value)),
  );

export const chartMaxOf = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number =>
  Arr.reduce(series, 0, (max, one) =>
    Math.max(max, seriesMax(one, categories)),
  );

/** Each divides by the axis's four intervals into a tick worth printing. */
const NICE_STEPS = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10] as const;

export const niceCeiling = (raw: number): number => {
  const value = drawableValue(raw);
  if (value === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude;
  const nice = Option.getOrElse(
    Arr.findFirst(NICE_STEPS, (candidate) => step <= candidate),
    () => 10,
  );
  return nice * magnitude;
};

export const chartScale = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number => niceCeiling(chartMaxOf(series, categories));

const categoryCount = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number =>
  Option.getOrElse(paintedSlots(categories), () =>
    Arr.reduce(series, 0, (most, one) => Math.max(most, one.values.length)),
  );

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

export const AXIS_STEP_LIMIT = 20;

const axisSteps = (count: number): number =>
  Number.isFinite(count)
    ? Math.min(AXIS_STEP_LIMIT, Math.max(1, Math.floor(count)))
    : 4;

export const axisTicks = (scale: number, count = 4): ReadonlyArray<number> => {
  const steps = axisSteps(count);
  return Arr.makeBy(steps + 1, (index) => (scale / steps) * index);
};

export const tickLabel = (tick: number, step: number): string => {
  if (!Number.isFinite(tick)) return "0";
  if (!Number.isFinite(step) || step <= 0) return `${tick}`;
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)) + 1);
  if (decimals > 20) return tick === 0 ? "0" : tick.toExponential(2);
  return `${Number(tick.toFixed(decimals))}`;
};

export interface BarSlot {
  readonly slot: number;
  readonly barWidth: number;
}

const slotCount = (count: number): number => Math.max(1, Math.floor(count));

export const barSlot = (count: number, width: number, share = 0.6): BarSlot => {
  const slot = Math.max(0, width) / slotCount(count);
  return { slot, barWidth: slot * Math.min(1, Math.max(0, share)) };
};

const barHeight = (value: number, box: ChartBox, scale: number): number => {
  if (scale <= 0) return 0;
  const raw = (drawableValue(value) / scale) * Math.max(0, box.height);
  return Math.min(Math.max(0, box.height), raw);
};

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

export const seriesName = (label: string, key: string): string =>
  spokenText(Option.fromNullishOr(label), key);

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
      // an absent label already follows.
      return P.isString(label) && label.trim().length > 0
        ? `${label} ${readout}`
        : readout;
    }),
    ", ",
  );
};

export const chartMarkup = (
  marks: ReadonlyArray<ChartMark>,
  box: ChartBox,
  clip?: ChartMark["clip"],
): string => {
  const flat = Arr.map(marks, (mark) => {
    const shape = flatMark(mark);
    return {
      ...shape,
      ...(clip === undefined ? {} : { clip }),
      // A stroked line stays unfilled: filling it paints a wedge across its chord.
      fill:
        shape.fill === undefined && shape.stroke === undefined
          ? { color: "#000" }
          : shape.fill,
    };
  });
  const painted = marksMarkup(flat);
  const defs = painted.defs.length === 0 ? "" : `<defs>${painted.defs}</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(box.width)}" height="${num(box.height)}" viewBox="0 0 ${num(box.width)} ${num(box.height)}">${defs}${painted.body}</svg>`;
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
