/**
 * Chart geometry beyond the first charts: a signed axis, curves, areas, radar,
 * radial rings and horizontal bars.
 *
 * These are pure functions over the caller's numbers, like `./logic.ts`, and
 * they paint into the same one-tint-per-`<svg>` model: a stroke keeps the
 * markup's own coverage (`svg-pattern` measured a stroked square painting its
 * stroke), and opacity is an element style, so a fade is a stack of clipped
 * area bands rather than a gradient element.
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ChartBox, ChartMark, ChartSeries } from "./logic.js";

/** A point in the plot's pixel space. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** How a line joins its points. */
export type Curve = "linear" | "smooth" | "step";

/** A signed scale: the smallest and largest value a chart draws. */
export interface ChartRange {
  readonly min: number;
  readonly max: number;
}

/** A number the geometry can place: anything else reads as zero. */
export const finite = (value: number): number =>
  Number.isFinite(value) ? value : 0;

/** How many slots the chart paints: the labels it was given, else the data. */
const slotCount = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
): number => {
  if (categories !== undefined && Number.isFinite(categories)) {
    return Math.max(0, Math.floor(categories));
  }
  return Arr.reduce(series, 0, (most, one) =>
    Math.max(most, one.values.length),
  );
};

/** The values a series paints: only the labelled slots exist. */
const paintedValues = (
  values: ReadonlyArray<number>,
  categories?: number,
): ReadonlyArray<number> =>
  categories === undefined || !Number.isFinite(categories)
    ? values
    : Arr.take(values, Math.max(0, Math.floor(categories)));

/**
 * A rounded step above a positive number, or below a negative one.
 *
 * The negative floor is the positive ceiling mirrored, so a `-93` axis reaches
 * `-100` and the plot's floor and ceiling are the same kind of number.
 */
export const niceBound = (raw: number): number => {
  const value = Math.abs(finite(raw));
  if (value === 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return (raw < 0 ? -1 : 1) * nice * magnitude;
};

/**
 * The range a signed chart draws against.
 *
 * A chart of positives starts at zero; a negative value widens the range down
 * to its own rounded floor, so a negative bar has a floor to stand under. A
 * chart with no drawable value still spans `0…1`, so an empty plot lays out
 * instead of dividing by zero.
 */
export const chartRange = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
  stacked = false,
): ChartRange => {
  const values = Arr.flatten(
    Arr.map(series, (one) => paintedValues(one.values, categories)),
  );
  const totals =
    stacked && series.length > 1
      ? [
          Arr.reduce(
            Arr.map(
              Arr.makeBy(slotCount(series, categories), (index) => index),
              (index) =>
                Arr.reduce(
                  series,
                  0,
                  (sum, one) =>
                    sum + Math.max(0, finite(one.values[index] ?? 0)),
                ),
            ),
            0,
            Math.max,
          ),
        ]
      : [];
  const highest = (input: ReadonlyArray<number>): number =>
    Arr.reduce(input, 0, (most, value) => Math.max(most, value));
  const max = niceBound(Math.max(highest(values), highest(totals), 0));
  const min = niceBound(
    Arr.reduce(values, 0, (least, value) => Math.min(least, value)),
  );
  return { min: Math.min(0, min), max: Math.max(max > 0 ? max : 1, 0) };
};

/** The plot's height a value sits at on a signed axis. */
export const scaleY = (
  value: number,
  box: ChartBox,
  range: ChartRange,
): number => {
  const span = range.max - range.min;
  if (span <= 0) return box.height;
  return box.height - ((finite(value) - range.min) / span) * box.height;
};

/** The plot's x a value sits at on a horizontal axis. */
export const scaleX = (
  value: number,
  box: ChartBox,
  range: ChartRange,
): number => {
  const span = range.max - range.min;
  if (span <= 0) return 0;
  return ((finite(value) - range.min) / span) * box.width;
};

/** The y where a signed axis crosses zero. */
export const zeroY = (box: ChartBox, range: ChartRange): number =>
  scaleY(0, box, range);

/**
 * A series' points, one per labelled category, at the slot centres.
 *
 * A point sits where a bar stands and where the label under it is centred —
 * the rule the first line chart follows, so a line and a bar read the same
 * category the same way.
 */
