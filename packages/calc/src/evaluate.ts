/**
 * Evaluate a parsed Casio expression.
 *
 * Expected failures travel in the Effect error channel as `CalculatorFailure`.
 * Randomness for `Ran#`/`RanInt#` comes from Effect's `Random`, so a test can
 * provide a seeded implementation instead of mocking a global. `Pol` and `Rec`
 * write their X/Y results through the context, which the session copies back to
 * the variables — exactly the manual's documented side effect.
 */

import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Random from "effect/Random";
import { metricConversions, scientificConstants } from "./constants.js";
import { failure, isFailure, type CalculatorFailure } from "./failure.js";
import type { Expr } from "./parser.js";
import type { AngleUnit, BaseName } from "./setup.js";
import {
  acosScalar,
  acoshScalar,
  addScalar,
  argument,
  asinScalar,
  asinhScalar,
  atanScalar,
  atanhScalar,
  asNumber,
  complex,
  conjugate,
  cosScalar,
  coshScalar,
  divideScalar,
  expScalar,
  inRange,
  literal,
  isReal,
  lnScalar,
  logScalar,
  magnitude,
  multiplyScalar,
  negate,
  powerScalar,
  real,
  rootScalar,
  roundScalar,
  sinScalar,
  sinhScalar,
  sqrtScalar,
  subtractScalar,
  tanScalar,
  tanhScalar,
  type CalcValue,
  type MatrixValue,
  type Scalar,
  type VectorValue,
} from "./value.js";

/** Values a function writes back beyond its result. */
export interface SideEffects {
  x?: number;
  y?: number;
}

/** The live values one expression sees. */
export interface EvaluationContext {
  readonly angle: AngleUnit;
  readonly variables: Readonly<Record<string, number>>;
  readonly ans: number;
  readonly ansValue: CalcValue;
  readonly memory: number;
  readonly base: BaseName;
  readonly complex: boolean;
  readonly matrices: Readonly<Record<string, MatrixValue>>;
  readonly vectors: Readonly<Record<string, VectorValue>>;
  readonly roundDigits: number;
  readonly roundMode: "decimal" | "significant";
  readonly sideEffects: SideEffects;
}

export const emptySideEffects = (): SideEffects => ({});

const factorOf = (unit: AngleUnit): number =>
  unit === "Deg" ? Math.PI / 180 : unit === "Gra" ? Math.PI / 200 : 1;

const toRadians = (value: number, unit: AngleUnit): number =>
  value * factorOf(unit);

const fromRadians = (value: number, unit: AngleUnit): number =>
  value / factorOf(unit);

const scalarOf = (value: CalcValue): Option.Option<Scalar> =>
  value._tag === "real" || value._tag === "complex"
    ? Option.some(value)
    : Option.none();

const numberIn = (value: CalcValue): Option.Option<number> =>
  Option.flatMap(scalarOf(value), asNumber);

const integerIn = (value: CalcValue): Option.Option<number> =>
  Option.filter(numberIn(value), Number.isInteger);

const integerAny = (value: CalcValue): Option.Option<number> =>
  value._tag === "base" ? Option.some(value.value) : integerIn(value);

const matrixIn = (value: CalcValue): Option.Option<MatrixValue> =>
  value._tag === "matrix" ? Option.some(value) : Option.none();

const vectorIn = (value: CalcValue): Option.Option<VectorValue> =>
  value._tag === "vector" ? Option.some(value) : Option.none();

const displayable = (
  value: CalcValue,
  ctx: EvaluationContext,
): Effect.Effect<CalcValue, CalculatorFailure> => {
  if (value._tag === "complex" && !ctx.complex) {
    return Effect.fail(failure("Argument"));
  }
  if (value._tag === "real" || value._tag === "complex") {
    return inRange(value)
      ? Effect.succeed(value)
      : Effect.fail(failure("Math"));
  }
  if (value._tag === "matrix") {
    return Arr.every(Arr.flatten(value.rows), Number.isFinite)
      ? Effect.succeed(value)
      : Effect.fail(failure("Math"));
  }
  if (value._tag === "vector") {
    return Arr.every(value.items, Number.isFinite)
      ? Effect.succeed(value)
      : Effect.fail(failure("Math"));
  }
  return Effect.succeed(value);
};

const fromValue = (
  value: CalcValue | CalculatorFailure,
  ctx: EvaluationContext,
): Effect.Effect<CalcValue, CalculatorFailure> =>
  isFailure(value) ? Effect.fail(value) : displayable(value, ctx);

/* ------------------------------------------------------------------ */
/* Matrices and vectors                                                */
/* ------------------------------------------------------------------ */

const matrix = (rows: ReadonlyArray<ReadonlyArray<number>>): MatrixValue => ({
  _tag: "matrix",
  rows,
});

const vector = (items: ReadonlyArray<number>): VectorValue => ({
  _tag: "vector",
  items,
});

const sameShape = (left: MatrixValue, right: MatrixValue): boolean =>
  left.rows.length === right.rows.length &&
  Arr.every(
    left.rows,
    (row, index) => row.length === right.rows[index]?.length,
  );

