import {
  clampValue,
  spanFrom,
  stepValue,
  valueFraction,
  type ValueRange,
  type ValueSpan,
  normalizeSpan,
} from "@gpuixui/primitives/core";

export interface SpanDrag {
  readonly anchor: number;
}

export const valueKey = (key: string): string =>
  key.toLowerCase().replace(/^arrow/, "");

export interface TrackPaint {
  readonly left: number;
  readonly width: number;
}

export const trackPaint = (
  values: ReadonlyArray<number>,
  range: ValueRange,
): TrackPaint => {
  const clean = (fraction: number): number =>
    Number.parseFloat(fraction.toPrecision(12));
  const first = valueFraction(values[0] ?? range.min, range);
  const last = valueFraction(values.at(-1) ?? range.min, range);
  const single = values.length < 2;
  return {
    left: single ? 0 : clean(first),
    width: clean(last - (single ? 0 : first)),
  };
};

export const thumbFractions = (
  values: ReadonlyArray<number>,
  range: ValueRange,
): ReadonlyArray<number> => values.map((value) => valueFraction(value, range));

export const shiftSpan = (
  span: ValueSpan,
  steps: number,
  range: ValueRange,
): ValueSpan => {
  const current = normalizeSpan(span, range);
  const offset = stepValue(current.start, range, steps) - current.start;
  if (offset === 0) return current;
  const width = current.end - current.start;
  const start = Math.min(
    clampValue(current.start + offset, range),
    range.max - width,
  );
  return { start, end: clampValue(start + width, range) };
};

export const dragSpan = (
  drag: SpanDrag,
  value: number,
  range: ValueRange,
): ValueSpan => spanFrom(drag.anchor, value, range);
