import { Data } from "effect";
import type { Theme } from "@gpuixui/tokens";

export type CalcResult = Data.TaggedEnum<{
  Resolved: { readonly value: number };
  Rejected: { readonly reason: string };
}>;

export const CalcResult = Data.taggedEnum<CalcResult>();

export const CALC_REASONS = {
  percentage: "calc() cannot express a percentage",
  unit: "calc() must resolve to a unitless number",
  function: "calc() does not support min()/max()/clamp()",
  unknownFunction: "calc() does not support this function",
  unknownToken: "calc() references an unknown theme token",
  syntax: "calc() could not be parsed",
} as const;

const TOKEN_PREFIXES = [
  "icon-size",
  "spacing",
  "radius",
  "border-width",
  "control-height",
  "control-padding",
] as const;

const scaleAt = (scale: object, key: string): number | undefined =>
  Object.hasOwn(scale, key)
    ? (scale as Readonly<Record<string, number>>)[key]
    : undefined;

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

export const isThemeTokenName = (name: string): boolean =>
  name === "row-height" ||
  TOKEN_PREFIXES.some((prefix) => name.startsWith(`${prefix}-`));

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

export const evaluateCalc = (expression: string, theme: Theme): CalcResult =>
  run(expression, (name) => themeTokenNumber(theme, name));

export const calcReason = (expression: string): string | undefined =>
  CalcResult.$match(
    run(expression, (name) => (isThemeTokenName(name) ? 0 : undefined)),
    {
      Resolved: () => undefined,
      Rejected: ({ reason }) => reason,
    },
  );

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

export const calcReasonFromClass = (className: string): string | undefined => {
  for (const expression of calcExpressions(className)) {
    const reason = calcReason(expression);
    if (reason !== undefined) return reason;
  }
  return undefined;
};
