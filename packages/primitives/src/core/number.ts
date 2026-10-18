/**
 * The text and arithmetic behind `NumberField`.
 *
 * A number field is two problems: turning what the user typed into a number
 * without inventing locale rules, and moving that number by steps between
 * optional bounds. Both are pure, so they are provable without a rendering
 * runtime; the component keeps only the draft text and the focus.
 */

import * as Option from "effect/Option";

/** Optional bounds with a mandatory step. */
export interface NumberRange {
  readonly min?: number;
  readonly max?: number;
  readonly step: number;
}

/**
 * Decimal notation only — no hex, no `Infinity`, no thousands separators.
 *
 * A comma decimal would be a locale claim this component does not make; a
 * caller who needs one formats through `formatValue` and parses before it
 * reaches the field. A trailing dot (`"1."`) is legal while typing.
 */
const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/** The number a field's text means, or `None` while it is not a number yet. */
export const parseNumericText = (text: string): Option.Option<number> => {
  const trimmed = text.trim();
  if (!NUMERIC.test(trimmed)) return Option.none();
  const value = Number(trimmed);
  return Number.isFinite(value) ? Option.some(value) : Option.none();
};

/**
 * Bounds a field can act on: finite ends and a positive, finite step.
 *
 * A public form field takes numbers from a record or a computation, and `NaN`
 * or `Infinity` there must not become a painted value. A bound that is not a
 * number is treated as absent (the field is unbounded on that side), an
 * inverted pair is swapped — the rule every slider and meter already follows —
 * and a step that is not positive becomes 1.
 */
export const normalizeNumberRange = (range: NumberRange): NumberRange => {
  const min = Number.isFinite(range.min) ? range.min : undefined;
  const max = Number.isFinite(range.max) ? range.max : undefined;
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : 1;
  return min !== undefined && max !== undefined && min > max
    ? { min: max, max: min, step }
    : { min, max, step };
};

/**
 * A value the field can paint, from one that may not be a number.
 *
 * `NaN` reads as the floor — the rule `core/value.ts`'s `clampValue` already
 * follows for a slider, so an unknown number never looks like a deliberate
 * one. An infinity reads as the bound on its own side, because that is the
 * nearest paintable value the caller could have meant.
 */
const finiteFieldValue = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  if (Number.isFinite(value)) return value;
  const floor = min ?? 0;
  if (Number.isNaN(value)) return floor;
  return value > 0 ? (max ?? floor) : (min ?? max ?? 0);
};

/**
 * Clamp to whichever bounds exist; an absent bound does not constrain.
 *
 * A value that is not a finite number is made total first, so the paint, the
 * announcement, the steppers and the keys can never see `NaN` or an unbounded
 * infinity (plan `392`).
 */
export const clampNumeric = (value: number, range: NumberRange): number => {
  const { min, max } = normalizeNumberRange(range);
  const usable = finiteFieldValue(value, min, max);
  const aboveMin = min === undefined ? usable : Math.max(min, usable);
  return max === undefined ? aboveMin : Math.min(max, aboveMin);
};

/** Fixed decimals, never a thousands separator. A non-finite precision is 0. */
export const formatNumber = (value: number, precision = 0): string =>
  value.toFixed(
    Number.isFinite(precision)
      ? Math.min(20, Math.max(0, Math.trunc(precision)))
      : 0,
  );

/**
 * The most decimal places a step may claim.
 *
 * Binary floating point cannot represent `0.1`, so `0.2 + 0.1` is
 * `0.30000000000000004`. A UI step never needs more than 12 places, so a step
 * result is trimmed there — otherwise the field paints `0.3` and reports a
 * different number to its consumer (plan `077`).
 */
const MAX_STEP_DECIMALS = 12;

const exact = (value: number): number =>
  Number.isFinite(value) ? Number(value.toFixed(MAX_STEP_DECIMALS)) : value;

/** Move by `steps` steps and clamp. A step of 0 is treated as 1. */
export const stepNumber = (
  value: number,
  range: NumberRange,
  steps: number,
): number => {
  const { min, max, step } = normalizeNumberRange(range);
  // The base is the value the field paints, not the raw prop: an out-of-range
  // or non-finite base must step from the bound it is shown at (plan `392`).
  const current = clampNumeric(value, { min, max, step });
  return exact(clampNumeric(current + steps * step, { min, max, step }));
};

/** A number field's in-progress text, and the two values it can belong to. */
export interface NumberDraft {
  /** What the user typed. */
  readonly text: string;
  /** The value the field held when the draft was written. */
  readonly base: number;
  /** The value the draft asked the parent for; absent while it does not parse. */
  readonly reported: Option.Option<number>;
}

/**
 * Whether a draft should still be painted.
 *
 * A draft belongs to the field while the current value is the one it started
 * from (the parent has not moved) or the one it reported (the parent accepted
 * the edit). Any other value is an external change — a reset, a reloaded
 * record — and it wins over the draft. This is what keeps `"1."` typeable
 * without letting a stale draft outlive the value it belongs to.
 */
export const draftApplies = (draft: NumberDraft, value: number): boolean =>
  Object.is(draft.base, value) ||
  Option.exists(draft.reported, (reported) => Object.is(reported, value));

const ARROW_STEPS: Readonly<Record<string, number>> = {
  up: 1,
  down: -1,
};

/**
 * The keyboard contract.
 *
 * Only the keys GPUI actually delivers to a field are here. The native editor
 * consumes `ArrowLeft`/`ArrowRight`/`Home`/`End` on key down to move the caret
 * (measured, plan `338`), so they must stay unhandled: on a text field the caret
 * is the more valuable contract, and a step that never fires is worse than no
 * step at all.
 *
 * Home/End never answer, not even for a bounded field: a bound jump would have
 * to take those keys from the caret to exist.
 */
export const decideNumberKey = (
  value: number,
  range: NumberRange,
  key: string,
  pageSteps = 10,
): Option.Option<number> => {
  const steps =
    key === "pageup"
      ? pageSteps
      : key === "pagedown"
        ? -pageSteps
        : ARROW_STEPS[key];
  return steps === undefined
    ? Option.none()
    : Option.some(stepNumber(value, range, steps));
};
