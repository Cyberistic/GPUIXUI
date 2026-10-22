/**
 * The text and arithmetic behind `NumberField`.
 *
 * A number field is two problems: turning what the user typed into a number
 * without inventing locale rules, and moving that number by steps between
 * optional bounds. Both are pure, so they are provable without a rendering
 * runtime; the component keeps only the draft text and the focus.
 */

import * as Option from "effect/Option";
import * as Str from "effect/String";

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
 * A caller's reading of the text its own `formatValue` painted.
 *
 * `formatValue` is display-only: a grouped `1,234` or a locale `1,5` is not
 * decimal notation, so the field cannot read it back on its own. This is the
 * counterpart — the text as the caller's format means it, or `None` for text
 * that is not a number in it.
 */
export type ParseValue = (text: string) => Option.Option<number>;

/**
 * The value a field's text means: the caller's reading first, then decimal.
 *
 * A field with no text has no value whatever a parser says — an empty box is a
 * hint, not a zero — and a parser that answers a number the field cannot lay
 * out is not a reading, so only finite numbers survive. Text the caller's
 * parser declines still reads as decimal, which is what keeps a grouped field
 * editable by hand.
 */
export const parseNumberText = (
  text: string,
  parseValue?: ParseValue,
): Option.Option<number> => {
  if (!Str.isNonEmpty(Str.trim(text))) return Option.none();
  const own: Option.Option<number> =
    parseValue === undefined
      ? Option.none()
      : Option.filter(parseValue(text), Number.isFinite);
  return Option.isSome(own) ? own : parseNumericText(text);
};

/**
 * The bounds a range can actually use.
 *
 * A bound that cannot be laid out is not a bound: `Math.min(NaN, value)` is
 * `NaN`, so one `max: NaN` would otherwise take the field's value with it. An
 * inverted pair is the range it means, the same answer `core/value.ts` gives a
 * slider — otherwise every value clamps to the lower end and both steppers are
 * inert, a field that cannot be edited at all.
 */
export const normalizeNumberRange = (range: NumberRange): NumberRange => {
  const min = Number.isFinite(range.min) ? range.min : undefined;
  const max = Number.isFinite(range.max) ? range.max : undefined;
  return min !== undefined && max !== undefined && min > max
    ? { min: max, max: min, step: range.step }
    : { min, max, step: range.step };
};

const numericBounds = (
  range: NumberRange,
): { readonly min: number | undefined; readonly max: number | undefined } => {
  const { min, max } = normalizeNumberRange(range);
  return { min, max };
};

/**
 * The number a range paints for a value it was given.
 *
 * A value that is not a number has no position, so it reads as the nearest
 * bound: the minimum when there is one, otherwise the maximum, otherwise zero.
 * `core/value.ts` makes the same call for a slider, and the alternative —
 * carrying `NaN` — is a field that paints "NaN" and whose arrows move nothing.
 */
const paintable = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => (Number.isFinite(value) ? value : (min ?? max ?? 0));

/** Clamp to whichever bounds exist; an absent bound does not constrain. */
export const clampNumeric = (value: number, range: NumberRange): number => {
  const { min, max } = numericBounds(range);
  const finite = paintable(value, min, max);
  const aboveMin = min === undefined ? finite : Math.max(min, finite);
  return max === undefined ? aboveMin : Math.min(max, aboveMin);
};

/** A fixed-decimal string that renders zero with a negative sign. */
const NEGATIVE_ZERO = /^-0(?:\.0+)?$/;

/**
 * A `toFixed` result in plain decimal, in the one case it is not.
 *
 * `toFixed` switches to the exponential form at `1e21` (the spec's bound), so a
 * value the caller can type — the parser accepts an exponent — used to commit
 * as `1e+21` under a contract that promises fixed decimals. Every double that
 * large is an integer, so the expansion is the mantissa's digits, the zeros its
 * exponent asks for, and the requested decimals.
 */
const plainFixed = (text: string, decimals: number): string => {
  const [mantissa = "0", exponentText = "0"] = text.split(/e/i);
  const negative = Str.startsWith("-")(mantissa);
  const unsigned = negative ? Str.slice(1)(mantissa) : mantissa;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const shift = Number(exponentText) - Str.length(fraction);
  const digits = `${whole}${fraction}${Str.repeat(Math.max(0, shift))("0")}`;
  const point = decimals > 0 ? `.${Str.repeat(decimals)("0")}` : "";
  return `${negative ? "-" : ""}${digits}${point}`;
};

/**
 * Fixed decimals, never a thousands separator.
 *
 * A value that rounds to zero loses the sign `toFixed` keeps on it: `-0.004` at
 * two decimals is `-0.00`, which reads as a negative number.
 */