export const seriesPoints = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  range: ChartRange,
  categories?: number,
  view?: ChartView,
): ReadonlyArray<Point> => {
  const painted = paintedValues(values, categories);
  const count = slotCount(
    [{ key: "", label: "", values: painted }],
    categories ?? painted.length,
  );
  const span = view === undefined ? count : view.end - view.start;
  const slot = span <= 0 ? 0 : box.width / span;
  const offset = view === undefined ? 0 : view.start;
  return Arr.map(painted, (value, index) => ({
    x: (index + 0.5 - offset) * slot,
    y: scaleY(value, box, range),
  }));
};

/** A number as the markup spells it. */
const at = (value: number): string =>
  `${Math.round((Number.isFinite(value) ? value : 0) * 100) / 100}`;

/** A point as a path command spells it. */
const pair = (point: Point): string => `${at(point.x)} ${at(point.y)}`;

/**
 * The path through points, in the join the caller asked for.
 *
 * `smooth` is a Catmull-Rom spline written as cubics, which passes through
 * every point (a Bezier that only approached them would put a dot off its own
 * value). `step` holds each value until the next one, the step chart's shape.
 * A single point paints a half-pixel run rather than a zero-length path some
 * rasterisers drop.
 */
export const curvePath = (
  points: ReadonlyArray<Point>,
  curve: Curve,
): Option.Option<string> => {
  const first = Arr.head(points);
  if (Option.isNone(first)) return Option.none();
  if (points.length === 1) {
    return Option.some(`M${pair(first.value)}h1`);
  }
  const [head, ...rest] = points;
  if (head === undefined) return Option.none();
  const body = Arr.map(rest, (point, index) => {
    const previous = points[index];
    if (previous === undefined) return "";
    return Match.value(curve).pipe(
      Match.when("step", () => `H${at(point.x)}V${at(point.y)}`),
      Match.when("smooth", () => {
        const before = points[index - 1] ?? previous;
        const after = points[index + 2] ?? point;
        const c1 = {
          x: previous.x + (point.x - before.x) / 6,
          y: previous.y + (point.y - before.y) / 6,
        };
        const c2 = {
          x: point.x - (after.x - previous.x) / 6,
          y: point.y - (after.y - previous.y) / 6,
        };
        return `C${pair(c1)} ${pair(c2)} ${pair(point)}`;
      }),
      Match.when("linear", () => `L${pair(point)}`),
      Match.exhaustive,
    );
  });
  return Option.some(`M${pair(head)}${Arr.join(body, "")}`);
};

/** The closed shape under a line, down to the axis' zero. */
export const areaPath = (
  points: ReadonlyArray<Point>,
  box: ChartBox,
  range: ChartRange,
  curve: Curve,
): Option.Option<string> =>
  Option.map(curvePath(points, curve), (line) => {
    const last = Arr.last(points);
    const first = Arr.head(points);
    if (Option.isNone(last) || Option.isNone(first)) return line;
    const floor = zeroY(box, range);
    return `${line}L${at(last.value.x)} ${at(floor)}L${at(first.value.x)} ${at(floor)}Z`;
  });

/**
 * The area clipped above one horizontal cut, as a closed path.
 *
 * The clip is arithmetic, not a `clipPath`: the polyline is walked segment by
 * segment and each crossing is interpolated, so the band's top edge follows the
 * line exactly. It is what lets a fade be a stack of nested bands.
 */
export const clipArea = (
  points: ReadonlyArray<Point>,
  cut: number,
  floor: number,
): Option.Option<string> => {
  const kept: Array<Point> = [];
  Arr.forEach(points, (point, index) => {
    const previous = points[index - 1];
    if (previous !== undefined) {
      const above = previous.y <= cut;
      const below = point.y <= cut;
      if (above !== below) {
        const t = (cut - previous.y) / (point.y - previous.y);
        kept.push({
          x: previous.x + (point.x - previous.x) * t,
          y: cut,
        });
      }
    }
    if (point.y <= cut) kept.push(point);
  });
  if (kept.length === 0) return Option.none();
  const first = Arr.head(kept);
  const last = Arr.last(kept);
  if (Option.isNone(first) || Option.isNone(last)) return Option.none();
  return Option.some(
    `M${pair(first.value)}${Arr.join(
      Arr.map(Arr.drop(kept, 1), (point) => `L${pair(point)}`),
      "",
    )}L${at(last.value.x)} ${at(floor)}L${at(first.value.x)} ${at(floor)}Z`,
  );
};

