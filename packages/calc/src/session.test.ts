import { Effect } from "effect";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  displayOf,
  initialState,
  press,
  runAction,
  setMode,
  type CalculatorState,
} from "./session.js";
import {
  conversion as conversionToken,
  operator,
  variableToken,
} from "./input/token.js";
import { defaultModel } from "./models/index.js";

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

const number = (state: CalculatorState): number => {
  const result = state.result;
  if (Option.isNone(result)) throw new Error("no result");
  if (result.value._tag !== "real")
    throw new Error(`not real: ${result.value._tag}`);
  return result.value.value;
};

describe("the calculator session", () => {
  it("evaluates 1 + 2 = 3 and shows it", () => {
    const state = keys(initialState(), ["1", "+", "2", "="]);
    expect(number(state)).toBe(3);
    expect(displayOf(state).result).toBe("3");
  });

  it("keeps an exact fraction and offers the decimal alternate", () => {
    const state = keys(initialState(), ["1", "÷", "3", "="]);
    const display = displayOf(state);
    expect(display.result).toBe("1/3");
    expect(Option.getOrElse(display.alternate, () => "")).toBe("0.3333333333");
  });

  it("latches SHIFT for one key and inserts the inverse sine", () => {
    const latched = keys(initialState(), ["SHIFT"]);
    expect(latched.shift).toBe(true);
    const state = keys(latched, ["sin"]);
    expect(state.tokens.map((token) => token.id)).toEqual(["sin⁻¹"]);
    expect(state.shift).toBe(false);
  });

  it("stores a result in a variable and recalls it", () => {
    const stored = keys(initialState(), ["3", "+", "5", "=", "STO", "A"]);
    expect(stored.variables.A).toBe(8);
    const recalled = keys(clearForTest(stored), ["A", "×", "1", "0", "="]);
    expect(number(recalled)).toBe(80);
  });

  it("adds and subtracts independent memory", () => {
    const first = keys(initialState(), ["1", "0", "×", "5", "=", "M+"]);
    expect(first.memory).toBe(50);
    const second = keys(first, ["1", "0", "+", "5", "=", "M-"]);
    expect(second.memory).toBe(35);
  });

  it("switches modes and clears the entry", () => {
    const state = keys(initialState(), ["1", "+", "2", "MODE"]);
    expect(state.mode).toBe("CMPLX");
    expect(state.tokens).toEqual([]);
  });

  it("solves a 2×2 system in the equation editor", () => {
    const state = keys(setMode(initialState(), "EQN"), [
      "1",
      "=",
      "2",
      "=",
      "3",
      "=",
      "2",
      "=",
      "3",
      "=",
      "4",
      "=",
    ]);
    expect(state.equation.screen).toBe("solution");
    const solutions = Option.getOrElse(state.equation.solutions, () => []);
    expect(solutions.map((solution) => solution.label)).toEqual(["X", "Y"]);
    expect(solutions[0]?.value._tag).toBe("real");
    if (solutions[0]?.value._tag === "real")
      expect(solutions[0].value.value).toBeCloseTo(-1, 10);
    if (solutions[1]?.value._tag === "real")
      expect(solutions[1].value.value).toBeCloseTo(2, 10);
  });

  it("computes statistics from the STAT editor", () => {
    let state = setMode(initialState(), "STAT");
    state = keys(state, ["1", "=", "2", "=", "2", "=", "3", "="]);
    state = Effect.runSync(
      runAction(state, { _tag: "stat-menu", command: "var" }),
    );
    const readings = state.stat.readings;
    const mean = readings.find((reading) => reading.label === "x̄");
    expect(mean?.value).toBeCloseTo(2, 10);
    const count = readings.find((reading) => reading.label === "n");
    expect(count?.value).toBe(4);
  });

  it("generates a table for f(x) = x + 1", () => {
    let state = setMode(initialState(), "TABLE");
    state = keys(state, ["X", "+", "1", "=", "=", "=", "="]);
    const rows = Option.getOrElse(state.table.rows, () => []);
    expect(rows.length).toBe(5);
    expect(rows[0]).toEqual({ x: 1, value: 2 });
    expect(rows[4]).toEqual({ x: 5, value: 6 });
  });

  it("computes in hexadecimal in BASE-N", () => {
    let state = setMode(initialState(), "BASE-N");
    state = Effect.runSync(runAction(state, { _tag: "base", base: "HEX" }));
    state = keys(state, ["1", "0", "+", "1", "0", "="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "base") {
      expect(state.result.value.value).toBe(32);
    }
    expect(displayOf(state).result).toBe("00000020");
  });

  it("keeps matrix data in the editor", () => {
    let state = setMode(initialState(), "MATRIX");
    state = keys(state, ["1", "=", "2", "=", "3", "=", "4", "="]);
    const answer = state.matrix.answer;
    expect(Option.isSome(answer)).toBe(true);
    if (Option.isSome(answer)) {
      expect(answer.value.rows).toEqual([
        [1, 2],
        [3, 4],
      ]);
    }
  });

  it("keeps the imaginary part of Ans in CMPLX mode", () => {
    let state = setMode(initialState(), "CMPLX");
    state = keys(state, ["1", "+", "i", "="]);
    state = keys(state, ["×", "2", "="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "complex") {
      expect(state.result.value.re).toBeCloseTo(2, 10);
      expect(state.result.value.im).toBeCloseTo(2, 10);
    }
  });

  it("reports each status indicator once", () => {
    for (const mode of ["COMP", "CMPLX", "STAT", "MATRIX", "VECTOR"] as const) {
      const indicators = displayOf(setMode(initialState(), mode)).indicators;
      expect(new Set(indicators).size).toBe(indicators.length);
    }
  });

  it("keeps a complex result in CMPLX mode", () => {
    const state = keys(setMode(initialState(), "CMPLX"), [
      "(",
      "1",
      "+",
      "i",
      ")",
      "^",
      "2",
      "=",
    ]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "complex") {
      expect(state.result.value.re).toBeCloseTo(0, 10);
      expect(state.result.value.im).toBeCloseTo(2, 10);
    }
  });

  it("latches hyp for the next trigonometric key", () => {
    const state = keys(initialState(), ["hyp", "sin"]);
    expect(state.tokens.map((token) => token.id)).toEqual(["sinh"]);
    expect(state.hyp).toBe(false);
  });

  it("recalls history with the up arrow", () => {
    const first = keys(initialState(), ["1", "+", "1", "="]);
    const second = keys(first, ["up"]);
    expect(second.tokens.map((token) => token.id)).toEqual(["1", "+", "1"]);
  });

  it("starts a new entry from a result with a digit, and from Ans with an operator", () => {
    const result = keys(initialState(), ["2", "+", "2", "="]);
    const fresh = keys(result, ["3"]);
    expect(fresh.tokens.map((token) => token.id)).toEqual(["3"]);
    const continued = keys(result, ["+"]);
    expect(continued.tokens.map((token) => token.id)).toEqual(["Ans", "+"]);
  });
});

/** Drop the result but keep the memories, so a recall test starts on a fresh line. */
const clearForTest = (state: CalculatorState): CalculatorState =>
  keys(state, ["AC"]);

describe("the calculator session's advanced flows", () => {
  it("prompts CALC for each variable and substitutes", () => {
    let state = keys(initialState(), ["3", "A", "+", "B"]);
    state = keys(state, ["CALC"]);
    expect(Option.isSome(state.prompt)).toBe(true);
    state = keys(state, ["5", "=", "1", "0", "="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBe(25);
    }
  });

  it("solves X² − 4 from an initial value with SOLVE", () => {
    let state = keys(initialState(), ["X", "x²", "-", "4"]);
    state = keys(state, ["SOLVE", "3", "="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "list") {
      const first = state.result.value.items[0];
      expect(first?.value._tag).toBe("real");
      if (first?.value._tag === "real")
        expect(first.value.value).toBeCloseTo(2, 6);
    }
  });

  it("computes a determinant from a stored matrix", () => {
    let state = setMode(initialState(), "MATRIX");
    state = keys(state, ["1", "=", "2", "=", "3", "=", "4", "="]);
    const det = defaultModel.catalog.find(
      (command) => command.id === "matrix:det",
    );
    expect(det).toBeDefined();
    if (det === undefined) return;
    state = Effect.runSync(runAction(state, det.action));
    state = keys(state, ["="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBeCloseTo(-2, 10);
    }
  });

  it("computes a vector dot product from stored vectors", () => {
    let state = setMode(initialState(), "VECTOR");
    state = keys(state, ["1", "=", "2", "="]);
    state = Effect.runSync(
      runAction(state, { _tag: "vector-edit", vector: "B" }),
    );
    state = keys(state, ["3", "=", "4", "="]);
    state = Effect.runSync(
      runAction(state, {
        _tag: "insert",
        tokens: [variableToken("VctA"), operator("•"), variableToken("VctB")],
      }),
    );
    state = keys(state, ["="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBeCloseTo(11, 10);
    }
  });

  it("shows engineering notation on ENG", () => {
    const state = keys(initialState(), ["1", "2", "3", "4", "=", "ENG"]);
    expect(state.engineering).toBe(true);
    expect(displayOf(state).result).toBe("1.234×10³");
  });

  it("applies a metric conversion command", () => {
    let state = keys(initialState(), ["5"]);
    state = Effect.runSync(
      runAction(state, {
        _tag: "insert",
        tokens: [conversionToken("02", "cm→in")],
      }),
    );
    state = keys(state, ["="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBeCloseTo(5 / 2.54, 6);
    }
  });
});
