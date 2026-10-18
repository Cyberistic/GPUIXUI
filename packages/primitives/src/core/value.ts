/**
 * The arithmetic behind every value control.
 *
 * GPUix has no slider host element (plan 020 §1.5), so a slider is a `div`
 * whose position has to be decided here: how a value clamps and snaps, how it
 * maps to a fraction of the track, and how a pointer position or a key press
 * moves it. A slider, a range slider and a meter are the same model, which is
 * why they share one module — and the module is pure, so it is provable
 * without a rendering runtime.
 */

import * as Option from "effect/Option";

/** A closed interval with a quantisation step. `step: 0` means continuous. */
export interface ValueRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** A painted box on the window, as the renderer reports it. */
export interface TrackBox {
  readonly x: number;
  readonly width: number;
}

/** The two ends of a range slider. */
export interface ValueSpan {
  readonly start: number;
  readonly end: number;
}

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/**
 * A range with finite, ordered bounds and a non-negative step.
 *
 * Total on purpose: a control must not throw because a caller passed `NaN`.
 * A bound that is not a number falls back to the nearest sensible number, and
 * an inverted pair is swapped rather than silently ignored.
 */
export const normalizeRange = (range: ValueRange): ValueRange => {
  const min = finiteOr(range.min, 0);
  const max = finiteOr(range.max, min + 1);
  const step = finiteOr(range.step, 0) > 0 ? Math.abs(range.step) : 0;
  return min <= max ? { min, max, step } : { min: max, max: min, step };
};

/**
 * Strip the binary-float tail a snapped step leaves behind.
 *
 * `0.1 + 0.1 + 0.1` is `0.30000000000000004`; a value control must report the
 * number a caller wrote, not the representation the machine chose.
 */
const cleanStep = (value: number): number =>
  Number.parseFloat(value.toPrecision(15));

/** The tolerance used to decide whether a grid stop landed on `max`. */
const STEP_EPSILON = 1e-9;

/**
 * A stepped range seen as its ordered stops.
 *
 * The stops are `min`, `min + step`, … and then `max` itself when the grid did
 * not land on it. `max` must always be reachable: it is the end of the track a
 * caller asked for, and every caller sets `value={max}` expecting a full one.
 * The model is O(1), so a million-step range costs nothing.
 */
interface Stops {
  readonly range: ValueRange;
  /** Whole grid intervals: `min + intervals * step` is the last grid stop. */
  readonly intervals: number;
  /** Whether `max` follows the last grid stop as its own stop. */
  readonly extra: boolean;
  /** `intervals + 1`, plus one when `max` is extra. */
  readonly count: number;
}

const stopsOf = (range: ValueRange): Stops => {
  const ratio = (range.max - range.min) / range.step;
  const rounded = Math.round(ratio);
  const intervals =
    Math.abs(ratio - rounded) <= STEP_EPSILON ? rounded : Math.floor(ratio);
  const extra =
    range.max - (range.min + intervals * range.step) >
    STEP_EPSILON * Math.max(1, Math.abs(range.max));
  return { range, intervals, extra, count: intervals + 1 + (extra ? 1 : 0) };
};

/** The stop at an index, clamped into the stop list. */
const stopAt = (
  { range, intervals, extra, count }: Stops,
  index: number,
): number => {
  const bounded = Math.min(count - 1, Math.max(0, index));
  return extra && bounded > intervals
    ? range.max
    : Math.min(
        range.max,
        Math.max(
          range.min,
          cleanStep(range.min + Math.min(bounded, intervals) * range.step),
        ),
      );
};

/** The stop nearest a value; a tie goes to `max`, the end of the track. */
const nearestStop = (stops: Stops, value: number): number => {
  const { range, extra } = stops;
  const candidate = stopAt(stops, Math.round((value - range.min) / range.step));
  if (!extra) return candidate;
  return Math.abs(range.max - value) <= Math.abs(candidate - value)
    ? range.max
    : candidate;
};

