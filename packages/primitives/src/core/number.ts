import * as Option from "effect/Option";
import * as Str from "effect/String";
import { visibleCopy } from "./a11y.js";
import { storedNumber } from "./stored.js";

export interface NumberRange {
  readonly min?: number;
  readonly max?: number;
  readonly step: number;
}

const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export const parseNumericText = (text: string): Option.Option<number> => {
  const trimmed = text.trim();
  if (!NUMERIC.test(trimmed)) return Option.none();
  const value = Number(trimmed);
  return Number.isFinite(value) ? Option.some(value) : Option.none();
};

export type ParseValue = (text: string) => Option.Option<number>;

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

const paintable = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => (Number.isFinite(value) ? value : (min ?? max ?? 0));

export const clampNumeric = (value: number, range: NumberRange): number => {
  const { min, max } = numericBounds(range);
  const finite = paintable(value, min, max);
  const aboveMin = min === undefined ? finite : Math.max(min, finite);
  return max === undefined ? aboveMin : Math.min(max, aboveMin);
};

const NEGATIVE_ZERO = /^-0(?:\.0+)?$/;

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

export const formatNumber = (value: number, precision = 0): string => {
  const decimals = Math.min(20, Math.max(0, Math.trunc(precision)));
  const fixed = value.toFixed(decimals);
  const text = Str.includes("e")(fixed) ? plainFixed(fixed, decimals) : fixed;
  return NEGATIVE_ZERO.test(text) ? Str.slice(1)(text) : text;
};

const writtenDecimals = (value: number): number => {
  const [mantissa = "", exponentText] = Str.split(/e/i)(String(value));
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [, fraction = ""] = Str.split(".")(mantissa);
  return Math.max(0, Str.length(fraction) - exponent);
};

const decimalsOf = (value: number): number =>
  Math.min(15, writtenDecimals(value));

export const expandedNumber = (value: number): string => {
  const text = String(value);
  if (!Str.includes("e")(text)) return text;
  const [mantissa = "0", exponentText = "0"] = Str.split(/e/i)(text);
  const negative = Str.startsWith("-")(mantissa);
  const unsigned = negative ? Str.slice(1)(mantissa) : mantissa;
  const [whole = "0", fraction = ""] = Str.split(".")(unsigned);
  const digits = `${whole}${fraction}`;
  const point = Str.length(whole) + Number(exponentText);
  const body =
    point <= 0
      ? `0.${Str.repeat(-point)("0")}${digits}`
      : point >= Str.length(digits)
        ? `${digits}${Str.repeat(point - Str.length(digits))("0")}`
        : `${Str.slice(0, point)(digits)}.${Str.slice(point)(digits)}`;
  return `${negative ? "-" : ""}${body}`;
};

const precisionOf = (precision: unknown): Option.Option<number> =>
  Option.filter(storedNumber(precision), Number.isFinite);

export const displayNumber = (value: number, precision?: unknown): string =>
  Option.match(precisionOf(precision), {
    onNone: () => expandedNumber(value),
    onSome: (decimals) => formatNumber(value, decimals),
  });

export const numberDisplay = (
  value: number,
  precision: unknown,
  formatValue?: (value: number) => string,
): string =>
  visibleCopy(formatValue?.(value)) ?? displayNumber(value, precision);

export const stepNumber = (
  value: number,
  range: NumberRange,
  steps: number,
): number => {
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : 1;

  const from = clampNumeric(value, range);
  const scale = 10 ** Math.max(decimalsOf(step), decimalsOf(from));
  const moved = Math.round((from + steps * step) * scale) / scale;
  return clampNumeric(moved, range);
};

export const SCRUB_PIXELS_PER_STEP = 4;

export const SHIFT_SCRUB_SCALE = 10;

export const scrubNumber = (
  start: number,
  travel: number,
  range: NumberRange,
  pixelsPerStep = SCRUB_PIXELS_PER_STEP,
  stepScale = 1,
): number => {
  if (!Number.isFinite(travel)) return start;
  const scale =
    Number.isFinite(pixelsPerStep) && pixelsPerStep > 0
      ? pixelsPerStep
      : SCRUB_PIXELS_PER_STEP;
  const multiplier =
    Number.isFinite(stepScale) && stepScale > 0 ? stepScale : 1;
  const steps =
    Math.sign(travel) * Math.round(Math.abs(travel) / scale) * multiplier;
  return stepNumber(start, range, steps);
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  up: 1,
  down: -1,
};

export const decideNumberKey = (
  value: number,
  range: NumberRange,
  key: string,
  pageSteps = 10,
): Option.Option<number> => {
  const { min, max } = normalizeNumberRange(range);
  if (key === "home")
    return min === undefined ? Option.none() : Option.some(min);
  if (key === "end")
    return max === undefined ? Option.none() : Option.some(max);
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

export interface NumberDraft {
  readonly text: Option.Option<string>;
  readonly incoming: Option.Option<number>;
  readonly touched: boolean;
}

export const initNumberDraft = (
  incoming: Option.Option<number>,
  hasValue: boolean,
): NumberDraft => ({
  text: Option.none(),
  incoming,
  touched: hasValue || Option.isSome(incoming),
});

export const numberDraftText = (
  draft: NumberDraft,
  current: number,
  display: (value: number) => string,
): string =>
  Option.match(draft.text, {
    onSome: (text) => text,
    onNone: () => (draft.touched ? display(current) : ""),
  });

export const withNumberDraftText = (
  draft: NumberDraft,
  text: string,
): NumberDraft => ({ ...draft, text: Option.some(text) });

export const withNumberDraftValue = (draft: NumberDraft): NumberDraft => ({
  ...draft,
  touched: true,
});

export const commitNumberDraft = (draft: NumberDraft): NumberDraft => ({
  ...draft,
  text: Option.none(),
});

const meansValue = (
  text: string,
  range: NumberRange,
  parseValue?: ParseValue,
): Option.Option<number> =>
  Option.map(parseNumberText(text, parseValue), (parsed) =>
    clampNumeric(parsed, range),
  );

export const syncNumberDraft = (
  draft: NumberDraft,
  incoming: Option.Option<number>,
  range: NumberRange,
  parseValue?: ParseValue,
): Option.Option<NumberDraft> => {
  if (Option.isNone(incoming)) return Option.none();
  const value = incoming.value;

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
