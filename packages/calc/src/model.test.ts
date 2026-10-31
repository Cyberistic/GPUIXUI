import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  calculatorKeyOf,
  isApplicationChord,
  modeChordIndex,
} from "./input/keyboard.js";
import { modelOf, models } from "./models/index.js";
import { fx991es } from "./models/fx991es.js";
import { initialState, press, runAction, setMode } from "./session.js";
import { displayOf } from "./session.js";
import { variableToken } from "./input/token.js";

const keys = (
  state: ReturnType<typeof initialState>,
  sequence: ReadonlyArray<string>,
) =>
  Effect.runSync(
    Effect.reduce(
      sequence,
      () => state,
      (current, key) => press(current, key),
    ),
  );

describe("the fx-991ES Plus model", () => {
  it("carries the manual's eight modes", () => {
    expect(fx991es.modes.map((mode) => mode.mode)).toEqual([
      "COMP",
      "CMPLX",
      "STAT",
      "BASE-N",
      "EQN",
      "MATRIX",
      "TABLE",
      "VECTOR",
    ]);
    expect(fx991es.modes.map((mode) => mode.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("has unique keypad ids and a legend for every key", () => {
    const ids = Arr.flatMap(fx991es.keypad, (row) =>
      Arr.map(row.keys, (key) => key.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("SHIFT");
    expect(ids).toContain("=");
    expect(ids).toContain("sin");
  });

  it("offers every mode key and the full catalog with unique ids", () => {
    const ids = Arr.map(fx991es.catalog, (command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(180);
    expect(
      Arr.filter(fx991es.catalog, (command) => command.group === "Constants")
        .length,
    ).toBe(40);
    expect(
      Arr.filter(fx991es.catalog, (command) => command.group === "Conversions")
        .length,
    ).toBe(40);
  });

  it("marks VERIFY absent with the manual's reason", () => {
    expect(fx991es.capabilities.verify).toBe(false);
    expect(fx991es.capabilities.notes.join(" ")).toContain("VERIFY");
  });

  it("exposes the model through the registry, not by direct import", () => {
    expect(Option.isSome(modelOf("fx991es"))).toBe(true);
    expect(Option.isNone(modelOf("ti84"))).toBe(true);
    expect(models.fx991es?.label).toBe("fx-991ES Plus");
  });

  it("runs a catalog insertion", () => {
    const det = fx991es.catalog.find((command) => command.id === "matrix:det");
    expect(det).toBeDefined();
    if (det === undefined) return;
    const state = Effect.runSync(runAction(initialState(), det.action));
    expect(state.tokens.map((token) => token.id)).toEqual(["det", "MatA", ")"]);
  });

  it("evaluates a named scientific constant", () => {
    const constant = fx991es.catalog.find(
      (command) => command.id === "const:28",
    );
    expect(constant).toBeDefined();
    if (constant === undefined) return;
    let state = Effect.runSync(runAction(initialState(), constant.action));
    state = keys(state, ["="]);
    expect(state.result._tag).toBe("Some");
    if (state.result._tag === "Some" && state.result.value._tag === "real") {
      expect(state.result.value.value).toBeCloseTo(299792458, 1);
    }
  });

  it("inserts MatA and evaluates a determinant through the palette's tokens", () => {
    let state = setMode(initialState(), "MATRIX");
    state = keys(state, ["1", "=", "2", "=", "3", "=", "4", "="]);
    state = Effect.runSync(
      runAction(state, { _tag: "matrix-calc", screen: "calc" }),
    );
    state = Effect.runSync(
      runAction(state, {
        _tag: "insert",
        tokens: [variableToken("MatA")],
      }),
    );
    expect(displayOf(state).expression).toContain("MatA");
  });
});

describe("the computer keyboard map", () => {
  it("maps arithmetic and editing keys", () => {
    expect(Option.getOrElse(calculatorKeyOf({ key: "1" }), () => "")).toBe("1");
    expect(Option.getOrElse(calculatorKeyOf({ key: "*" }), () => "")).toBe("×");
    expect(Option.getOrElse(calculatorKeyOf({ key: "-" }), () => "")).toBe(
      "minus",
    );
    expect(Option.getOrElse(calculatorKeyOf({ key: "/" }), () => "")).toBe("÷");
    expect(Option.getOrElse(calculatorKeyOf({ key: "enter" }), () => "")).toBe(
      "=",
    );
    expect(Option.getOrElse(calculatorKeyOf({ key: "escape" }), () => "")).toBe(
      "AC",
    );
    expect(
      Option.getOrElse(calculatorKeyOf({ key: "backspace" }), () => ""),
    ).toBe("DEL");
  });

  it("maps the scientific letters and their shifted forms", () => {
    expect(Option.getOrElse(calculatorKeyOf({ key: "s" }), () => "")).toBe(
      "sin",
    );
    expect(
      Option.getOrElse(calculatorKeyOf({ key: "s", shift: true }), () => ""),
    ).toBe("sin⁻¹");
    expect(Option.getOrElse(calculatorKeyOf({ key: "p" }), () => "")).toBe("π");
    expect(Option.getOrElse(calculatorKeyOf({ key: "x" }), () => "")).toBe("X");
  });

  it("leaves the application chords alone", () => {
    expect(Option.isNone(calculatorKeyOf({ key: "k", cmd: true }))).toBe(true);
    expect(isApplicationChord({ key: "k", cmd: true })).toBe(true);
    expect(
      Option.getOrElse(modeChordIndex({ key: "3", cmd: true }), () => 0),
    ).toBe(3);
    expect(Option.isNone(modeChordIndex({ key: "9", cmd: true }))).toBe(true);
  });
});
