import { Effect } from "effect";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  initialState,
  press,
  runAction,
  type CalculatorState,
} from "./session.js";
import { displayOf } from "./session.js";
import type { MathNode } from "./layout.js";

const keys = (
  state: CalculatorState,
  sequence: ReadonlyArray<string>,
): CalculatorState =>
  Effect.runSync(
    Effect.reduce(
      sequence,
      () => state,
      (current, key) => press(current, key),
    ),
  );

const textOf = (node: MathNode): string => {
  if (node.kind === "text") return node.text;
  if (node.kind === "row") return node.items.map(textOf).join("");
  if (node.kind === "fraction")
    return `${textOf(node.numerator)}/${textOf(node.denominator)}`;
  if (node.kind === "radical") return `√${textOf(node.radicand)}`;
  if (node.kind === "script")
    return `${textOf(node.base)}${textOf(node.script)}`;
  return "";
};

const caretCount = (node: MathNode): number => {
  if (node.kind === "caret") return 1;
  if (node.kind === "row")
    return node.items.reduce((total, item) => total + caretCount(item), 0);
  if (node.kind === "fraction")
    return caretCount(node.numerator) + caretCount(node.denominator);
  if (node.kind === "radical") return caretCount(node.radicand);
  if (node.kind === "script")
    return caretCount(node.base) + caretCount(node.script);
  return 0;
};

const hasScript = (node: MathNode): boolean => {
  if (node.kind === "script") return true;
  if (node.kind === "row") return node.items.some(hasScript);
  if (node.kind === "fraction")
    return hasScript(node.numerator) || hasScript(node.denominator);
  if (node.kind === "radical") return hasScript(node.radicand);
  return false;
};

const layoutText = (state: CalculatorState): string =>
  Option.match(displayOf(state).layout, {
    onNone: () => "",
    onSome: textOf,
  });

describe("Natural Display layout", () => {
  it("stacks 1 ÷ 3 as a fraction", () => {
    const state = keys(initialState(), ["1", "÷", "3", "="]);
    expect(layoutText(state)).toBe("1/3");
  });

  it("paints a radical with its radicand", () => {
    const state = keys(initialState(), ["2", "+", "√", "2", ")", "="]);
    expect(layoutText(state)).toBe("2+√2");
  });

  it("keeps both terms of the manual's two-radical result", () => {
    const state = keys(initialState(), [
      "(",
      "√",
      "2",
      ")",
      "+",
      "2",
      ")",
      "×",
      "√",
      "3",
      ")",
      "=",
    ]);
    expect(layoutText(state)).toBe("√6+2√3");
  });

  it("rationalizes 1 ÷ √2 as √2 over 2", () => {
    const state = keys(initialState(), ["1", "÷", "√", "2", ")", "="]);
    expect(layoutText(state)).toBe("√2/2");
  });

  it("stacks π ÷ 6 as π over 6", () => {
    const state = keys(initialState(), ["π", "÷", "6", "="]);
    expect(layoutText(state)).toBe("π/6");
  });

  it("renders the fraction key as a stacked input slot with one caret", () => {
    let state = keys(initialState(), ["frac"]);
    const input = displayOf(state).inputLayout;
    expect(Option.isSome(input)).toBe(true);
    if (Option.isSome(input)) {
      expect(textOf(input.value)).toBe("/");
      expect(caretCount(input.value)).toBe(1);
    }
    state = keys(state, ["1", "right", "3"]);
    expect(state.tokens.map((token) => token.id)).toEqual([
      "(",
      "1",
      ")",
      "÷",
      "(",
      "3",
      ")",
    ]);
    expect(displayOf(state).result).toBe("");
    state = keys(state, ["="]);
    expect(layoutText(state)).toBe("1/3");
  });

  it("moves the caret between the fraction's slots and deletes in place", () => {
    let state = keys(initialState(), ["frac", "1", "right"]);
    expect(state.cursor).toBe(5);
    state = keys(state, ["left"]);
    expect(state.cursor).toBe(2);
    state = keys(state, ["right", "3"]);
    expect(state.cursor).toBe(6);
    state = keys(state, ["DEL"]);
    expect(state.tokens.map((token) => token.text).join("")).toBe("(1)÷()");
  });

  it("renders a radical input slot and evaluates it", () => {
    let state = keys(initialState(), ["√", "2", ")"]);
    const input = displayOf(state).inputLayout;
    expect(Option.isSome(input)).toBe(true);
    if (Option.isSome(input)) expect(textOf(input.value)).toBe("√2");
    state = keys(state, ["="]);
    expect(layoutText(state)).toBe("√2");
  });

  it("renders a superscript input slot", () => {
    let state = keys(initialState(), ["2", "^", "3"]);
    const input = displayOf(state).inputLayout;
    expect(Option.isSome(input)).toBe(true);
    if (Option.isSome(input)) {
      expect(hasScript(input.value)).toBe(true);
    }
    state = keys(state, ["="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBe(8);
    }
  });

  it("does not stack in LineIO", () => {
    let state = initialState();
    state = Effect.runSync(
      runAction(state, {
        _tag: "setup",
        setup: { display: "LineIO" },
      }),
    );
    state = keys(state, ["1", "÷", "3", "="]);
    expect(Option.isNone(displayOf(state).layout)).toBe(true);
    expect(displayOf(state).result).toBe("0.3333333333");
  });

  it("drops the layout on S⇔D", () => {
    let state = keys(initialState(), ["1", "÷", "3", "="]);
    state = Effect.runSync(runAction(state, { _tag: "alternate" }));
    expect(Option.isNone(displayOf(state).layout)).toBe(true);
    expect(displayOf(state).result).toBe("0.3333333333");
  });
});