/**
 * The nested bands a faded area fill is painted in.
 *
 * Band `k` is the whole area above the k-th horizontal cut, so the region
 * nearest the line is covered by every band and the region near the baseline by
 * one: equal opacity on each band fades the fill toward the axis.
 */
export const areaBands = (
  points: ReadonlyArray<Point>,
  box: ChartBox,
  range: ChartRange,
  bands: number,
): ReadonlyArray<string> => {
  const steps = Math.max(1, Math.min(6, Math.floor(bands)));
  const top = 0;
  const floor = zeroY(box, range);
  const span = floor - top;
  if (span <= 0) return [];
  return Arr.flatMap(
    Arr.makeBy(steps, (index) => index + 1),
    (index) =>
      Option.match(clipArea(points, top + (span * index) / steps, floor), {
        onNone: () => [],
        onSome: (d): ReadonlyArray<string> => [d],
      }),
  );
};

/** Dots at each painted point. */
export const pointMarks = (
  points: ReadonlyArray<Point>,
  radius: number,
): ReadonlyArray<ChartMark> =>
  Arr.map(
    points,
    (point): ChartMark => ({
      kind: "circle",
      cx: point.x,
      cy: point.y,
      r: Math.max(1, radius),
    }),
  );

/**
 * Bars from the zero line, up or down, with rounded corners.
 *
 * A negative value stands below the axis instead of a zero-height bar claiming
 * it; the corner is the bar's own, so a group still reads as one shape.
 */
export const barMarksInRange = (
  series: ReadonlyArray<ChartSeries>,
  box: ChartBox,
  range: ChartRange,
  categories?: number,
  radius = 0,
  view?: ChartView,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const count = slotCount(series, categories);
  if (count === 0) return Arr.map(series, () => []);
  const span = view === undefined ? count : view.end - view.start;
  const slot = box.width / Math.max(1, span);
  const offset = view === undefined ? 0 : view.start;
  const width =
    series.length === 0 ? 0 : Math.max(1, (slot * 0.8) / series.length);
  const zero = zeroY(box, range);
  return Arr.map(series, (one, seriesIndex) =>
    Arr.flatMap(
      Arr.map(paintedValues(one.values, categories), (value, index) => ({
        value,
        x: (index + 0.1 - offset) * slot + seriesIndex * width,
      })),
      (cell: {
        readonly value: number;
        readonly x: number;
      }): ReadonlyArray<ChartMark> => {
        const y = scaleY(cell.value, box, range);
        const height = Math.abs(y - zero);
        if (!Number.isFinite(cell.value) || height < 0.5) return [];
        return [
          {
            kind: "rect" as const,
            x: cell.x,
            y: Math.min(y, zero),
            width,
            height,
            rx: Math.min(radius, width / 2, height / 2),
          },
        ];
      },
    ),
  );
};

/** Horizontal bars: one row per category, from the zero line rightwards. */
export const horizontalBarMarks = (
  series: ReadonlyArray<ChartSeries>,
  box: ChartBox,
  range: ChartRange,
  categories?: number,
  radius = 0,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const count = slotCount(series, categories);
  if (count === 0) return Arr.map(series, () => []);
  const slot = box.height / count;
  const height =
    series.length === 0 ? 0 : Math.max(1, (slot * 0.8) / series.length);
  const zero = scaleX(0, box, range);
  return Arr.map(series, (one, seriesIndex) =>
    Arr.flatMap(
      Arr.map(paintedValues(one.values, categories), (value, index) => ({
        value,
        y: index * slot + slot * 0.1 + seriesIndex * height,
      })),
      (cell: {
        readonly value: number;
        readonly y: number;
      }): ReadonlyArray<ChartMark> => {
        const x = scaleX(cell.value, box, range);
        const barWidth = Math.abs(x - zero);
        if (!Number.isFinite(cell.value) || barWidth < 0.5) return [];
        return [
          {
            kind: "rect" as const,
            x: Math.min(x, zero),
            y: cell.y,
            width: barWidth,
            height,
            rx: Math.min(radius, barWidth / 2, height / 2),
          },
        ];
      },
    ),
  );
};

/** The radius a radar paints in: the caller's, clamped to the box. */
const clampRadius = (reach: number | undefined, fallback: number): number =>
  reach === undefined || !Number.isFinite(reach)
    ? fallback
    : Math.max(0, Math.min(fallback * 2 + 4, reach));

