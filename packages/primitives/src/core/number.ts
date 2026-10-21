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

/** Clamp to whichever bounds exist; an absent bound does not constrain. */
export const clampNumeric = (value: number, range: NumberRange): number => {
  const aboveMin = range.min === undefined ? value : Math.max(range.min, value);
  return range.max === undefined ? aboveMin : Math.min(range.max, aboveMin);
};

/** Fixed decimals, never a thousands separator. */
export const formatNumber = (value: number, precision = 0): string =>
  value.toFixed(Math.min(20, Math.max(0, Math.trunc(precision))));

/**
 * The decimal places a number's shortest representation carries.
 *
 * Capped at 15: a double has no meaningful digits past that, and the cap keeps
 * the scale finite for an exponential literal.
 */
const decimalsOf = (value: number): number => {
  const text = String(value);
  const [mantissa = text, exponentText] = text.split(/e/i);
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const fraction = mantissa.split(".")[1]?.length ?? 0;
  return Math.min(15, Math.max(0, fraction - exponent));
};

/**
 * Move by `steps` steps and clamp. A step of 0 is treated as 1.
 *
 * The move is rounded to the finer of the value's and the step's decimal
 * places, so `0.2 + 0.1` reports `0.3` rather than `0.30000000000000004`. A
 * step between integers stays an integer step — the rounding scale is `1`.
 */
export const stepNumber = (
  value: number,
  range: NumberRange,
  steps: number,
): number => {
  const step = range.step > 0 ? range.step : 1;
  const scale = 10 ** Math.max(decimalsOf(step), decimalsOf(value));
  const moved = Math.round((value + steps * step) * scale) / scale;
  return clampNumeric(moved, range);
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  up: 1,
  right: 1,
  down: -1,
  left: -1,
};

/**
 * The keyboard contract.
 *
 * Home/End only answer when the field has the bound they would jump to: a
 * field with no maximum must not jump to a number the component invented.
 */
export const decideNumberKey = (
  value: number,
  range: NumberRange,
  key: string,
  pageSteps = 10,
): Option.Option<number> => {
  if (key === "home")
    return range.min === undefined
      ? Option.none()
      : Option.some(clampNumeric(range.min, range));
  if (key === "end")
    return range.max === undefined
      ? Option.none()
      : Option.some(clampNumeric(range.max, range));
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
