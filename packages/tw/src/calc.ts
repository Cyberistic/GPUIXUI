/**
 * Compile-time numeric `calc()` for the tw compiler.
 *
 * Tailwind's `calc()` is arbitrary CSS; here it is restricted to what a GPUix
 * `StyleDesc` number can carry: numeric literals, `+ - * /`, parentheses and
 * `var(--token)` references to the theme's numeric scales. The expression is
 * evaluated against the theme at compile time to a plain number.
 *
 * Anything a number cannot carry — percentages, lengths (`px`/`rem`/`em`),
 * `min()`/`max()`/`clamp()` and any other function — is rejected with a reason
 * so the class lands in `TwResult.unsupported`, never silently dropped.
 *
 * The evaluator is a small recursive-descent parser; its character scanning is
 * deliberately imperative (a cursor over the source), which is the clearest
 * shape for this boundary, and the theme-scale read keeps one guarded cast —
 * `Object.hasOwn` proves the step exists before the index runs.
 */

import { Data } from "effect";
import type { Theme } from "@gpuixui/tokens";

/** A `calc()` that resolved to a number, or the reason it could not. */
export type CalcResult = Data.TaggedEnum<{
  Resolved: { readonly value: number };
  Rejected: { readonly reason: string };
}>;

/** The constructors, guard and matcher for {@link CalcResult}. */
export const CalcResult = Data.taggedEnum<CalcResult>();

/** The rejection reasons, one per class of unsupported expression. */
export const CALC_REASONS = {
  percentage: "calc() cannot express a percentage",
  unit: "calc() must resolve to a unitless number",
  function: "calc() does not support min()/max()/clamp()",
  unknownFunction: "calc() does not support this function",
  unknownToken: "calc() references an unknown theme token",
  syntax: "calc() could not be parsed",
} as const;

/** The numeric scales a `var(--token)` can reference, by their token prefix. */
const TOKEN_PREFIXES = [
  "icon-size",
  "spacing",
  "radius",
  "border-width",
  "control-height",
  "control-padding",
] as const;

/**
 * A guarded read of a theme scale by its token step.
 *
 * `Object.hasOwn` proves the key is present before the index, so the one
 * `Record<string, number>` view a fixed-key scale must take for a string key
 * is sound: an absent step returns `undefined` before the index runs.
 */
const scaleAt = (scale: object, key: string): number | undefined =>
  Object.hasOwn(scale, key)
    ? (scale as Readonly<Record<string, number>>)[key]
    : undefined;

/** The number a `--token` name resolves to, or nothing for an unknown step. */
export const themeTokenNumber = (
  theme: Theme,
  name: string,
): number | undefined => {
  const step = (prefix: string): string | undefined =>
    name.startsWith(`${prefix}-`) ? name.slice(prefix.length + 1) : undefined;

  const icon = step("icon-size");
  if (icon !== undefined) return scaleAt(theme.iconSize, icon);
  const spacing = step("spacing");
  if (spacing !== undefined) return scaleAt(theme.spacing, spacing);
  const radius = step("radius");
  if (radius !== undefined) return scaleAt(theme.radius, radius);
  const border = step("border-width");
  if (border !== undefined) return scaleAt(theme.borderWidth, border);
  const height = step("control-height");
  if (height !== undefined) return scaleAt(theme.density.controlHeight, height);
  const padding = step("control-padding");
  if (padding !== undefined)
    return scaleAt(theme.density.controlPaddingX, padding);
  return name === "row-height" ? theme.density.rowHeight : undefined;
};

/** Whether a `--token` name belongs to a known theme scale, without a theme. */
export const isThemeTokenName = (name: string): boolean =>
  name === "row-height" ||
  TOKEN_PREFIXES.some((prefix) => name.startsWith(`${prefix}-`));

/** Strips the `calc(` … `)` wrapper, or nothing when the string is not one. */
const calcInner = (expression: string): string | undefined => {
  const trimmed = expression.trim();
  return trimmed.startsWith("calc(") && trimmed.endsWith(")")
    ? trimmed.slice("calc(".length, trimmed.length - 1)
    : undefined;
};

const isDigit = (character: string): boolean =>
  character >= "0" && character <= "9";
const isLetter = (character: string): boolean =>
  (character >= "a" && character <= "z") ||
  (character >= "A" && character <= "Z");
const isSpace = (character: string): boolean =>
  character === " " || character === "\t" || character === "\n";

type ResolveToken = (name: string) => number | undefined;

const { Resolved, Rejected } = CalcResult;

/**
 * Parse and evaluate `calc(...)` against a token resolver.
 *
 * Recursive descent over `expr := term (('+'|'-') term)*`,
 * `term := unary (('*'|'/') unary)*`, `unary := '-' unary | atom`,
 * `atom := number | '(' expr ')' | 'var(--token)'`.
 */
