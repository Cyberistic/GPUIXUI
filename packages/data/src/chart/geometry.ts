import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ChartBox, ChartMark, ChartSeries } from "./logic.js";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Curve = "linear" | "smooth" | "natural" | "step";

export interface ChartRange {
  readonly min: number;
  readonly max: number;
}

export const finite = (value: number): number =>
  Number.isFinite(value) ? value : 0;

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

const paintedValues = (
  values: ReadonlyArray<number>,
  categories?: number,
): ReadonlyArray<number> =>
  categories === undefined || !Number.isFinite(categories)
    ? values
    : Arr.take(values, Math.max(0, Math.floor(categories)));

export const niceBound = (raw: number): number => {
  const value = Math.abs(finite(raw));
  if (value === 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return (raw < 0 ? -1 : 1) * nice * magnitude;
};

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

export const scaleY = (
  value: number,
  box: ChartBox,
  range: ChartRange,
): number => {
  const span = range.max - range.min;
  if (span <= 0) return box.height;
  return box.height - ((finite(value) - range.min) / span) * box.height;
};

export const scaleX = (
  value: number,
  box: ChartBox,
  range: ChartRange,
): number => {
  const span = range.max - range.min;
  if (span <= 0) return 0;
  return ((finite(value) - range.min) / span) * box.width;
};

export const zeroY = (box: ChartBox, range: ChartRange): number =>
  scaleY(0, box, range);

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

const at = (value: number): string =>
  `${Math.round((Number.isFinite(value) ? value : 0) * 100) / 100}`;

const pair = (point: Point): string => `${at(point.x)} ${at(point.y)}`;

const monotoneTangents = (
  points: ReadonlyArray<Point>,
): ReadonlyArray<number> => {
  const count = points.length;
  if (count < 2) return Arr.map(points, () => 0);
  const run: number[] = [];
  const slope: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (from === undefined || to === undefined) continue;
    const step = to.x - from.x;
    run[index] = step;
    slope[index] = step === 0 ? 0 : (to.y - from.y) / step;
  }
  const tangent: number[] = Arr.map(points, () => 0);
  tangent[0] = slope[0] ?? 0;
  tangent[count - 1] = slope[count - 2] ?? 0;
  for (let index = 1; index < count - 1; index += 1) {
    const before = slope[index - 1] ?? 0;
    const after = slope[index] ?? 0;
    if (before * after <= 0) {
      tangent[index] = 0;
      continue;
    }
    const left = 2 * (run[index] ?? 1) + (run[index - 1] ?? 1);
    const right = (run[index] ?? 1) + 2 * (run[index - 1] ?? 1);
    tangent[index] = (left + right) / (left / before + right / after);
  }
  return tangent;
};