/** The corner a radar runs to for one value, clockwise from twelve o'clock. */
const radarPoint = (
  value: number,
  index: number,
  axes: number,
  box: ChartBox,
  max: number,
  outerRadius?: number,
): Point => {
  const cx = box.width / 2;
  const cy = box.height / 2;
  const radius = clampRadius(
    outerRadius,
    Math.max(0, Math.min(box.width, box.height) / 2 - 4),
  );
  const angle = -Math.PI / 2 + (index / Math.max(1, axes)) * Math.PI * 2;
  const reach = max <= 0 ? 0 : (Math.max(0, finite(value)) / max) * radius;
  return {
    x: cx + reach * Math.cos(angle),
    y: cy + reach * Math.sin(angle),
  };
};

/**
 * One series' radar outline: a closed polygon through its axes.
 *
 * A radar point sits where its axis is, not where its slot would be, so a
 * series keeps its shape as the label list grows.
 */
export const radarPoints = (
  values: ReadonlyArray<number>,
  axes: number,
  box: ChartBox,
  max: number,
  radius?: number,
): ReadonlyArray<Point> =>
  Arr.makeBy(axes, (index) =>
    radarPoint(values[index] ?? 0, index, axes, box, max, radius),
  );

/** A closed polygon through points. */
export const polygonPath = (
  points: ReadonlyArray<Point>,
): Option.Option<string> =>
  Option.map(Arr.head(points), (first) => {
    return `M${pair(first)}${Arr.join(
      Arr.map(Arr.drop(points, 1), (point) => `L${pair(point)}`),
      "",
    )}Z`;
  });

/** The webs a radar is read against: one closed ring per level. */
export const radarGrid = (
  levels: number,
  axes: number,
  box: ChartBox,
  max = 1,
  radius?: number,
): ReadonlyArray<string> => {
  const steps = Math.max(1, Math.min(8, Math.floor(levels)));
  return Arr.flatMap(
    Arr.makeBy(steps, (index) => index + 1),
    (level) =>
      Option.match(
        polygonPath(
          Arr.makeBy(axes, (axis) =>
            radarPoint((max * level) / steps, axis, axes, box, max, radius),
          ),
        ),
        {
          onNone: () => [],
          onSome: (d): ReadonlyArray<string> => [d],
        },
      ),
  );
};

/**
 * The webs at the radii a caller names, as fractions of the outer radius.
 *
 * A custom grid is what shadcn's grid-custom example draws: the ticks are the
 * caller's numbers, not an even split of the levels.
 */
export const radarGridAt = (
  fractions: ReadonlyArray<number>,
  axes: number,
  box: ChartBox,
  max = 1,
  radius?: number,
): ReadonlyArray<string> =>
  Arr.flatMap(fractions, (fraction) => {
    const share = Math.max(0, Math.min(1, fraction));
    if (share <= 0) return [];
    const reach =
      clampRadius(
        radius,
        Math.max(0, Math.min(box.width, box.height) / 2 - 4),
      ) * share;
    return Option.match(
      polygonPath(
        Arr.makeBy(axes, (axis) =>
          radarPoint(max, axis, axes, box, max, reach),
        ),
      ),
      {
        onNone: () => [],
        onSome: (d): ReadonlyArray<string> => [d],
      },
    );
  });

/** The circular webs at the fractions a caller names. */
export const radarCircleGridAt = (
  fractions: ReadonlyArray<number>,
  box: ChartBox,
  radius?: number,
): ReadonlyArray<string> => {
  const reach = clampRadius(
    radius,
    Math.max(0, Math.min(box.width, box.height) / 2 - 4),
  );
  return Arr.flatMap(fractions, (fraction) => {
    const share = Math.max(0, Math.min(1, fraction));
    return share <= 0
      ? []
      : [circlePath(box.width / 2, box.height / 2, reach * share)];
  });
};

/** The spoke from the centre to each radar axis' rim. */
export const radarSpokes = (
  axes: number,
  box: ChartBox,
  max = 1,
  radius?: number,
): ReadonlyArray<string> =>
  Arr.makeBy(axes, (axis) => {
    const rim = radarPoint(max, axis, axes, box, max, radius);
    return `M${pair({ x: box.width / 2, y: box.height / 2 })}L${pair(rim)}`;
  });