const multiplyRows = (
  left: ReadonlyArray<ReadonlyArray<number>>,
  right: ReadonlyArray<ReadonlyArray<number>>,
): ReadonlyArray<ReadonlyArray<number>> =>
  Arr.map(left, (row) =>
    Arr.map(Arr.range(0, (right[0]?.length ?? 1) - 1), (column) =>
      Arr.reduce(
        Arr.range(0, right.length - 1),
        0,
        (total, index) =>
          total + (row[index] ?? 0) * (right[index]?.[column] ?? 0),
      ),
    ),
  );

const identity = (size: number): ReadonlyArray<ReadonlyArray<number>> =>
  Arr.map(Arr.range(0, size - 1), (row) =>
    Arr.map(Arr.range(0, size - 1), (column) => (row === column ? 1 : 0)),
  );

export const determinant = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
): number => {
  if (rows.length === 1) return rows[0]?.[0] ?? 0;
  if (rows.length === 2) {
    const [a = 0, b = 0] = rows[0] ?? [];
    const [c = 0, d = 0] = rows[1] ?? [];
    return a * d - b * c;
  }
  const [a = 0, b = 0, c = 0] = rows[0] ?? [];
  const [d = 0, e = 0, f = 0] = rows[1] ?? [];
  const [g = 0, h = 0, i = 0] = rows[2] ?? [];
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
};

const transpose = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
): ReadonlyArray<ReadonlyArray<number>> =>
  Arr.map(Arr.range(0, (rows[0]?.length ?? 1) - 1), (column) =>
    Arr.map(rows, (row) => row[column] ?? 0),
  );