const naturalControls = (
  values: ReadonlyArray<number>,
): readonly [ReadonlyArray<number>, ReadonlyArray<number>] => {
  const n = values.length - 1;
  const value = (index: number): number => values[index] ?? 0;
  const a: Array<number> = [0];
  const b: Array<number> = [2];
  const r: Array<number> = [value(0) + 2 * value(1)];
  for (let i = 1; i < n - 1; i += 1) {
    a[i] = 1;
    b[i] = 4;
    r[i] = 4 * value(i) + 2 * value(i + 1);
  }
  a[n - 1] = 2;
  b[n - 1] = 7;
  r[n - 1] = 8 * value(n - 1) + value(n);
  for (let i = 1; i < n; i += 1) {
    const m = (a[i] ?? 0) / (b[i - 1] ?? 1);
    b[i] = (b[i] ?? 0) - m;
    r[i] = (r[i] ?? 0) - m * (r[i - 1] ?? 0);
  }
  const first: Array<number> = [];
  first[n - 1] = (r[n - 1] ?? 0) / (b[n - 1] ?? 1);
  for (let i = n - 2; i >= 0; i -= 1) {
    first[i] = ((r[i] ?? 0) - (first[i + 1] ?? 0)) / (b[i] ?? 1);
  }
  const second: Array<number> = [];
  second[n - 1] = (value(n) + (first[n - 1] ?? 0)) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    second[i] = 2 * value(i + 1) - (first[i + 1] ?? 0);
  }
  return [first, second];
};

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
  const tangents = monotoneTangents(points);
  const [x1, x2] = naturalControls(Arr.map(points, (point) => point.x));
  const [y1, y2] = naturalControls(Arr.map(points, (point) => point.y));
  const body = Arr.map(rest, (point, index) => {
    const previous = points[index];
    if (previous === undefined) return "";
    return Match.value(curve).pipe(
      Match.when("step", () => `H${at(point.x)}V${at(point.y)}`),
      Match.when("natural", () =>
        points.length < 3
          ? `L${pair(point)}`
          : `C${pair({ x: x1[index] ?? point.x, y: y1[index] ?? point.y })} ${pair(
              {
                x: x2[index] ?? point.x,
                y: y2[index] ?? point.y,
              },
            )} ${pair(point)}`,
      ),
      Match.when("smooth", () => {
        const h = (point.x - previous.x) / 3;
        return `C${pair({
          x: previous.x + h,
          y: previous.y + (tangents[index] ?? 0) * h,
        })} ${pair({
          x: point.x - h,
          y: point.y - (tangents[index + 1] ?? 0) * h,
        })} ${pair(point)}`;
      }),
      Match.when("linear", () => `L${pair(point)}`),
      Match.exhaustive,
    );
  });
  return Option.some(`M${pair(head)}${Arr.join(body, "")}`);
};

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

export const emphasisedPointMarks = (
  points: ReadonlyArray<Point>,
  radius: number,
  hovered: number | undefined,
): ReadonlyArray<ChartMark> =>
  Arr.map(
    points,
    (point, index): ChartMark => ({
      kind: "circle",
      cx: point.x,
      cy: point.y,
      r: Math.max(1, index === hovered ? radius * 2 : radius),
    }),
  );

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

const clampRadius = (reach: number | undefined, fallback: number): number =>
  reach === undefined || !Number.isFinite(reach)
    ? fallback
    : Math.max(0, Math.min(fallback * 2 + 4, reach));

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

export const polygonPath = (
  points: ReadonlyArray<Point>,
): Option.Option<string> =>
  Option.map(Arr.head(points), (first) => {
    return `M${pair(first)}${Arr.join(
      Arr.map(Arr.drop(points, 1), (point) => `L${pair(point)}`),
      "",
    )}Z`;
  });

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

export const circlePath = (cx: number, cy: number, radius: number): string =>
  `M${at(cx - radius)} ${at(cy)}A${at(radius)} ${at(radius)} 0 1 0 ${at(cx + radius)} ${at(cy)}A${at(radius)} ${at(radius)} 0 1 0 ${at(cx - radius)} ${at(cy)}Z`;

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

export const fullRing = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
): string =>
  `${ringArc(cx, cy, outer, inner, -Math.PI / 2, 0)}${ringArc(cx, cy, outer, inner, 0, (Math.PI * 3) / 2)}`;

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

const ACTIVE_GROW = 8;
const ACTIVE_BAND_INNER = 10;
const ACTIVE_BAND_OUTER = 20;

const gappedArc = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  from: number,
  to: number,
  width: number,
): string => {
  const half = width / 2;
  const point = (radius: number, angle: number): string =>
    `${at(cx + radius * Math.cos(angle))} ${at(cy + radius * Math.sin(angle))}`;
  const inset = (radius: number) => Math.asin(Math.min(1, half / radius));
  const large = (a: number, b: number) => (b - a > Math.PI ? 1 : 0);
  const rimFrom = from + inset(outer);
  const rimTo = to - inset(outer);
  const rim = `M${point(outer, rimFrom)}A${at(outer)} ${at(outer)} 0 ${large(rimFrom, rimTo)} 1 ${point(outer, rimTo)}`;
  if (inner > half) {
    const hubFrom = from + inset(inner);
    const hubTo = to - inset(inner);
    return `${rim}L${point(inner, hubTo)}A${at(inner)} ${at(inner)} 0 ${large(hubFrom, hubTo)} 0 ${point(inner, hubFrom)}Z`;
  }
  const apex = half / Math.max(1e-6, Math.sin((to - from) / 2));
  return `${rim}L${point(Math.min(apex, outer / 2), (from + to) / 2)}Z`;
};