/** A full circle as one path: two half turns, because an arc to itself is empty. */
export const circlePath = (cx: number, cy: number, radius: number): string =>
  `M${at(cx - radius)} ${at(cy)}A${at(radius)} ${at(radius)} 0 1 0 ${at(cx + radius)} ${at(cy)}A${at(radius)} ${at(radius)} 0 1 0 ${at(cx - radius)} ${at(cy)}Z`;

/**
 * The rings a circular radar grid draws: one circle per level.
 *
 * A circular grid reads a radar the way a bullseye does — every level is the
 * same distance from the centre whichever axis it crosses — where the polygon
 * grid follows the axes' corners.
 */
export const radarCircleGrid = (
  levels: number,
  box: ChartBox,
  reach?: number,
): ReadonlyArray<string> => {
  const steps = Math.max(1, Math.min(8, Math.floor(levels)));
  const radius = clampRadius(
    reach,
    Math.max(0, Math.min(box.width, box.height) / 2 - 4),
  );
  return Arr.makeBy(steps, (index) =>
    circlePath(box.width / 2, box.height / 2, (radius * (index + 1)) / steps),
  );
};

/** The full ring a radial track paints, from twelve o'clock. */
export const fullRing = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
): string =>
  `${ringArc(cx, cy, outer, inner, -Math.PI / 2, 0)}${ringArc(cx, cy, outer, inner, 0, (Math.PI * 3) / 2)}`;

/** The ring segment between two angles, in radians. */
export const ringArc = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string => {
  const point = (radius: number, angle: number): string =>
    `${at(cx + radius * Math.cos(angle))} ${at(cy + radius * Math.sin(angle))}`;
  const span = Math.abs(end - start);
  const large = span > Math.PI ? 1 : 0;
  return [
    `M${point(outer, start)}`,
    `A${at(outer)} ${at(outer)} 0 ${large} 1 ${point(outer, end)}`,
    `L${point(inner, end)}`,
    `A${at(inner)} ${at(inner)} 0 ${large} 0 ${point(inner, start)}`,
    "Z",
  ].join("");
};

/**
 * Concentric radial bars: datum `i` is a ring of its own, filled to its share.
 *
 * A full turn is two half turns, because an arc from an angle to itself is
 * empty; a zero paints no arc but keeps its ring in the stack.
 */
export const radialArcs = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  max: number,
  thickness = 10,
  gap = 4,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const cx = box.width / 2;
  const cy = box.height / 2;
  const outer = Math.max(0, Math.min(box.width, box.height) / 2 - 1);
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  return Arr.map(values, (value, index) => {
    const ringOuter = outer - index * (thickness + gap);
    const ringInner = ringOuter - thickness;
    if (ringOuter <= 0 || ringInner < 0) return [];
    const share = max <= 0 ? 0 : Math.max(0, finite(value)) / max;
    const span = share * full;
    if (span <= 0) return [];
    if (span >= full - 1e-9) {
      return [
        {
          kind: "path" as const,
          d: ringArc(cx, cy, ringOuter, ringInner, start, start + Math.PI),
        },
        {
          kind: "path" as const,
          d: ringArc(
            cx,
            cy,
            ringOuter,
            ringInner,
            start + Math.PI,
            start + full,
          ),
        },
      ];
    }
    return [
      {
        kind: "path" as const,
        d: ringArc(cx, cy, ringOuter, ringInner, start, start + span),
      },
    ];
  });
};

/**
 * Ring segments for a pie or a donut, one entry per datum.
 *
 * `innerRatio` is the hole as a share of the radius (`0` is a pie), and
 * `padAngle` is the gap between slices in radians — the separator shadcn's pie
 * examples draw with a stroke, painted here as space.
 */