const inverseRows = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
): Option.Option<ReadonlyArray<ReadonlyArray<number>>> => {
  if (rows.length === 1) {
    const value = rows[0]?.[0] ?? 0;
    return value === 0 ? Option.none() : Option.some([[1 / value]]);
  }
  if (rows.length === 2) {
    const [a = 0, b = 0] = rows[0] ?? [];
    const [c = 0, d = 0] = rows[1] ?? [];
    const det = a * d - b * c;
    return det === 0
      ? Option.none()
      : Option.some([
          [d / det, -b / det],
          [-c / det, a / det],
        ]);
  }
  if (rows.length === 3) {
    const det = determinant(rows);
    if (det === 0) return Option.none();
    const [a = 0, b = 0, c = 0] = rows[0] ?? [];
    const [d = 0, e = 0, f = 0] = rows[1] ?? [];
    const [g = 0, h = 0, i = 0] = rows[2] ?? [];
    return Option.some([
      [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
      [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
      [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ]);
  }
  return Option.none();
};

const dot = (
  left: ReadonlyArray<number>,
  right: ReadonlyArray<number>,
): number =>
  Arr.reduce(
    Arr.range(0, Math.min(left.length, right.length) - 1),
    0,
    (total, index) => total + (left[index] ?? 0) * (right[index] ?? 0),
  );

const cross = (
  left: ReadonlyArray<number>,
  right: ReadonlyArray<number>,
): Option.Option<ReadonlyArray<number>> =>
  left.length === 3 && right.length === 3
    ? Option.some([
        (left[1] ?? 0) * (right[2] ?? 0) - (left[2] ?? 0) * (right[1] ?? 0),
        (left[2] ?? 0) * (right[0] ?? 0) - (left[0] ?? 0) * (right[2] ?? 0),
        (left[0] ?? 0) * (right[1] ?? 0) - (left[1] ?? 0) * (right[0] ?? 0),
      ])
    : Option.none();

const scaleRows = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
  factor: number,
): MatrixValue =>
  matrix(Arr.map(rows, (row) => Arr.map(row, (value) => value * factor)));

const matrixBinary = (
  op: string,
  left: CalcValue,
  right: CalcValue,
): Option.Option<CalcValue | CalculatorFailure> =>
  Option.match(matrixIn(left), {
    onNone: () =>
      Option.match(matrixIn(right), {
        onNone: () => Option.none(),
        onSome: (matrixRight) =>
          Option.match(numberIn(left), {
            onNone: () => Option.none(),
            onSome: (factor) =>
              Option.some(
                op === "×"
                  ? scaleRows(matrixRight.rows, factor)
                  : failure("Dimension"),
              ),
          }),
      }),
    onSome: (matrixLeft) =>
      Option.match(matrixIn(right), {
        onNone: () =>
          Option.match(numberIn(right), {
            onNone: () => Option.some(failure("Dimension")),
            onSome: (factor) => {
              if (op === "×")
                return Option.some(scaleRows(matrixLeft.rows, factor));
              if (op === "÷") {
                return Option.some(
                  factor === 0
                    ? failure("Math")
                    : matrix(
                        Arr.map(matrixLeft.rows, (row) =>
                          Arr.map(row, (value) => value / factor),
                        ),
                      ),
                );
              }
              if (op === "^") {
                if (
                  !Number.isInteger(factor) ||
                  factor < 0 ||
                  matrixLeft.rows.length !== (matrixLeft.rows[0]?.length ?? 0)
                ) {
                  return Option.some(
                    failure(
                      Number.isInteger(factor) ? "Dimension" : "Argument",
                    ),
                  );
                }
                return Option.some(
                  matrix(
                    Arr.reduce(
                      Arr.range(1, factor),
                      identity(matrixLeft.rows.length),
                      (accumulated) =>
                        multiplyRows(accumulated, matrixLeft.rows),
                    ),
                  ),
                );
              }
              return Option.some(failure("Dimension"));
            },
          }),
        onSome: (matrixRight) => {
          if (op === "+" || op === "-") {
            if (!sameShape(matrixLeft, matrixRight)) {
              return Option.some(failure("Dimension"));
            }
            return Option.some(
              matrix(
                Arr.map(matrixLeft.rows, (row, index) =>
                  Arr.map(row, (value, column) =>
                    op === "+"
                      ? value + (matrixRight.rows[index]?.[column] ?? 0)
                      : value - (matrixRight.rows[index]?.[column] ?? 0),
                  ),
                ),
              ),
            );
          }
          if (op === "×") {
            if ((matrixLeft.rows[0]?.length ?? 0) !== matrixRight.rows.length) {
              return Option.some(failure("Dimension"));
            }
            return Option.some(
              matrix(multiplyRows(matrixLeft.rows, matrixRight.rows)),
            );
          }
          return Option.some(failure("Dimension"));
        },
      }),
  });

const vectorBinary = (
  op: string,
  left: CalcValue,
  right: CalcValue,
): Option.Option<CalcValue | CalculatorFailure> =>
  Option.match(vectorIn(left), {
    onNone: () =>
      Option.match(vectorIn(right), {
        onNone: () => Option.none(),
        onSome: (vectorRight) =>
          Option.match(numberIn(left), {
            onNone: () => Option.some(failure("Dimension")),
            onSome: (factor) =>
              Option.some(
                vector(Arr.map(vectorRight.items, (item) => item * factor)),
              ),
          }),
      }),
    onSome: (vectorLeft) =>
      Option.match(vectorIn(right), {
        onNone: () =>
          Option.match(numberIn(right), {
            onNone: () => Option.some(failure("Dimension")),
            onSome: (factor) => {
              if (op === "×") {
                return Option.some(
                  vector(Arr.map(vectorLeft.items, (item) => item * factor)),
                );
              }
              if (op === "÷") {
                return Option.some(
                  factor === 0
                    ? failure("Math")
                    : vector(
                        Arr.map(vectorLeft.items, (item) => item / factor),
                      ),
                );
              }
              return Option.some(failure("Dimension"));
            },
          }),
        onSome: (vectorRight) => {
          if (op === "+" || op === "-") {
            if (vectorLeft.items.length !== vectorRight.items.length) {
              return Option.some(failure("Dimension"));
            }
            return Option.some(
              vector(
                Arr.map(vectorLeft.items, (item, index) =>
                  op === "+"
                    ? item + (vectorRight.items[index] ?? 0)
                    : item - (vectorRight.items[index] ?? 0),
                ),
              ),
            );
          }
          if (op === "×") {
            return Option.some(
              Option.match(cross(vectorLeft.items, vectorRight.items), {
                onNone: () => failure("Dimension"),
                onSome: (items) => vector(items),
              }),
            );
          }
          return Option.some(failure("Dimension"));
        },
      }),
  });

/* ------------------------------------------------------------------ */
/* Scalar binary operations                                            */
/* ------------------------------------------------------------------ */

const factorialOf = (n: number): Option.Option<number> =>
  Number.isInteger(n) && n >= 0 && n <= 69
    ? Option.some(
        Arr.reduce(Arr.range(2, n), 1, (total, value) => total * value),
      )
    : Option.none();

const permutationsOf = (n: number, r: number): Option.Option<number> =>
  Number.isInteger(n) && Number.isInteger(r) && r >= 0 && r <= n && r <= 100_000
    ? Option.some(
        Arr.reduce(
          Arr.range(0, r - 1),
          1,
          (total, index) => total * (n - index),
        ),
      )
    : Option.none();

const combinationsOf = (n: number, r: number): Option.Option<number> =>
  Option.flatMap(permutationsOf(n, r), (value) =>
    Option.map(factorialOf(r), (denominator) => value / denominator),
  );

const applyBinary = (
  op: string,
  left: CalcValue,
  right: CalcValue,
  ctx: EvaluationContext,
): CalcValue | CalculatorFailure => {
  if (op === "=") return right;
  if (
    (left._tag === "base" || right._tag === "base") &&
    (op === "+" || op === "-" || op === "×" || op === "÷" || op === "^")
  ) {
    const integerOf = (value: CalcValue): Option.Option<number> =>
      value._tag === "base" ? Option.some(value.value) : integerIn(value);
    const a = integerOf(left);
    const b = integerOf(right);
    if (Option.isNone(a) || Option.isNone(b)) return failure("Argument");
    const av = Option.getOrElse(a, () => 0);
    const bv = Option.getOrElse(b, () => 0);
    const radix = baseRadix(ctx.base);
    const result =
      op === "+"
        ? av + bv
        : op === "-"
          ? av - bv
          : op === "×"
            ? av * bv
            : op === "÷"
              ? bv === 0
                ? Number.NaN
                : Math.trunc(av / bv)
              : op === "^"
                ? Math.trunc(av ** bv)
                : Number.NaN;
    return Number.isFinite(result)
      ? { _tag: "base", value: result, base: radix }
      : failure(op === "÷" ? "Math" : "Argument");
  }
  if (op === "and" || op === "or" || op === "xor" || op === "xnor") {
    if (ctx.base === "DEC") return failure("Argument");
    const a = integerAny(left);
    const b = integerAny(right);
    if (Option.isNone(a) || Option.isNone(b)) return failure("Argument");
    const mask = 0xffffffff;
    const av = Option.getOrElse(a, () => 0) & mask;
    const bv = Option.getOrElse(b, () => 0) & mask;
    const value =
      op === "and"
        ? av & bv
        : op === "or"
          ? av | bv
          : op === "xor"
            ? av ^ bv
            : ~(av ^ bv) & mask;
    return { _tag: "base", value: value >>> 0, base: 10 };
  }
  if (op === "•") {
    const a = vectorIn(left);
    const b = vectorIn(right);
    return Option.isSome(a) && Option.isSome(b)
      ? real(
          dot(
            Option.getOrElse(a, () => vector([])).items,
            Option.getOrElse(b, () => vector([])).items,
          ),
        )
      : failure("Dimension");
  }
  if (op === "∠") {
    const radius = numberIn(left);
    const theta = numberIn(right);
    if (Option.isNone(radius) || Option.isNone(theta))
      return failure("Argument");
    const r = Option.getOrElse(radius, () => 0);
    const radians = toRadians(
      Option.getOrElse(theta, () => 0),
      ctx.angle,
    );
    return complex(r * Math.cos(radians), r * Math.sin(radians));
  }
  if (op === "nPr" || op === "nCr") {
    const n = integerIn(left);
    const r = integerIn(right);
    if (Option.isNone(n) || Option.isNone(r)) return failure("Argument");
    const result =
      op === "nPr"
        ? permutationsOf(
            Option.getOrElse(n, () => 0),
            Option.getOrElse(r, () => 0),
          )
        : combinationsOf(
            Option.getOrElse(n, () => 0),
            Option.getOrElse(r, () => 0),
          );
    return Option.match(result, {
      onNone: () => failure("Math"),
      onSome: (value) =>
        Number.isFinite(value) ? real(value) : failure("Math"),
    });
  }
  const leftScalar = scalarOf(left);
  const rightScalar = scalarOf(right);
  if (Option.isSome(leftScalar) && Option.isSome(rightScalar)) {
    const a = Option.getOrElse(leftScalar, () => real(0));
    const b = Option.getOrElse(rightScalar, () => real(0));
    if (op === "+") return addScalar(a, b);
    if (op === "-") return subtractScalar(a, b);
    if (op === "×") return multiplyScalar(a, b);
    if (op === "÷") return divideScalar(a, b);
    if (op === "^") return powerScalar(a, b);
    return failure("Syntax");
  }
  return Option.match(matrixBinary(op, left, right), {
    onNone: () =>
      Option.match(vectorBinary(op, left, right), {
        onNone: () => failure("Dimension"),
        onSome: (result) => result,
      }),
    onSome: (result) => result,
  });
};

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

const CALLS_WITHOUT_ARGS = new Set(["Ran#"]);

const callMath = (
  name: string,
  args: ReadonlyArray<CalcValue>,
  ctx: EvaluationContext,
): CalcValue | CalculatorFailure => {
  if (CALLS_WITHOUT_ARGS.has(name)) return failure("Syntax");
  const first = args[0];
  if (first === undefined) return failure("Argument");
  const unary = (
    apply: (value: Scalar) => CalcValue | CalculatorFailure,
  ): CalcValue | CalculatorFailure =>
    Option.match(scalarOf(first), {
      onNone: () => failure("Argument"),
      onSome: apply,
    });
  if (name === "sin" || name === "cos" || name === "tan") {
    return unary((scalar) => {
      const angle = isReal(scalar)
        ? real(toRadians(scalar.value, ctx.angle))
        : scalar;
      return name === "sin"
        ? sinScalar(angle)
        : name === "cos"
          ? cosScalar(angle)
          : tanScalar(angle);
    });
  }
  if (name === "sin⁻¹" || name === "cos⁻¹" || name === "tan⁻¹") {
    return unary((scalar) => {
      const value =
        name === "sin⁻¹"
          ? asinScalar(scalar)
          : name === "cos⁻¹"
            ? acosScalar(scalar)
            : atanScalar(scalar);
      return isFailure(value)
        ? value
        : isReal(value)
          ? real(fromRadians(value.value, ctx.angle))
          : value;
    });
  }
  if (name === "sinh" || name === "cosh" || name === "tanh") {
    return unary((scalar) =>
      name === "sinh"
        ? sinhScalar(scalar)
        : name === "cosh"
          ? coshScalar(scalar)
          : tanhScalar(scalar),
    );
  }
  if (name === "sinh⁻¹" || name === "cosh⁻¹" || name === "tanh⁻¹") {
    return unary((scalar) =>
      name === "sinh⁻¹"
        ? asinhScalar(scalar)
        : name === "cosh⁻¹"
          ? acoshScalar(scalar)
          : atanhScalar(scalar),
    );
  }
  if (name === "ln") return unary(lnScalar);
  if (name === "log") {
    const value = args[1];
    if (value === undefined) return unary((scalar) => logScalar(scalar, 10));
    const base = numberIn(first);
    return Option.isSome(base)
      ? Option.match(scalarOf(value), {
          onNone: () => failure("Argument"),
          onSome: (target) =>
            logScalar(
              target,
              Option.getOrElse(base, () => 10),
            ),
        })
      : failure("Argument");
  }
  if (name === "√") return unary(sqrtScalar);
  if (name === "∛") return unary((scalar) => rootScalar(scalar, 3));
  if (name === "ⁿ√") {
    const index = args[1];
    if (index === undefined) return failure("Argument");
    const order = numberIn(index);
    return Option.isSome(order)
      ? unary((scalar) =>
          rootScalar(
            scalar,
            Option.getOrElse(order, () => 2),
          ),
        )
      : failure("Argument");
  }
  if (name === "det") {
    return first._tag === "matrix"
      ? real(determinant(first.rows))
      : failure("Dimension");
  }
  if (name === "Trn") {
    return first._tag === "matrix"
      ? matrix(transpose(first.rows))
      : failure("Dimension");
  }
  if (name === "Abs") {
    if (first._tag === "matrix") {
      return matrix(
        Arr.map(first.rows, (row) => Arr.map(row, (value) => Math.abs(value))),
      );
    }
    if (first._tag === "vector") {
      return real(Math.hypot(...first.items));
    }
    return unary((scalar) => real(magnitude(scalar)));
  }
  if (name === "Rnd")
    return unary((scalar) =>
      roundScalar(scalar, ctx.roundDigits, ctx.roundMode),
    );
  if (name === "Conjg") return unary(conjugate);
  if (name === "arg") {
    return unary((scalar) => real(fromRadians(argument(scalar), ctx.angle)));
  }
  if (name === "Re" || name === "Im") {
    return unary((scalar) =>
      name === "Re"
        ? real(isReal(scalar) ? scalar.value : scalar.re)
        : real(isReal(scalar) ? 0 : scalar.im),
    );
  }
  if (name === "Not" || name === "Neg") {
    const value = integerAny(first);
    if (Option.isNone(value)) return failure("Argument");
    const bits = ctx.base === "BIN" ? 16 : 32;
    const mask = bits === 16 ? 0xffff : 0xffffffff;
    const number = Option.getOrElse(value, () => 0);
    return {
      _tag: "base",
      value: name === "Not" ? ~number & mask : (-number & mask) >>> 0,
      base: 10,
    };
  }
  if (name === "exp") return unary(expScalar);
  return failure("Syntax");
};

const factorialValue = (value: CalcValue): Option.Option<number> =>
  Option.flatMap(numberIn(value), factorialOf);

/* ------------------------------------------------------------------ */
/* Integration (15-point Gauss–Kronrod, the manual's method)           */
/* ------------------------------------------------------------------ */

const KRONROD_NODES = [
  0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394,
  0.586087235467691, 0.405845151377397, 0.207784955007898,
];

const KRONROD_WEIGHTS = [
  0.022935322010529, 0.063092092629979, 0.10479001032225, 0.140653259715525,
  0.169004726639267, 0.190350578064785, 0.204432940075298,
];

const GAUSS_WEIGHTS: ReadonlyArray<number> = [
  0.12948496616887, 0.279705391489277, 0.381830050505119, 0.417959183673469,
];

const KRONROD_CENTRE_WEIGHT = 0.209482141084728;

const quadrature = (
  fn: (x: number) => Effect.Effect<number, CalculatorFailure>,
  a: number,
  b: number,
): Effect.Effect<
  { readonly value: number; readonly error: number },
  CalculatorFailure
> =>
  Effect.gen(function* () {
    const half = (b - a) / 2;
    const centre = (a + b) / 2;
    const offsets = [0, ...Arr.flatMap(KRONROD_NODES, (node) => [-node, node])];
    const values = yield* Effect.forEach(
      offsets,
      (offset) => fn(centre + half * offset),
      { concurrency: 1 },
    );
    const centreValue = values[0] ?? 0;
    const pairs = Arr.range(0, KRONROD_NODES.length - 1);
    const kronrod = Arr.reduce(
      pairs,
      KRONROD_CENTRE_WEIGHT * centreValue,
      (total, index) =>
        total +
        (KRONROD_WEIGHTS[index] ?? 0) *
          ((values[1 + index * 2] ?? 0) + (values[2 + index * 2] ?? 0)),
    );
    const gauss = Arr.reduce(
      pairs,
      (GAUSS_WEIGHTS[3] ?? 0) * centreValue,
      (total, index) => {
        const weight =
          index === 1
            ? GAUSS_WEIGHTS[2]
            : index === 3
              ? GAUSS_WEIGHTS[1]
              : index === 5
                ? GAUSS_WEIGHTS[0]
                : 0;
        return (
          total +
          (weight ?? 0) *
            ((values[1 + index * 2] ?? 0) + (values[2 + index * 2] ?? 0))
        );
      },
    );
    return {
      value: kronrod * half,
      error: Math.abs(kronrod - gauss) * half,
    };
  });

const integrate = (
  fn: (x: number) => Effect.Effect<number, CalculatorFailure>,
  a: number,
  b: number,
  tolerance: number,
  depth = 0,
): Effect.Effect<number, CalculatorFailure> =>
  Effect.gen(function* () {
    const estimate = yield* quadrature(fn, a, b);
    if (depth >= 10 || estimate.error <= tolerance) return estimate.value;
    const middle = (a + b) / 2;
    const left = yield* integrate(fn, a, middle, tolerance / 2, depth + 1);
    const right = yield* integrate(fn, middle, b, tolerance / 2, depth + 1);
    return left + right;
  });

/* ------------------------------------------------------------------ */
/* The evaluator                                                       */
/* ------------------------------------------------------------------ */

const parseInBase = (text: string, base: BaseName): Option.Option<number> => {
  const radix =
    base === "BIN" ? 2 : base === "OCT" ? 8 : base === "HEX" ? 16 : 10;
  const value = Number.parseInt(text, radix);
  return Number.isFinite(value) ? Option.some(value) : Option.none();
};

const baseRadix = (base: BaseName): number =>
  base === "BIN" ? 2 : base === "OCT" ? 8 : base === "HEX" ? 16 : 10;

const variableValue = (name: string, ctx: EvaluationContext): number =>
  name === "Ans"
    ? ctx.ans
    : name === "M"
      ? ctx.memory
      : (ctx.variables[name] ?? 0);

export const evaluate = (
  expression: Expr,
  ctx: EvaluationContext,
): Effect.Effect<CalcValue, CalculatorFailure> =>
  Match.valueTags(expression, {
    number: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        if (ctx.base !== "DEC") {
          if (node.text.includes("."))
            return yield* Effect.fail(failure("Syntax"));
          return yield* Option.match(parseInBase(node.text, ctx.base), {
            onNone: () => Effect.fail(failure("Syntax")),
            onSome: (value) =>
              displayable(
                { _tag: "base", value, base: baseRadix(ctx.base) },
                ctx,
              ),
          });
        }
        return yield* displayable(literal(node.value, node.text), ctx);
      }),
    constant: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        if (node.name === "i") {
          return ctx.complex
            ? yield* displayable(complex(0, 1), ctx)
            : yield* Effect.fail(failure("Argument"));
        }
        if (node.name.startsWith("const:")) {
          const held = scientificConstants.find(
            (constant) => constant.index === node.name.slice(6),
          );
          return held === undefined
            ? yield* Effect.fail(failure("Argument"))
            : yield* displayable(real(held.value), ctx);
        }
        const value =
          node.name === "π"
            ? Math.PI
            : node.name === "e"
              ? Math.E
              : variableValue(node.name, ctx);
        return yield* displayable(real(value), ctx);
      }),
    variable: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Option.match(Option.fromUndefinedOr(ctx.matrices[node.name]), {
        onSome: (matrixValue) => displayable(matrixValue, ctx),
        onNone: () =>
          Option.match(Option.fromUndefinedOr(ctx.vectors[node.name]), {
            onSome: (vectorValue) => displayable(vectorValue, ctx),
            onNone: () => displayable(real(variableValue(node.name, ctx)), ctx),
          }),
      }),
    binary: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const left = yield* evaluate(node.left, ctx);
        const right = yield* evaluate(node.right, ctx);
        return yield* fromValue(applyBinary(node.op, left, right, ctx), ctx);
      }),
    unary: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const value = yield* evaluate(node.value, ctx);
        if (node.op === "+") return value;
        return yield* fromValue(
          value._tag === "matrix"
            ? matrix(
                Arr.map(value.rows, (row) => Arr.map(row, (item) => -item)),
              )
            : value._tag === "vector"
              ? vector(Arr.map(value.items, (item) => -item))
              : value._tag === "base"
                ? { _tag: "base", value: -value.value, base: value.base }
                : Option.match(scalarOf(value), {
                    onNone: () => value,
                    onSome: negate,
                  }),
          ctx,
        );
      }),
    percent: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const value = yield* evaluate(node.value, ctx);
        return yield* fromValue(
          Option.match(scalarOf(value), {
            onNone: () => value,
            onSome: (scalar) =>
              isReal(scalar) ? real(scalar.value / 100) : scalar,
          }),
          ctx,
        );
      }),
    postfix: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const value = yield* evaluate(node.value, ctx);
        if (node.op === "x²" || node.op === "x³") {
          if (value._tag === "matrix") {
            const exponent = node.op === "x²" ? 2 : 3;
            if (value.rows.length !== (value.rows[0]?.length ?? 0)) {
              return yield* Effect.fail(failure("Dimension"));
            }
            return yield* displayable(
              matrix(
                Arr.reduce(
                  Arr.range(1, exponent),
                  identity(value.rows.length),
                  (accumulated) => multiplyRows(accumulated, value.rows),
                ),
              ),
              ctx,
            );
          }
          return yield* Option.match(scalarOf(value), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: (scalar) =>
              fromValue(
                powerScalar(scalar, real(node.op === "x²" ? 2 : 3)),
                ctx,
              ),
          });
        }
        if (node.op === "x⁻¹") {
          if (value._tag === "matrix") {
            return yield* Option.match(inverseRows(value.rows), {
              onNone: () => Effect.fail(failure("Math")),
              onSome: (rows) => displayable(matrix(rows), ctx),
            });
          }
          return yield* Option.match(scalarOf(value), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: (scalar) => fromValue(divideScalar(real(1), scalar), ctx),
          });
        }
        if (node.op === "!") {
          return yield* Option.match(factorialValue(value), {
            onNone: () => Effect.fail(failure("Math")),
            onSome: (factored) => displayable(real(factored), ctx),
          });
        }
        if (node.op.startsWith("conv:")) {
          return yield* Option.match(scalarOf(value), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: (scalar) => {
              if (!isReal(scalar)) return Effect.fail(failure("Argument"));
              const conversion = metricConversions.find(
                (held) => held.index === node.op.slice(5),
              );
              return conversion === undefined
                ? Effect.fail(failure("Argument"))
                : displayable(
                    real(
                      conversion.convert
                        ? conversion.convert(scalar.value)
                        : scalar.value * conversion.factor,
                    ),
                    ctx,
                  );
            },
          });
        }
        if (node.op === "°" || node.op === "rad" || node.op === "grad") {
          return yield* Option.match(scalarOf(value), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: (scalar) => {
              if (!isReal(scalar)) return Effect.fail(failure("Argument"));
              const degrees =
                node.op === "°"
                  ? scalar.value
                  : node.op === "rad"
                    ? (scalar.value * 180) / Math.PI
                    : scalar.value * 0.9;
              const converted =
                ctx.angle === "Deg"
                  ? degrees
                  : ctx.angle === "Rad"
                    ? (degrees * Math.PI) / 180
                    : (degrees * 10) / 9;
              return displayable(real(converted, node.op === "°"), ctx);
            },
          });
        }
        return yield* displayable(value, ctx);
      }),
    call: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        if (node.name === "Ran#") {
          const value = yield* Random.next;
          return yield* displayable(real(value), ctx);
        }
        if (node.name === "RanInt") {
          const lowerExpr = node.args[0];
          const upperExpr = node.args[1];
          if (lowerExpr === undefined || upperExpr === undefined) {
            return yield* Effect.fail(failure("Argument"));
          }
          const lower = yield* evaluate(lowerExpr, ctx);
          const upper = yield* evaluate(upperExpr, ctx);
          return yield* Option.match(
            Option.all([integerIn(lower), integerIn(upper)]),
            {
              onNone: () => Effect.fail(failure("Argument")),
              onSome: ([from, to]) =>
                Effect.gen(function* () {
                  if (to < from) return yield* Effect.fail(failure("Argument"));
                  const value = yield* Random.nextIntBetween(from, to);
                  return yield* displayable(
                    { _tag: "base", value, base: 10 },
                    ctx,
                  );
                }),
            },
          );
        }
        if (node.name === "∫" || node.name === "d/dx" || node.name === "Σ") {
          const fnExpr = node.args[0];
          const aExpr = node.args[1];
          const bExpr = node.args[2];
          if (fnExpr === undefined || aExpr === undefined) {
            return yield* Effect.fail(failure("Argument"));
          }
          if (node.name !== "d/dx" && bExpr === undefined) {
            return yield* Effect.fail(failure("Argument"));
          }
          if (bExpr === undefined) {
            const at = yield* Option.match(
              numberIn(yield* evaluate(aExpr, ctx)),
              {
                onNone: () => Effect.fail(failure("Argument")),
                onSome: Effect.succeed,
              },
            );
            const tolerance = yield* Option.match(
              Option.fromUndefinedOr(node.args[2]),
              {
                onNone: () => Effect.succeed(1e-10),
                onSome: (expr) =>
                  Effect.map(evaluate(expr, ctx), (value) =>
                    Option.getOrElse(numberIn(value), () => 1e-10),
                  ),
              },
            );
            const evaluateAt = (
              x: number,
            ): Effect.Effect<number, CalculatorFailure> =>
              Effect.gen(function* () {
                const inner = yield* evaluate(fnExpr, {
                  ...ctx,
                  variables: { ...ctx.variables, X: x },
                });
                return yield* Option.match(numberIn(inner), {
                  onNone: () => Effect.fail(failure("Argument")),
                  onSome: (value) => Effect.succeed(value),
                });
              });
            const step = Math.max(
              1e-12,
              Math.min(1e-4, tolerance ** (1 / 3) * Math.max(1, Math.abs(at))),
            );
            const forward = yield* evaluateAt(at + step);
            const backward = yield* evaluateAt(at - step);
            return yield* displayable(
              real((forward - backward) / (2 * step)),
              ctx,
            );
          }
          const a = yield* Option.match(numberIn(yield* evaluate(aExpr, ctx)), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: Effect.succeed,
          });
          const b = yield* Option.match(numberIn(yield* evaluate(bExpr, ctx)), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: Effect.succeed,
          });
          const tol = yield* Option.match(
            Option.fromUndefinedOr(node.args[3]),
            {
              onNone: () =>
                Effect.succeed(
                  node.name === "d/dx" ? 1e-10 : node.name === "Σ" ? 0 : 1e-5,
                ),
              onSome: (expr) =>
                Effect.map(evaluate(expr, ctx), (value) =>
                  Option.getOrElse(numberIn(value), () => 1e-5),
                ),
            },
          );
          const evaluateAt = (
            x: number,
          ): Effect.Effect<number, CalculatorFailure> =>
            Effect.gen(function* () {
              const inner = yield* evaluate(fnExpr, {
                ...ctx,
                variables: { ...ctx.variables, X: x },
              });
              return yield* Option.match(numberIn(inner), {
                onNone: () => Effect.fail(failure("Argument")),
                onSome: (value) => Effect.succeed(value),
              });
            });
          if (node.name === "Σ") {
            if (!Number.isInteger(a) || !Number.isInteger(b) || b < a) {
              return yield* Effect.fail(failure("Argument"));
            }
            if (b - a + 1 > 100_000)
              return yield* Effect.fail(failure("Time Out"));
            const total = yield* Effect.reduce(
              Arr.range(a, b),
              () => 0,
              (sum, x) => Effect.map(evaluateAt(x), (value) => sum + value),
            );
            return yield* displayable(real(total), ctx);
          }
          const value = yield* integrate(
            evaluateAt,
            a,
            b,
            Math.max(tol, 1e-14),
          );
          return yield* displayable(real(value), ctx);
        }
        if (node.name === "Pol" || node.name === "Rec") {
          const xExpr = node.args[0];
          const yExpr = node.args[1];
          if (xExpr === undefined || yExpr === undefined) {
            return yield* Effect.fail(failure("Argument"));
          }
          const x = yield* Option.match(numberIn(yield* evaluate(xExpr, ctx)), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: Effect.succeed,
          });
          const y = yield* Option.match(numberIn(yield* evaluate(yExpr, ctx)), {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: Effect.succeed,
          });
          if (node.name === "Pol") {
            const radius = Math.hypot(x, y);
            const theta = fromRadians(Math.atan2(y, x), ctx.angle);
            ctx.sideEffects.x = radius;
            ctx.sideEffects.y = theta;
            const list: CalcValue = {
              _tag: "list",
              title: "Pol",
              items: [
                { label: "r", value: real(radius) },
                { label: "θ", value: real(theta) },
              ],
            };
            return list;
          }
          const radians = toRadians(y, ctx.angle);
          const resultX = x * Math.cos(radians);
          const resultY = x * Math.sin(radians);
          ctx.sideEffects.x = resultX;
          ctx.sideEffects.y = resultY;
          const list: CalcValue = {
            _tag: "list",
            title: "Rec",
            items: [
              { label: "X", value: real(resultX) },
              { label: "Y", value: real(resultY) },
            ],
          };
          return list;
        }
        const args = yield* Effect.forEach(
          node.args,
          (arg) => evaluate(arg, ctx),
          {
            concurrency: 1,
          },
        );
        return yield* fromValue(callMath(node.name, args, ctx), ctx);
      }),
    sequence: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const values = yield* Effect.forEach(
          node.items,
          (item) => evaluate(item, ctx),
          { concurrency: 1 },
        );
        return Option.getOrElse(Arr.last(values), () => real(0));
      }),
    format: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      evaluate(node.value, ctx),
    sexagesimal: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        const degrees = yield* Option.match(
          numberIn(yield* evaluate(node.degrees, ctx)),
          {
            onNone: () => Effect.fail(failure("Argument")),
            onSome: Effect.succeed,
          },
        );
        const minutes = yield* Option.match(node.minutes, {
          onNone: () => Effect.succeed(0),
          onSome: (value) =>
            Effect.map(evaluate(value, ctx), (evaluated) =>
              Option.getOrElse(numberIn(evaluated), () => 0),
            ),
        });
        const seconds = yield* Option.match(node.seconds, {
          onNone: () => Effect.succeed(0),
          onSome: (value) =>
            Effect.map(evaluate(value, ctx), (evaluated) =>
              Option.getOrElse(numberIn(evaluated), () => 0),
            ),
        });
        return yield* displayable(
          real(degrees + minutes / 60 + seconds / 3600, true),
          ctx,
        );
      }),
    baseTag: (node): Effect.Effect<CalcValue, CalculatorFailure> =>
      Effect.gen(function* () {
        if (node.value._tag === "number") {
          return yield* Option.match(
            parseInBase(
              node.value.text,
              node.base === 16
                ? "HEX"
                : node.base === 2
                  ? "BIN"
                  : node.base === 8
                    ? "OCT"
                    : "DEC",
            ),
            {
              onNone: () => Effect.fail(failure("Syntax")),
              onSome: (value) =>
                displayable({ _tag: "base", value, base: node.base }, ctx),
            },
          );
        }
        const value = yield* evaluate(node.value, ctx);
        return yield* Option.match(integerIn(value), {
          onNone: () => Effect.fail(failure("Argument")),
          onSome: (number) =>
            displayable({ _tag: "base", value: number, base: node.base }, ctx),
        });
      }),
  });

/** Format a value for a debug line, used by the inspector. */
export const describeValue = (value: CalcValue): string => {
  if (value._tag === "matrix") {
    return Arr.join(
      Arr.map(value.rows, (row) => Arr.join(Arr.map(row, String), " ")),
      "; ",
    );
  }
  if (value._tag === "vector")
    return Arr.join(Arr.map(value.items, String), ", ");
  if (value._tag === "base") return `${value.value}`;
  if (value._tag === "list") return value.title;
  if (value._tag === "real") return `${value.value}`;
  return `${value.re}+${value.im}i`;
};

export { baseRadix };
