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
  down: -1,
};

/**
 * The keyboard contract.
 *
 * Home/End only answer when the field has the bound they would jump to: a
 * field with no maximum must not jump to a number the component invented.
 *
 * **Left and right are not ours.** They move the caret in the host's text
 * field, and a numeric field that changed its value when the caret moved
 * would be a field a user cannot edit: the caret could never cross a digit
 * without the number changing under it.
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

/**
 * The text a number field keeps while the user types.
 *
 * A numeric *text* field has to keep the raw text the user typed — `1.` must
 * not become `1` under the caret — but that text must not outlive the value it
 * belongs to: when the owner pushes a value, the field has to show it.
 *
 * Three facts, all of them decisions rather than state:
 *
 * - `text` is the raw text of the edit in progress;
 * - `incoming` is the controlled value the field last saw, so a move is
 *   visible (a value that did not move cannot override what is being typed);
 * - `touched` says whether the field has something to show at all — an
 *   untouched field with no value is empty, the way a native number field is.
 */
export interface NumberDraft {
  readonly text: Option.Option<string>;
  readonly incoming: Option.Option<number>;
  readonly touched: boolean;
}

/**
 * The draft a field starts with.
 *
 * `hasValue` says whether the field has something to show before the user
 * types: a `defaultValue` for an uncontrolled field, or the controlled value
 * itself.
 */
export const initNumberDraft = (
  incoming: Option.Option<number>,
  hasValue: boolean,
): NumberDraft => ({
  text: Option.none(),
  incoming,
  touched: hasValue || Option.isSome(incoming),
});

/** The text the field shows: the draft, or the value it means. */
export const numberDraftText = (
  draft: NumberDraft,
  current: number,
  display: (value: number) => string,
): string =>
  Option.match(draft.text, {
    onSome: (text) => text,
    onNone: () => (draft.touched ? display(current) : ""),
  });

/** An edit in progress: the raw text, kept verbatim so the caret never jumps. */
export const withNumberDraftText = (
  draft: NumberDraft,
  text: string,
): NumberDraft => ({ ...draft, text: Option.some(text), touched: true });

/** The edit is over: the field shows its value again, and it has one. */
export const commitNumberDraft = (draft: NumberDraft): NumberDraft => ({
  ...draft,
  text: Option.none(),
  touched: true,
});

/** The value a piece of text means, once it is clamped into the range. */
const meansValue = (text: string, range: NumberRange): Option.Option<number> =>
  Option.map(parseNumericText(text), (parsed) => clampNumeric(parsed, range));

/**
 * Fold the owner's value into the draft.
 *
 * `None` when the owner's value did not move — there is nothing to fold, and
 * the text the user is typing is theirs.
 *
 * When it moved, the draft survives only while it still *means* the new
 * value: `1.` means 1, so a field whose owner echoes 1 keeps the `1.` the user
 * typed, while an owner that pushes 99 replaces the text with 99. A value that
 * arrives after the field was mounted is the same case: the field was empty
 * and now has something to show.
 */
export const syncNumberDraft = (
  draft: NumberDraft,
  incoming: Option.Option<number>,
  range: NumberRange,
): Option.Option<NumberDraft> => {
  // No owner: the field owns its value, and nothing can override it.
  if (Option.isNone(incoming)) return Option.none();
  const value = incoming.value;
  // The owner's value did not move: the text being typed is still the user's.
  if (Option.getOrUndefined(draft.incoming) === value) return Option.none();
  const kept = Option.match(draft.text, {
    onSome: (text) =>
      Option.match(meansValue(text, range), {
        onNone: () => false,
        onSome: (meant) => meant === value,
      }),
    onNone: () => false,
  });
  return Option.some({
    text: kept ? draft.text : Option.none(),
    incoming: Option.some(value),
    touched: true,
  });
};