export const ringSegments = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  innerRatio = 0,
  padAngle = 0,
  emphasis?: number,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const drawable = Arr.map(values, (value) => Math.max(0, finite(value)));
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  if (total <= 0) return Arr.map(values, () => []);
  const size = Math.min(box.width, box.height);
  const cx = box.width / 2;
  const cy = box.height / 2;
  const outer = size / 2;
  const inner = outer * Math.min(0.95, Math.max(0, innerRatio));
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  const gap = Math.min(
    Math.max(0, padAngle),
    (full * 0.4) / Math.max(1, drawable.length),
  );
  const [, segments] = Arr.mapAccum(drawable, start, (angle, value) => {
    if (value <= 0) return [angle, []];
    const span = (value / total) * full;
    const from = angle + gap / 2;
    const to = angle + span - gap / 2;
    if (to <= from) return [angle + span, []];
    const index = Math.max(
      0,
      Math.round(((angle - start) / Math.max(1e-9, full)) * drawable.length),
    );
    // The active slice stands proud of the ring, the press cue shadcn's active
    // example paints.
    const rim = index === emphasis ? outer + 6 : outer;
    if (span >= full - 1e-9) {
      return [
        angle + full,
        [
          {
            kind: "path" as const,
            d: ringArc(cx, cy, rim, inner, from, from + Math.PI),
          },
          {
            kind: "path" as const,
            d: ringArc(cx, cy, rim, inner, from + Math.PI, from + full),
          },
        ],
      ];
    }
    return [
      angle + span,
      [{ kind: "path" as const, d: ringArc(cx, cy, rim, inner, from, to) }],
    ];
  });
  return segments;
};

/**
 * Where a slice's label sits: the middle of its arc, inside the ring.
 *
 * A label is placed from the same cumulative angles the slices are, so it
 * follows a datum when its neighbours change size.
 */
export const ringLabelPoints = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  innerRatio = 0,
): ReadonlyArray<Option.Option<Point>> => {
  const drawable = Arr.map(values, (value) => Math.max(0, finite(value)));
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  const size = Math.min(box.width, box.height);
  const outer = size / 2;
  const reach = (outer + outer * innerRatio) / 2;
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  const [, points] = Arr.mapAccum(drawable, start, (angle, value) => {
    if (total <= 0 || value <= 0) return [angle, Option.none()];
    const span = (value / total) * full;
    const middle = angle + span / 2;
    return [
      angle + span,
      Option.some({
        x: box.width / 2 + reach * Math.cos(middle),
        y: box.height / 2 + reach * Math.sin(middle),
      }),
    ];
  });
  return points;
};

/** Where a slice's outside label sits, and the line that leads to it. */
export interface RingLabel {
  /** The label's anchor point, past the ring's rim. */
  readonly point: Point;
  /** Whether the label runs to the right of its anchor. */
  readonly right: boolean;
  /** The leader from the slice's rim to the label's anchor. */
  readonly leader: string;
}

/**
 * The outside labels a pie draws: one anchor and one leader per slice.
 *
 * The anchor sits past the rim on the slice's mid-angle, then steps out
 * horizontally, so two labels on the same side never collide; the leader is the
 * elbow from the rim to that anchor.
 */
export const ringOutsideLabels = (
  values: ReadonlyArray<number>,
  box: ChartBox,
): ReadonlyArray<Option.Option<RingLabel>> => {
  const drawable = Arr.map(values, (value) => Math.max(0, finite(value)));
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  const size = Math.min(box.width, box.height);
  const outer = size / 2;
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  const step = 14;
  const [, labels] = Arr.mapAccum(drawable, start, (angle, value) => {
    if (total <= 0 || value <= 0) return [angle, Option.none()];
    const span = (value / total) * full;
    const middle = angle + span / 2;
    const right = Math.cos(middle) >= 0;
    const rimX = box.width / 2 + (outer - 2) * Math.cos(middle);
    const rimY = box.height / 2 + (outer - 2) * Math.sin(middle);
    const elbowX = box.width / 2 + (outer + step) * Math.cos(middle);
    const elbowY = box.height / 2 + (outer + step) * Math.sin(middle);
    const anchorX = elbowX + (right ? step : -step);
    return [
      angle + span,
      Option.some({
        point: { x: anchorX, y: elbowY },
        right,
        leader: `M${at(rimX)} ${at(rimY)}L${at(elbowX)} ${at(elbowY)}L${at(anchorX)} ${at(elbowY)}`,
      } satisfies RingLabel),
    ];
  });
  return labels;
};

/** A continuous window over the category axis, in category units. */
export interface ChartView {
  readonly start: number;
  readonly end: number;
}

/**
 * The continuous window a zoom or a pan shows.
 *
 * Edges are fractional category positions; a span under one category is
 * widened to one, and the window is clamped inside `[0, length]` — a zoom stops
 * when a single category fills the plot. A view that names nothing readable is
 * no view, and the chart paints every category.
 */