const run = (expression: string, resolveToken: ResolveToken): CalcResult => {
  const inner = calcInner(expression);
  if (inner === undefined) return Rejected({ reason: CALC_REASONS.syntax });

  const source = inner;
  const cursor = { value: 0 };

  const skip = (): void => {
    while (
      cursor.value < source.length &&
      isSpace(source.charAt(cursor.value))
    ) {
      cursor.value += 1;
    }
  };
  const peek = (): string =>
    cursor.value < source.length ? source.charAt(cursor.value) : "";

  const number = (): number => {
    const start = cursor.value;
    while (
      cursor.value < source.length &&
      isDigit(source.charAt(cursor.value))
    ) {
      cursor.value += 1;
    }
    if (peek() === ".") {
      cursor.value += 1;
      while (
        cursor.value < source.length &&
        isDigit(source.charAt(cursor.value))
      ) {
        cursor.value += 1;
      }
    }
    return Number(source.slice(start, cursor.value));
  };

  const atom = (): CalcResult => {
    skip();
    const character = peek();
    if (character === "(") {
      cursor.value += 1;
      const value = expr();
      if (CalcResult.$is("Rejected")(value)) return value;
      skip();
      if (peek() !== ")") return Rejected({ reason: CALC_REASONS.syntax });
      cursor.value += 1;
      return value;
    }
    if (isDigit(character)) {
      const value = number();
      if (peek() === "%") return Rejected({ reason: CALC_REASONS.percentage });
      if (isLetter(peek())) return Rejected({ reason: CALC_REASONS.unit });
      return Resolved({ value });
    }
    if (isLetter(character)) {
      const start = cursor.value;
      while (
        cursor.value < source.length &&
        isLetter(source.charAt(cursor.value))
      ) {
        cursor.value += 1;
      }
      const name = source.slice(start, cursor.value);
      skip();
      if (peek() !== "(") return Rejected({ reason: CALC_REASONS.syntax });
      cursor.value += 1;
      if (name !== "var") {
        return Rejected({
          reason:
            name === "min" || name === "max" || name === "clamp"
              ? CALC_REASONS.function
              : CALC_REASONS.unknownFunction,
        });
      }
      skip();
      if (!source.startsWith("--", cursor.value))
        return Rejected({ reason: CALC_REASONS.syntax });
      cursor.value += 2;
      const tokenStart = cursor.value;
      while (
        cursor.value < source.length &&
        source.charAt(cursor.value) !== ")" &&
        !isSpace(source.charAt(cursor.value))
      ) {
        cursor.value += 1;
      }
      const token = source.slice(tokenStart, cursor.value);
      skip();
      if (peek() !== ")") return Rejected({ reason: CALC_REASONS.syntax });
      cursor.value += 1;
      const value = resolveToken(token);
      return value === undefined
        ? Rejected({ reason: CALC_REASONS.unknownToken })
        : Resolved({ value });
    }
    return Rejected({ reason: CALC_REASONS.syntax });
  };

  const unary = (): CalcResult => {
    skip();
    if (peek() === "-") {
      cursor.value += 1;
      return CalcResult.$match(unary(), {
        Resolved: ({ value }) => Resolved({ value: -value }),
        Rejected: (rejected) => rejected,
      });
    }
    return atom();
  };

  const term = (): CalcResult => {
    let left = unary();
    while (CalcResult.$is("Resolved")(left)) {
      skip();
      const operator = peek();
      if (operator !== "*" && operator !== "/") return left;
      cursor.value += 1;
      const right = unary();
      if (CalcResult.$is("Rejected")(right)) return right;
      left = Resolved({
        value:
          operator === "*"
            ? left.value * right.value
            : left.value / right.value,
      });
    }
    return left;
  };

  const expr = (): CalcResult => {
    let left = term();
    while (CalcResult.$is("Resolved")(left)) {
      skip();
      const operator = peek();
      if (operator !== "+" && operator !== "-") return left;
      cursor.value += 1;
      const right = term();
      if (CalcResult.$is("Rejected")(right)) return right;
      left = Resolved({
        value:
          operator === "+"
            ? left.value + right.value
            : left.value - right.value,
      });
    }
    return left;
  };

  const result = expr();
  if (CalcResult.$is("Rejected")(result)) return result;
  skip();
  return cursor.value === source.length
    ? result
    : Rejected({ reason: CALC_REASONS.syntax });
};

/** Evaluates `calc(...)` against the theme, to a number or a rejection reason. */
export const evaluateCalc = (expression: string, theme: Theme): CalcResult =>
  run(expression, (name) => themeTokenNumber(theme, name));

/** The reason a syntactically invalid `calc(...)` is rejected, or nothing. */
export const calcReason = (expression: string): string | undefined =>
  CalcResult.$match(
    run(expression, (name) => (isThemeTokenName(name) ? 0 : undefined)),
    {
      Resolved: () => undefined,
      Rejected: ({ reason }) => reason,
    },
  );

/** Every `calc(...)` occurrence in a class string, balanced over parentheses. */
export const calcExpressions = (source: string): ReadonlyArray<string> => {
  const results: Array<string> = [];
  let index = 0;
  while (index < source.length) {
    const start = source.indexOf("calc(", index);
    if (start === -1) break;
    let depth = 1;
    let end = start + "calc(".length;
    for (; end < source.length; end += 1) {
      if (source.charAt(end) === "(") depth += 1;
      else if (source.charAt(end) === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    results.push(source.slice(start, end + 1));
    index = end + 1;
  }
  return results;
};

/** The first `calc()` rejection reason in a class string, or nothing. */
export const calcReasonFromClass = (className: string): string | undefined => {
  for (const expression of calcExpressions(className)) {
    const reason = calcReason(expression);
    if (reason !== undefined) return reason;
  }
  return undefined;
};
