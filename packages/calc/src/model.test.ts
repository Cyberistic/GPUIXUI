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
import { keypadKeys } from "./model.js";
import {
  ALPHA_KEYS,
  initialState,
  press,
  runAction,
  setMode,
  SHIFT_KEYS,
} from "./session.js";
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

  it("lays the keypad out as the device does", () => {
    const { cluster, functions, main } = fx991es.keypad;
    expect(Arr.map(cluster.left, (row) => row.keys.length)).toEqual([2, 2]);
    expect(Arr.map(cluster.right, (row) => row.keys.length)).toEqual([2, 2]);
    expect(Arr.map(functions, (row) => row.keys.length)).toEqual([6, 6, 6]);
    expect(Arr.map(main, (row) => row.keys.length)).toEqual([5, 5, 5, 5]);
    const ids = Arr.map(keypadKeys(fx991es.keypad), (key) => key.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(2 * 4 + 4 + 18 + 20);
  });

  // The legends the session leaves to the app (menus) or does not implement yet.
  // TODO: mixed fractions, INS, DRG▸, sexagesimal display and a b/c⇔d/c.
  const APP_LEGENDS = ["MODE", "AC", "7", "8", "9", "4", "5", "1", "2", "3"];
  const PRINTED_ONLY = ["frac", "°", "S⇔D", "DEL", "Ans"];

  const differs = (latch: "SHIFT" | "ALPHA", id: string) => {
    const start = keys(initialState(), ["2", "="]);
    const plain = keys(start, [id]);
    const latched = keys(start, [latch, id]);
    return JSON.stringify(plain) !== JSON.stringify(latched);
  };

  it("gives every printed SHIFT legend its meaning", () => {
    const keyed = Arr.filter(
      keypadKeys(fx991es.keypad),
      (key) => key.shift !== undefined,
    );
    for (const key of keyed) {
      expect(SHIFT_KEYS[key.id], key.id).toBeDefined();
      if (!APP_LEGENDS.includes(key.id) && !PRINTED_ONLY.includes(key.id))
        expect(differs("SHIFT", key.id), key.id).toBe(true);
    }
  });

  it("gives every printed ALPHA legend its meaning", () => {
    const keyed = Arr.filter(
      keypadKeys(fx991es.keypad),
      (key) => key.alpha !== undefined,
    );
    expect(keyed.length).toBe(Object.keys(ALPHA_KEYS).length);
    for (const key of keyed) {
      expect(ALPHA_KEYS[key.id], key.id).toBeDefined();
      expect(differs("ALPHA", key.id), key.id).toBe(true);
    }
  });

  it("reads SHIFT RCL as STO and RCL then a lettered key as that variable", () => {
    const stored = keys(initialState(), ["7", "=", "SHIFT", "RCL", "-"]);
    expect(stored.variables.A).toBe(7);
    const recalled = keys(stored, ["AC", "RCL", "-"]);
    expect(recalled.tokens).toEqual([variableToken("A")]);
  });

  it("enters i from ENG in CMPLX, as the device does", () => {
    const cmplx = setMode(initialState(), "CMPLX");
    const entered = keys(cmplx, ["ENG"]);
    expect(displayOf(entered).expression).toContain("i");
    expect(entered.engineering).toBe(false);
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