export const ringSegments = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  innerRatio = 0,
  padAngle = 0,
  emphasis?: number,
  sweep = 1,
): ReadonlyArray<ReadonlyArray<ChartMark>> => {
  const drawable = Arr.map(values, (value) => Math.max(0, finite(value)));
  const total = Arr.reduce(drawable, 0, (sum, value) => sum + value);
  if (total <= 0) return Arr.map(values, () => []);
  const size = Math.min(box.width, box.height);
  const cx = box.width / 2;
  const cy = box.height / 2;
  const outer = size / 2 - (emphasis === undefined ? 0 : ACTIVE_BAND_OUTER);
  const inner = outer * Math.min(0.95, Math.max(0, innerRatio));
  const start = -Math.PI / 2;
  const full = Math.PI * 2;
  const gap = Math.min(
    Math.max(0, padAngle),
    (full * 0.4) / Math.max(1, drawable.length),
  );
  const [, segments] = Arr.mapAccum(drawable, start, (angle, value, index) => {
    if (value <= 0) return [angle, []];
    const span = (value / total) * full * sweep;
    const from = angle + gap / 2;
    const to = angle + span - gap / 2;
    if (to <= from) return [angle + span, []];
    const active = index === emphasis;
    const rim = active ? outer + ACTIVE_GROW : outer;
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
      [
        {
          kind: "path" as const,
          d: gappedArc(cx, cy, rim, inner, angle, angle + span, gap * outer),
        },
        ...(active
          ? [
              {
                kind: "path" as const,
                d: ringArc(
                  cx,
                  cy,
                  outer + ACTIVE_BAND_OUTER,
                  outer + ACTIVE_BAND_INNER,
                  from,
                  to,
                ),
              },
            ]
          : []),
      ],
    ];
  });
  return segments;
};

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

export interface RingLabel {
  readonly point: Point;
  readonly right: boolean;
  readonly leader: string;
}

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

export interface ChartView {
  readonly start: number;
  readonly end: number;
}

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

export interface ChartWindow {
  readonly start: number;
  readonly end: number;
}

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