/** The index of a value that is already a stop. */
const stopIndex = (stops: Stops, value: number): number =>
  stops.extra && value >= stops.range.max
    ? stops.count - 1
    : Math.min(
        stops.intervals,
        Math.max(0, Math.round((value - stops.range.min) / stops.range.step)),
      );

/**
 * Clamp a value into the range and snap it to the nearest stop.
 *
 * `max` is always a stop, so a step that does not divide the span still fills
 * the track. A value that is not a number reads as `min`: an unknown position
 * must never look like a deliberate one.
 */
export const clampValue = (value: number, range: ValueRange): number => {
  const normalized = normalizeRange(range);
  if (!Number.isFinite(value)) return normalized.min;
  const clamped = Math.min(normalized.max, Math.max(normalized.min, value));
  if (normalized.step === 0) return clamped;
  return nearestStop(stopsOf(normalized), clamped);
};

/** Where a value sits on its track: 0 at `min`, 1 at `max`. */
export const valueFraction = (value: number, range: ValueRange): number => {
  const { min, max } = normalizeRange(range);
  const span = max - min;
  if (span <= 0) return 0;
  return (clampValue(value, range) - min) / span;
};

/** The value at a fraction of the track, clamped and snapped. */
export const fractionValue = (fraction: number, range: ValueRange): number => {
  const { min, max } = normalizeRange(range);
  const bounded = Number.isFinite(fraction)
    ? Math.min(1, Math.max(0, fraction))
    : 0;
  return clampValue(min + bounded * (max - min), range);
};

/**
 * One step of movement.
 *
 * A continuous range moves in hundredths of its span, so an arrow key is always
 * a visible move instead of a zero-width one.
 */
export const valueStep = (range: ValueRange): number => {
  const { min, max, step } = normalizeRange(range);
  if (step > 0) return step;
  const span = max - min;
  return span > 0 ? span / 100 : 1;
};

/**
 * `value` moved by `steps` stops (negative to decrease), clamped.
 *
 * A stepped range moves along its stops, so the shorter last interval is one
 * step like any other; a continuous range has no stops and moves by hundredths
 * of its span.
 */
export const stepValue = (
  value: number,
  range: ValueRange,
  steps: number,
): number => {
  const normalized = normalizeRange(range);
  const current = clampValue(value, normalized);
  if (normalized.step === 0)
    return clampValue(current + steps * valueStep(normalized), normalized);
  const stops = stopsOf(normalized);
  return stopAt(stops, stopIndex(stops, current) + steps);
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  left: -1,
  down: -1,
  right: 1,
  up: 1,
};

/**
 * The keyboard contract of a value control.
 *
 * `None` means the key is not one of ours — a caller can tell that from "stay
 * where you are", which is what lets a slide inside a form leave an unrelated
 * key alone.
 */
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

/**
 * The value a pointer at window x aims at.
 *
 * `inset` is half a thumb: the usable span runs from one thumb radius inside
 * each end to the other, so the thumb is centred exactly where the pointer is.
 * A pointer outside the box clamps to the nearest end.
 */
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

/** Order and clamp a range slider's two ends. */
export const normalizeSpan = (
  span: ValueSpan,
  range: ValueRange,
): ValueSpan => {
  const start = clampValue(span.start, range);
  const end = clampValue(span.end, range);
  return start <= end ? { start, end } : { start: end, end: start };
};

/**
 * Which end of a range slider a value is nearer to.
 *
 * A value outside the span always grabs the end it is beyond, even when the two
 * ends coincide: with both thumbs at 0, a click far to the right must move the
 * end it passed, not the start that cannot move any further right.
 */
export const nearestEnd = (value: number, span: ValueSpan): "start" | "end" => {
  if (value <= span.start) return "start";
  if (value >= span.end) return "end";
  return value - span.start <= span.end - value ? "start" : "end";
};

/**
 * Move one end of a range slider without letting the ends cross.
 *
 * Crossing is the defect a two-thumb slider guards against: the thumbs would
 * swap roles and the value the caller reads back would be ordered differently
 * from the one it passed in.
 */
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