export const formatNumber = (value: number, precision = 0): string => {
  const decimals = Math.min(20, Math.max(0, Math.trunc(precision)));
  const fixed = value.toFixed(decimals);
  const text = Str.includes("e")(fixed) ? plainFixed(fixed, decimals) : fixed;
  return NEGATIVE_ZERO.test(text) ? Str.slice(1)(text) : text;
};

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
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : 1;
  // The move starts where the field paints: a value outside the range, or one
  // that is not a number, is read as its bound first — a step from such a value
  // otherwise adds to something the reader never saw.
  const from = clampNumeric(value, range);
  const scale = 10 ** Math.max(decimalsOf(step), decimalsOf(from));
  const moved = Math.round((from + steps * step) * scale) / scale;
  return clampNumeric(moved, range);
};

/**
 * The vertical travel one scrub step takes.
 *
 * Four logical pixels is the pointer-native scale: a 40px drag moves ten steps,
 * which crosses a typical `0…100` field in one comfortable gesture while a
 * one-pixel wobble on a click stays a click. It is a design constant rather than
 * a `Theme` group, because density describes a control's box and this describes
 * a gesture — a brand that could change it would make two fields in one window
 * scrub at different rates.
 */
export const SCRUB_PIXELS_PER_STEP = 4;

/**
 * The value a vertical drag aims at.
 *
 * `travel` is how far the pointer moved **up** since the press (a downward drag
 * is negative), so dragging up raises the value. The travel is quantised with a
 * sign-aware round: ±6px is two steps in both directions, where
 * `Math.round(-6 / 4)` is `-1` and the same gesture would answer differently
 * depending on which way it went. A travel that cannot be measured leaves the
 * value alone, and a scale that cannot be laid out falls back to
 * {@link SCRUB_PIXELS_PER_STEP} — the same absence rule as a broken step.
 */
export const scrubNumber = (
  start: number,
  travel: number,
  range: NumberRange,
  pixelsPerStep = SCRUB_PIXELS_PER_STEP,
): number => {
  if (!Number.isFinite(travel)) return start;
  const scale =
    Number.isFinite(pixelsPerStep) && pixelsPerStep > 0
      ? pixelsPerStep
      : SCRUB_PIXELS_PER_STEP;
  const steps = Math.sign(travel) * Math.round(Math.abs(travel) / scale);
  return stepNumber(start, range, steps);
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

/**
 * An edit in progress: the raw text, kept verbatim so the caret never jumps.
 *
 * Typing is not a value: text the reader has not made a number of yet leaves
 * `touched` alone, because a field that never had a value must stay empty when
 * the edit ends rather than paint the zero its state starts from. The caller
 * marks the draft with {@link withNumberDraftValue} when the text parses.
 */
export const withNumberDraftText = (
  draft: NumberDraft,
  text: string,
): NumberDraft => ({ ...draft, text: Option.some(text) });

/**
 * The field learned a number — a parsed edit, a step, or its owner's value.
 *
 * This is the only thing that gives a field something to show at rest, so a
 * blur over a field that never had one leaves the box empty.
 */
export const withNumberDraftValue = (draft: NumberDraft): NumberDraft => ({
  ...draft,
  touched: true,
});

/**
 * The edit is over: the field shows its value again.
 *
 * An empty or unreadable box is a cancelled edit, not a new value — the field
 * keeps the number it had, and a field that had none stays empty. That is why
 * `touched` survives: it records whether there is a number to show, not
 * whether the reader touched the box.
 */
export const commitNumberDraft = (draft: NumberDraft): NumberDraft => ({
  ...draft,
  text: Option.none(),
});

/** The value a piece of text means, once it is clamped into the range. */
const meansValue = (
  text: string,
  range: NumberRange,
  parseValue?: ParseValue,
): Option.Option<number> =>
  Option.map(parseNumberText(text, parseValue), (parsed) =>
    clampNumeric(parsed, range),
  );

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
 * and now has something to show. `parseValue` is the same reader the field
 * edits through, so a grouped `1,2345` a controlled owner echoes is the draft
 * that survives rather than text the decimal grammar rewrites under the caret.
 */
export const syncNumberDraft = (
  draft: NumberDraft,
  incoming: Option.Option<number>,
  range: NumberRange,
  parseValue?: ParseValue,
): Option.Option<NumberDraft> => {
  // No owner: the field owns its value, and nothing can override it.
  if (Option.isNone(incoming)) return Option.none();
  const value = incoming.value;
  // The owner's value did not move: the text being typed is still the user's.
  // `Object.is` rather than `===`, because `NaN` never equals itself: with
  // `===` a non-finite value folded on every render, each fold called
  // `setDraft`, and React stopped the field with "Too many re-renders".
  if (Object.is(Option.getOrUndefined(draft.incoming), value))
    return Option.none();
  const kept = Option.match(draft.text, {
    onSome: (text) =>
      Option.match(meansValue(text, range, parseValue), {
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
