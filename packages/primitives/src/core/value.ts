import * as Option from "effect/Option";
import { storedNumber } from "./stored.js";

export interface ValueRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface TrackBox {
  readonly x: number;
  readonly width: number;
}

export interface VerticalTrackBox {
  readonly y: number;
  readonly height: number;
}

export interface ValueSpan {
  readonly start: number;
  readonly end: number;
}

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export const normalizeRange = (range: ValueRange): ValueRange => {
  const min = finiteOr(range.min, 0);
  const max = finiteOr(range.max, min + 1);
  const step = finiteOr(range.step, 0) > 0 ? Math.abs(range.step) : 0;
  return min <= max ? { min, max, step } : { min: max, max: min, step };
};

export interface StoredRange {
  readonly min?: unknown;
  readonly max?: unknown;
  readonly step?: unknown;
}

export const storedRange = (
  bounds: StoredRange,
  defaults: ValueRange,
): ValueRange =>
  normalizeRange({
    min: Option.getOrElse(storedNumber(bounds.min), () => defaults.min),
    max: Option.getOrElse(storedNumber(bounds.max), () => defaults.max),
    step: Option.getOrElse(storedNumber(bounds.step), () => defaults.step),
  });

const cleanStep = (value: number): number =>
  Number.parseFloat(value.toPrecision(15));

export const clampValue = (value: number, range: ValueRange): number => {
  const { min, max, step } = normalizeRange(range);
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  if (step === 0) return clamped;
  if (clamped >= max) return max;
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Math.min(max, Math.max(min, cleanStep(snapped)));
};

export const valueFraction = (value: number, range: ValueRange): number => {
  const { min, max } = normalizeRange(range);
  const span = max - min;
  if (span <= 0) return 0;
  return (clampValue(value, range) - min) / span;
};

export const fractionValue = (fraction: number, range: ValueRange): number => {
  const { min, max } = normalizeRange(range);
  const bounded = Number.isFinite(fraction)
    ? Math.min(1, Math.max(0, fraction))
    : 0;
  return clampValue(min + bounded * (max - min), range);
};

export const valueStep = (range: ValueRange): number => {
  const { min, max, step } = normalizeRange(range);
  if (step > 0) return step;
  const span = max - min;
  return span > 0 ? span / 100 : 1;
};

export const stepValue = (
  value: number,
  range: ValueRange,
  steps: number,
): number => {
  const normalized = normalizeRange(range);
  const base = clampValue(value, normalized);
  if (steps === 0) return base;
  if (normalized.step === 0)
    return clampValue(base + steps * valueStep(normalized), normalized);
  const offset = (base - normalized.min) / normalized.step;
  const nearest = Math.round(offset);

  const index =
    Math.abs(offset - nearest) < 1e-9
      ? nearest
      : steps > 0
        ? Math.floor(offset)
        : Math.ceil(offset);
  return clampValue(
    normalized.min + (index + steps) * normalized.step,
    normalized,
  );
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  left: -1,
  down: -1,
  right: 1,
  up: 1,
};

export const decideValueKey = (
  value: number,
  range: ValueRange,
  key: string,
  pageSteps = 10,
): Option.Option<number> => {
  const normalized = normalizeRange(range);
  if (key === "home") return Option.some(normalized.min);
  if (key === "end") return Option.some(normalized.max);
  const steps =
    key === "pageup"
      ? pageSteps
      : key === "pagedown"
        ? -pageSteps
        : ARROW_STEPS[key];
  return steps === undefined
    ? Option.none()
    : Option.some(stepValue(value, normalized, steps));
};

export const pointerValue = (
  x: number,
  box: TrackBox,
  range: ValueRange,
  inset = 0,
): number => {
  const span = box.width - 2 * inset;
  if (!Number.isFinite(x) || span <= 0) return normalizeRange(range).min;
  return fractionValue((x - box.x - inset) / span, range);
};

export const verticalPointerValue = (
  y: number,
  box: VerticalTrackBox,
  range: ValueRange,
  inset = 0,
): number => {
  const span = box.height - 2 * inset;
  if (!Number.isFinite(y) || span <= 0) return normalizeRange(range).min;
  return fractionValue(1 - (y - box.y - inset) / span, range);
};

export const normalizeSpan = (
  span: ValueSpan,
  range: ValueRange,
): ValueSpan => {
  const start = clampValue(span.start, range);
  const end = clampValue(span.end, range);
  return start <= end ? { start, end } : { start: end, end: start };
};

export const nearestEnd = (value: number, span: ValueSpan): "start" | "end" => {
  if (value <= span.start) return "start";
  if (value >= span.end) return "end";
  return value - span.start <= span.end - value ? "start" : "end";
};

export const spanFrom = (
  point: number,
  value: number,
  range: ValueRange,
): ValueSpan => {
  const pinned = clampValue(point, range);
  const moved = clampValue(value, range);
  return moved >= pinned
    ? { start: pinned, end: moved }
    : { start: moved, end: pinned };
};

export const moveSpanEnd = (
  span: ValueSpan,
  end: "start" | "end",
  value: number,
  range: ValueRange,
): ValueSpan => {
  const current = normalizeSpan(span, range);
  return end === "start"
    ? {
        start: Math.min(clampValue(value, range), current.end),
        end: current.end,
      }
    : {
        start: current.start,
        end: Math.max(clampValue(value, range), current.start),
      };
};
