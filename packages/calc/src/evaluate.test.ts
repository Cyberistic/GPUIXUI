import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { evaluate, emptySideEffects } from "./evaluate.js";
import { real } from "./value.js";
import {
  call,
  CLOSE,
  COMMA,
  constant,
  digit,
  OPEN,
  operator,
  type InputToken,
} from "./input/token.js";
import { parse } from "./parser.js";

const ctx = (overrides: Partial<Parameters<typeof evaluate>[1]> = {}) => ({
  angle: "Deg" as const,
  variables: {},
  ans: 0,
  ansValue: real(0),
  memory: 0,
  base: "DEC" as const,
  complex: false,
  matrices: {},
  vectors: {},
  roundDigits: 10,
  roundMode: "significant" as const,
  sideEffects: emptySideEffects(),
  ...overrides,
});

const run = (tokens: ReadonlyArray<InputToken>, overrides = {}) => {
  const parsed = parse(tokens);
  if (parsed._tag !== "ok") throw new Error(parsed.message);
  return Effect.runSync(evaluate(parsed.expr, ctx(overrides)));
};

const n = (value: string): InputToken => digit(value);
const op = (value: string): InputToken => operator(value);
const nums = (text: string): ReadonlyArray<InputToken> =>
  [...text].map((char) => n(char));

const expectNumber = (tokens: ReadonlyArray<InputToken>, value: number) => {
  const result = run(tokens);
  expect(result._tag).toBe("real");
  if (result._tag === "real") expect(result.value).toBeCloseTo(value, 10);
};

describe("the Casio parser and evaluator", () => {
  it("evaluates the manual's implicit multiplication example", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [
        ...nums("4"),
        op("×"),
        call("sin"),
        ...nums("30"),
        CLOSE,
        op("×"),
        OPEN,
        ...nums("30"),
        op("+"),
        ...nums("10"),
        op("×"),
        ...nums("3"),
        CLOSE,
      ],
      120,
    );
  });

  it("gives the postfix square priority over the negative sign", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber([op("-"), ...nums("2"), operator("x²")], -4);
    expectNumber([OPEN, op("-"), ...nums("2"), CLOSE, operator("x²")], 4);
  });

  it("makes powers right-associative", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [...nums("2"), op("^"), ...nums("3"), op("^"), ...nums("2")],
      512,
    );
  });

  it("binds implicit multiplication tighter than division", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [...nums("1"), op("÷"), ...nums("2"), constant("π")],
      1 / (2 * Math.PI),
    );
  });

  it("keeps 10÷3×3 at ten", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [...nums("10"), op("÷"), ...nums("3"), op("×"), ...nums("3")],
      10,
    );
  });

  it("implements the three percent forms", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber([...nums("150"), op("×"), ...nums("20"), operator("%")], 30);
    expectNumber([...nums("660"), op("÷"), ...nums("880"), operator("%")], 75);
    expectNumber(
      [
        ...nums("2500"),
        op("+"),
        ...nums("2500"),
        op("×"),
        ...nums("15"),
        operator("%"),
      ],
      2875,
    );
    expectNumber(
      [
        ...nums("3500"),
        op("-"),
        ...nums("3500"),
        op("×"),
        ...nums("25"),
        operator("%"),
      ],
      2625,
    );
  });

  it("evaluates logs, roots, factorials and combinations", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber([call("log"), ...nums("1000"), CLOSE], 3);
    expectNumber([call("log"), ...nums("2"), COMMA, ...nums("16"), CLOSE], 4);
    expectNumber([call("√"), ...nums("32"), CLOSE], Math.sqrt(32));
    expectNumber(
      [OPEN, ...nums("5"), op("+"), ...nums("3"), CLOSE, operator("!")],
      40320,
    );
    expectNumber([...nums("10"), operator("nPr"), ...nums("4")], 5040);
    expectNumber([...nums("10"), operator("nCr"), ...nums("4")], 210);
  });

  it("evaluates sexagesimal arithmetic", () => {
    const result = run([
      ...nums("2"),
      operator("°"),
      ...nums("20"),
      operator("′"),
      ...nums("30"),
      operator("″"),
      op("+"),
      ...nums("39"),
      operator("′"),
      ...nums("30"),
      operator("″"),
    ]);
    expect(result._tag).toBe("real");
    if (result._tag === "real") expect(result.value).toBeCloseTo(3, 9);
  });

  it("converts polar coordinates and writes X and Y", () => {
    const sideEffects = emptySideEffects();
    const result = run(
      [call("Pol"), ...nums("1"), COMMA, ...nums("1"), CLOSE],
      { sideEffects },
    );
    expect(result._tag).toBe("list");
    expect(sideEffects.x).toBeCloseTo(Math.SQRT2, 10);
    expect(sideEffects.y).toBeCloseTo(45, 10);
  });

  it("integrates and differentiates", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [
        call("∫"),
        constant("X"),
        op("+"),
        ...nums("1"),
        COMMA,
        ...nums("1"),
        COMMA,
        ...nums("5"),
        CLOSE,
      ],
      16,
    );
    expectNumber(
      [
        call("d/dx"),
        ...nums("3"),
        constant("X"),
        operator("x²"),
        op("-"),
        ...nums("5"),
        constant("X"),
        op("+"),
        ...nums("2"),
        COMMA,
        ...nums("2"),
        CLOSE,
      ],
      7,
    );
  });

  it("stores the manual's exact fraction", () => {
    const result = run([...nums("1"), op("÷"), ...nums("3")]);
    expect(result._tag).toBe("real");
    if (result._tag === "real") {
      expect(result.value).toBeCloseTo(1 / 3, 12);
      if (Option.isSome(result.exact))
        expect(Number(result.exact.value.n)).toBe(1);
    }
  });

  it("rejects division by zero with Math ERROR", () => {
    const parsed = parse([...nums("1"), op("÷"), ...nums("0")]);
    if (parsed._tag !== "ok") throw new Error("unexpected parse failure");
    const result = Effect.runSync(Effect.result(evaluate(parsed.expr, ctx())));
    expect(result._tag).toBe("Failure");
  });

  it("evaluates BASE-N literals in their base", () => {
    const result = run([...nums("10"), op("+"), ...nums("10")], {
      base: "HEX" as const,
    });
    expect(result._tag).toBe("base");
    if (result._tag === "base") expect(result.value).toBe(32);
  });
});