export const valueLabel = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 10) / 10}` : "0";

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

export const pinnedRange = (
  range: readonly [number, number] | undefined,
): Option.Option<ChartRange> => {
  if (range === undefined) return Option.none();
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return Option.none();
  const min = Math.min(low, high);
  const max = Math.max(low, high);
  if (max - min <= 0) return Option.none();
  return Option.some({ min, max });
};

export const chartRangeWith = (
  series: ReadonlyArray<ChartSeries>,
  categories?: number,
  pinned: readonly [number, number] | undefined = undefined,
  stacked = false,
): ChartRange =>
  Option.getOrElse(pinnedRange(pinned), () =>
    chartRange(series, categories, stacked),
  );

export const referenceLines = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  range: ChartRange,
): ReadonlyArray<{ readonly y: number; readonly value: number }> =>
  Arr.map(Arr.filter(values, Number.isFinite), (value) => ({
    y: scaleY(value, box, range),
    value,
  }));

export const verticalGrid = (
  count: number,
  box: ChartBox,
): ReadonlyArray<{ readonly x: number; readonly width: number }> => {
  const steps = Number.isFinite(count)
    ? Math.min(64, Math.max(0, Math.floor(count)))
    : 0;
  if (steps === 0) return [];
  const slot = box.width / steps;
  return Arr.map(
    Arr.makeBy(steps, (index) => index),
    (index) => ({
      x: index * slot,
      width: Math.max(1, slot),
    }),
  );
};

export const scatterMarks = (
  values: ReadonlyArray<number>,
  box: ChartBox,
  range: ChartRange,
  categories?: number,
  radius = 3,
): ReadonlyArray<ChartMark> => {
  const count = slotCount([], categories);
  if (count === 0) return [];
  const slot = box.width / count;
  return Arr.map(
    Arr.filter(
      Arr.map(paintedValues(values, categories), (value, index) => ({
        value,
        x: (index + 0.5) * slot,
      })),
      (cell) => Number.isFinite(cell.value),
    ),
    (cell): ChartMark => ({
      kind: "circle",
      cx: cell.x,
      cy: Math.max(0, Math.min(box.height, scaleY(cell.value, box, range))),
      r: Math.max(0.01, radius),
    }),
  );
};

export interface Candle {
  readonly open: number;
  readonly high: number;
  /** The lowest price the period reached. */
  readonly low: number;
  /** The price the period closed at. */
  readonly close: number;
}

/** A candle's direction: an up day or a down day. */
export const candleUp = (candle: Candle): boolean => candle.close > candle.open;

export const candleMarks = (
  candle: Candle,
  x: number,
  width: number,
  box: ChartBox,
  range: ChartRange,
): ReadonlyArray<ChartMark> => {
  const numbers = [candle.open, candle.high, candle.low, candle.close];
  if (Arr.some(numbers, (value) => !Number.isFinite(value))) return [];
  const high = scaleY(candle.high, box, range);
  const low = scaleY(candle.low, box, range);
  const open = scaleY(candle.open, box, range);
  const close = scaleY(candle.close, box, range);
  const top = Math.min(open, close);
  const bodyHeight = Math.max(1, Math.abs(close - open));
  return [
    {
      kind: "rect",
      x: x + width / 2 - 0.5,
      y: Math.min(high, low),
      width: 1,
      height: Math.abs(low - high),
    },
    {
      kind: "rect",
      x,
      y: top,
      width,
      height: bodyHeight,
    },
  ];
};

export const candleAtMarks = (
  candle: Candle,
  index: number,
  categories: number,
  box: ChartBox,
  range: ChartRange,
  width = 6,
): ReadonlyArray<ChartMark> => {
  const count = slotCount([], categories);
  if (count === 0) return [];
  const slot = box.width / count;
  const bodyWidth = Math.max(1, Math.min(width, slot * 0.6));
  return candleMarks(
    candle,
    (index + 0.5) * slot - bodyWidth / 2,
    bodyWidth,
    box,
    range,
  );
};

export const candleSeriesMarks = (
  candles: ReadonlyArray<Candle>,
  box: ChartBox,
  range: ChartRange,
  categories?: number,
  width = 6,
): ReadonlyArray<ChartMark> => {
  const count = slotCount([], categories);
  if (count === 0) return [];
  const painted = Arr.take(candles, count);
  const slot = box.width / count;
  const bodyWidth = Math.max(1, Math.min(width, slot * 0.6));
  return Arr.flatMap(painted, (candle, index) =>
    candleMarks(
      candle,
      (index + 0.5) * slot - bodyWidth / 2,
      bodyWidth,
      box,
      range,
    ),
  );
};

export const funnelMarks = (
  values: ReadonlyArray<number>,
  box: ChartBox,
): ReadonlyArray<ChartMark> => {
  const drawable = Arr.map(values, (value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const first = Arr.head(drawable);
  if (Option.isNone(first) || first.value <= 0) return [];
  const widest = first.value;
  const count = drawable.length;
  const slot = box.height / count;
  return Arr.map(
    Arr.filter(
      Arr.map(drawable, (value, index) => ({ value, index })),
      (cell) => cell.value > 0,
    ),
    (cell): ChartMark => ({
      kind: "rect",
      x: (box.width - (cell.value / widest) * box.width) / 2,
      y: cell.index * slot,
      width: (cell.value / widest) * box.width,
      height: Math.max(1, slot * 0.8),
      rx: 6,
    }),
  );
};
