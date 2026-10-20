/**
 * The compile-time numeric `calc()` evaluator.
 *
 * Bug guarded: `calc()` was recorded as unsupported wholesale (an arbitrary
 * CSS value with no `StyleDesc`), so token arithmetic could not be expressed
 * as a class. It now resolves numeric literals, `+ - * /`, parentheses and
 * `var(--token)` against the theme, and rejects percentages, units, functions
 * and unknown tokens with a recorded reason — never a silent drop.
 */

import { describe, expect, it } from "vitest";
import { lightTheme } from "@gpuixui/tokens";
import {
  CALC_REASONS,
  CalcResult,
  calcReason,
  calcReasonFromClass,
  evaluateCalc,
  themeTokenNumber,
} from "./calc.js";

const value = (expression: string): number =>
  CalcResult.$match(evaluateCalc(expression, lightTheme), {
    Resolved: ({ value }) => value,
    Rejected: ({ reason }) => expect.fail(`calc rejected: ${reason}`),
  });

const reason = (expression: string): string =>
  CalcResult.$match(evaluateCalc(expression, lightTheme), {
    Resolved: ({ value }) => expect.fail(`calc resolved to ${value}`),
    Rejected: ({ reason: value }) => value,
  });

describe("evaluateCalc", () => {
  it("evaluates arithmetic and numeric literals", () => {
    expect(value("calc(1 + 2)")).toBe(3);
    expect(value("calc(1-2)")).toBe(-1);
    expect(value("calc(2 * 3)")).toBe(6);
    expect(value("calc(8 / 4)")).toBe(2);
    expect(value("calc(1.5 * 2)")).toBe(3);
    expect(value("calc(0.1 + 0.2)")).toBeCloseTo(0.3);
  });

  it("honours precedence and parentheses", () => {
    expect(value("calc(2 + 3 * 4)")).toBe(14);
    expect(value("calc((2 + 3) * 4)")).toBe(20);
    expect(value("calc(10 - 2 - 3)")).toBe(5);
    expect(value("calc(16 / 4 / 2)")).toBe(2);
    expect(value("calc(-(1 + 2))")).toBe(-3);
  });

  it("resolves var(--token) against the theme scales", () => {
    expect(value("calc(var(--icon-size-md) * 1.75)")).toBe(28);
    expect(value("calc(var(--spacing-sm) + var(--spacing-md))")).toBe(14);
    expect(value("calc(var(--border-width-strong) * 2)")).toBe(4);
    expect(value("calc(var(--control-height-md) / 2)")).toBe(16);
    expect(value("calc(var(--row-height))")).toBe(lightTheme.density.rowHeight);
  });
});

describe("themeTokenNumber", () => {
  it("reads a scale step and returns nothing for an unknown one", () => {
    expect(themeTokenNumber(lightTheme, "icon-size-md")).toBe(16);
    expect(themeTokenNumber(lightTheme, "spacing-2xs")).toBe(2);
    expect(themeTokenNumber(lightTheme, "icon-size-xxl")).toBeUndefined();
    expect(themeTokenNumber(lightTheme, "colour-primary")).toBeUndefined();
  });
});

describe("calc rejections", () => {
  it("rejects a percentage", () => {
    expect(reason("calc(50%)")).toBe(CALC_REASONS.percentage);
    expect(reason("calc(1 + 50%)")).toBe(CALC_REASONS.percentage);
  });

  it("rejects a length unit", () => {
    expect(reason("calc(2px)")).toBe(CALC_REASONS.unit);
    expect(reason("calc(1rem + 2em)")).toBe(CALC_REASONS.unit);
  });

  it("rejects min(), max() and clamp()", () => {
    expect(reason("calc(min(1, 2))")).toBe(CALC_REASONS.function);
    expect(reason("calc(max(1, 2))")).toBe(CALC_REASONS.function);
    expect(reason("calc(clamp(1, 2, 3))")).toBe(CALC_REASONS.function);
  });

  it("rejects an unknown function", () => {
    expect(reason("calc(round(1.5))")).toBe(CALC_REASONS.unknownFunction);
    expect(reason("calc(sqrt(4))")).toBe(CALC_REASONS.unknownFunction);
  });

  it("rejects an unknown token", () => {
    expect(reason("calc(var(--colour-primary))")).toBe(
      CALC_REASONS.unknownToken,
    );
    expect(reason("calc(var(--icon-size-xxl))")).toBe(
      CALC_REASONS.unknownToken,
    );
  });

  it("rejects a malformed expression", () => {
    expect(reason("calc(1 +)")).toBe(CALC_REASONS.syntax);
    expect(reason("calc((1 + 2)")).toBe(CALC_REASONS.syntax);
    expect(reason("calc()")).toBe(CALC_REASONS.syntax);
    expect(reason("calc(1 2)")).toBe(CALC_REASONS.syntax);
  });
});

describe("calcReasonFromClass", () => {
  it("reports the reason behind an unsupported arbitrary value", () => {
    expect(calcReason("calc(50%)")).toBe(CALC_REASONS.percentage);
    expect(calcReasonFromClass("w-[calc(50%)]")).toBe(CALC_REASONS.percentage);
    expect(
      calcReasonFromClass("h-[calc(var(--icon-size-md)*2)]"),
    ).toBeUndefined();
    expect(calcReason("calc(var(--icon-size-md)*2)")).toBeUndefined();
  });
});