describe("the remaining manual functions", () => {
  it("sums a range with Σ", () => {
    // check-tests-ok: expectNumber asserts the computed value and its type.
    expectNumber(
      [
        call("Σ"),
        constant("X"),
        op("+"),
        ...nums("1"),
        COMMA,
        ...nums("1"),
        COMMA,
        ...nums("5"),
        CLOSE,
      ],
      20,
    );
  });

  it("converts polar to rectangular with Rec", () => {
    const sideEffects = emptySideEffects();
    const result = run(
      [call("Rec"), ...nums("2"), COMMA, ...nums("45"), CLOSE],
      { sideEffects },
    );
    expect(result._tag).toBe("list");
    expect(sideEffects.x).toBeCloseTo(Math.SQRT2, 10);
    expect(sideEffects.y).toBeCloseTo(Math.SQRT2, 10);
  });

  it("rounds with Rnd under the display digits", () => {
    const result = run(
      [
        call("Rnd"),
        ...nums("10"),
        op("÷"),
        ...nums("3"),
        CLOSE,
        op("×"),
        ...nums("3"),
      ],
      { roundDigits: 3, roundMode: "decimal" as const },
    );
    expect(result._tag).toBe("real");
    if (result._tag === "real") expect(result.value).toBeCloseTo(9.999, 10);
  });

  it("wraps bitwise operations in BASE-N", () => {
    const result = run([...nums("1010"), operator("and"), ...nums("1100")], {
      base: "BIN" as const,
    });
    expect(result._tag).toBe("base");
    if (result._tag === "base") expect(result.value).toBe(8);
  });

  it("keeps RanInt inside its inclusive range", () => {
    const results = Arr.makeBy(20, () => {
      const result = run([
        call("RanInt"),
        ...nums("1"),
        COMMA,
        ...nums("6"),
        CLOSE,
      ]);
      return result._tag === "base" ? result.value : Number.NaN;
    });
    expect(
      Arr.every(
        results,
        (value) => Number.isInteger(value) && value >= 1 && value <= 6,
      ),
    ).toBe(true);
  });
});