export const chartView = (
  length: number,
  view: readonly [number, number] | undefined,
): Option.Option<ChartView> => {
  if (view === undefined || length <= 0) return Option.none();
  const [left, right] = view;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Option.none();
  const low = Math.min(left, right);
  const high = Math.max(left, right);
  const end = Math.min(length, Math.max(low + 1, high));
  const start = Math.max(0, Math.min(end - 1, low));
  return Option.some({ start, end });
};

/** A window over the plotted categories: `[start, end)` indexes. */
export interface ChartWindow {
  readonly start: number;
  readonly end: number;
}

/**
 * The category window a chart draws, clamped to what the data has.
 *
 * A brush reports the two edges as indexes into the label list; a stored one
 * may be reversed, fractional, past the end or unreadable, so the window is
 * normalized: whole indexes, inside the list, and at least one category wide.
 * A window that leaves nothing (both edges past the end, or the chart has no
 * categories) is no window at all — the chart paints what it was given.
 */
export const chartWindow = (
  length: number,
  domain: readonly [number, number] | undefined,
): Option.Option<ChartWindow> => {
  if (domain === undefined || length <= 0) return Option.none();
  const [left, right] = domain;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Option.none();
  const edgeLow = Math.min(left, right);
  const edgeHigh = Math.max(left, right);
  if (edgeHigh <= 0 || edgeLow >= length) return Option.none();
  const low = Math.max(
    0,
    Math.min(length - 1, Math.floor(Math.min(left, right))),
  );
  const high = Math.max(
    low + 1,
    Math.min(length, Math.ceil(Math.max(left, right))),
  );
  if (high <= 0 || low >= length) return Option.none();
  return Option.some({ start: low, end: high });
};

/**
 * Concentric pie bands: one ring per datum, each arc its own share.
 *
 * A stacked pie reads as a sunburst — the first datum owns the outer band, the
 * next one the band inside it, and so on to the hole — so the reader compares
 * shares by arc length at nested radii instead of by one ring's slices. A zero
 * keeps its band and paints no arc, the rule the flat ring follows.
 */
export const ringBands = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  innerRatio = 0,
  padAngle = 0,
  emphasis?: number,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const drawable = Arr.map(values, (value) => Math.max(0, finite(value)));
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  if (total <= 0) return Arr.map(values, () => []);
  const size = Math.min(box.width, box.height);
  const cx = box.width / 2;
  const cy = box.height / 2;
  const outer = size / 2;
  const inner = outer * Math.min(0.95, Math.max(0, innerRatio));
  const bands = Math.max(1, drawable.length);
  const band = (outer - inner) / bands;
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  const gap = Math.min(
    Math.max(0, padAngle),
    (full * 0.4) / Math.max(1, drawable.length),
  );
  return Arr.map(drawable, (value, index) => {
    if (value <= 0) return [];
    const rim = outer - index * band + (index === emphasis ? 4 : 0);
    const floor = Math.max(0, rim - band);
    const span = (value / total) * full;
    const from = start + gap / 2;
    const to = start + span - gap / 2;
    if (to <= from) return [];
    if (span >= full - 1e-9) {
      return [
        {
          kind: "path" as const,
          d: ringArc(cx, cy, rim, floor, from, from + Math.PI),
        },
        {
          kind: "path" as const,
          d: ringArc(cx, cy, rim, floor, from + Math.PI, from + full),
        },
      ];
    }
    return [
      { kind: "path" as const, d: ringArc(cx, cy, rim, floor, from, to) },
    ];
  });
};

/** A value as a label prints it: at most one decimal, never `NaN`. */
export const valueLabel = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 10) / 10}` : "0";

/**
 * The values an axis divides a signed range into, floor to ceiling inclusive.
 *
 * A count the axis cannot read reads as four steps and a count past the axis
 * limit is capped, so a computed `ticks` cannot empty the axis or mount an
 * unbounded column of labels.
 */
export const rangeTicks = (
  range: ChartRange,
  count = 4,
): ReadonlyArray<number> => {
  const steps = Number.isFinite(count)
    ? Math.min(20, Math.max(1, Math.floor(count)))
    : 4;
  const span = range.max - range.min;
  return Arr.makeBy(steps + 1, (index) => range.min + (span / steps) * index);
};
