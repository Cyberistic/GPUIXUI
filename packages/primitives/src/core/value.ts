/**
 * The arithmetic behind every value control.
 *
 * GPUix has no slider host element (see `docs/gpuix-capabilities.md`), so a slider is a `div`
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

/** The same box on the other axis, for a vertical track. */
export interface VerticalTrackBox {
  readonly y: number;
  readonly height: number;
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

/**
 * Clamp a value into the range and snap it to the step, measured from `min`.
 *
 * A value that is not a number reads as `min`: an unknown position must never
 * look like a deliberate one.
 *
 * **The ends are stops.** A step that does not divide the span must not make
 * the maximum unreachable: with `min: 0, max: 10, step: 3` the steps are
 * 0, 3, 6, 9 — and 10 is still a place the thumb can reach, because a
 * control whose maximum cannot be selected is a control with a lie in its
 * range. The same holds for the minimum, which the snap already keeps.
 */
export const clampValue = (value: number, range: ValueRange): number => {
  const { min, max, step } = normalizeRange(range);
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  if (step === 0) return clamped;
  if (clamped >= max) return max;
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Math.min(max, Math.max(min, cleanStep(snapped)));
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
 * `value` moved by `steps` steps (negative to decrease), clamped.
 *
 * Stops are counted, not added: the maximum is a stop even when it is not on a
 * step grid (`min: 0, max: 10, step: 3`), so adding `-step` to it would pass
 * over the neighbouring stop — 10 → 7 snaps to 6, and 9 could be reached with
 * an up move and never with a down one. Counting indices off the grid point at
 * or below the value makes the ladder 0, 3, 6, 9, 10 in both directions.
 */
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
  // `base` is on the grid unless it sits on an off-grid maximum, and a float
  // step leaves its offset a hair off the integer it means.
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

/**
 * The value a pointer at window y aims at on a vertical track.
 *
 * A vertical value runs **up**: the maximum is at the top of the usable span,
 * so the fraction is measured from the bottom. `inset` is half a thumb, exactly
 * as on the horizontal axis, so a thumb at either end is centred on the end
 * rather than hanging off it.
 */
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
 * The span a drag from one point draws, with that point held.
 *
 * Two coincident ends are a legitimate range — a price filter opens with both
 * thumbs on the same number — and they are **one point**, so a press landing on
 * them cannot say which thumb it grabbed: every direction is a tie, and
 * {@link nearestEnd} answers "start", whose travel towards the end is exactly
 * the move it may not make (see {@link moveSpanEnd}). A pair that can only be
 * pulled one way is a range a reader cannot set, so a press on a coincident pair
 * is read as "a span around this point": the end the pointer travels towards
 * follows it and the other stays pinned, in either direction.
 *
 * Once the ends differ the usual grab applies, so this is only the ambiguous
 * gesture and never a second way to drag an ordinary thumb.
 */
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
