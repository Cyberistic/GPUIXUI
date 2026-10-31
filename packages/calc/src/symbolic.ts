/**
 * Symbolic display forms: the exact shape behind a decimal result.
 *
 * The numeric evaluator is what makes the calculator correct; this module is
 * what makes the Natural Display *look* like the manual. It evaluates the same
 * AST into a small closed form — a rational, a π multiple, and up to two
 * square-root terms — and the layout renderer turns that into a stacked
 * fraction, a radical or a π expression. If a result does not have such a form,
 * it falls back to the decimal the numeric evaluator produced.
 *
 * The two-term ceiling is the manual's √ form rule (`±a√b ± d√e`); a third
 * radical is deliberately rejected so the display never invents a
 * representation it cannot check.
 */

import { add, divide, fraction, multiply } from "mathjs";
import { Fraction } from "mathjs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Expr } from "./parser.js";

export interface RadicalTerm {
  readonly coefficient: Fraction;
  /** A square-free integer below 1000, per the manual's √ form ranges. */
  readonly radicand: number;
}

/** `rational + pi·π + Σ coefficient·√radicand`. */
export interface Symbolic {
  readonly rational: Fraction;
  readonly pi: Fraction;
  readonly radicals: ReadonlyArray<RadicalTerm>;
}

const isFraction = (value: unknown): value is Fraction =>
  value instanceof Fraction;

const addF = (a: Fraction, b: Fraction): Fraction => {
  const result = add(a, b);
  return isFraction(result) ? result : a;
};
const mulF = (a: Fraction, b: Fraction): Fraction => {
  const result = multiply(a, b);
  return isFraction(result) ? result : a;
};
const divF = (a: Fraction, b: Fraction): Fraction => {
  const result = divide(a, b);
  return isFraction(result) ? result : a;
};

const zero: Fraction = fraction(0);
const one: Fraction = fraction(1);

export const fractionOf = (numerator: number, denominator = 1): Fraction =>
  fraction(numerator, denominator);

export const numberValue = (value: Fraction): number =>
  (Number(value.s) * Number(value.n)) / Number(value.d);

export const isZeroF = (value: Fraction): boolean => Number(value.n) === 0;

export const isNegativeF = (value: Fraction): boolean => Number(value.s) < 0;

const symbolic = (
  rational: Fraction,
  pi: Fraction = zero,
  radicals: ReadonlyArray<RadicalTerm> = [],
): Symbolic => ({ rational, pi, radicals });

export const symbolicZero: Symbolic = symbolic(zero);

/** Pull square factors out of a radicand: √12 = 2√3. */
const reduceRadicand = (
  radicand: number,
  coefficient: Fraction,
  factor = 2,
): RadicalTerm => {
  if (radicand < 2) {
    return { coefficient, radicand: 1 };
  }
  if (factor * factor > radicand) {
    return { coefficient, radicand };
  }
  if (radicand % (factor * factor) === 0) {
    return reduceRadicand(
      radicand / (factor * factor),
      mulF(coefficient, fraction(factor)),
      factor,
    );
  }
  return reduceRadicand(radicand, coefficient, factor + 1);
};

const term = (
  coefficient: Fraction,
  radicand: number,
): Option.Option<RadicalTerm> =>
  radicand <= 1 || radicand >= 1000
    ? Option.none()
    : Option.some(reduceRadicand(radicand, coefficient));

/** Combine equal radicands, drop zero terms, and refuse a third radical. */
const normalizeRadicals = (
  terms: ReadonlyArray<RadicalTerm>,
): Option.Option<ReadonlyArray<RadicalTerm>> => {
  const combined = Arr.reduce(
    terms,
    [] as ReadonlyArray<RadicalTerm>,
    (held, current) =>
      Arr.some(held, (candidate) => candidate.radicand === current.radicand)
        ? Arr.map(held, (candidate) =>
            candidate.radicand === current.radicand
              ? {
                  ...candidate,
                  coefficient: addF(candidate.coefficient, current.coefficient),
                }
              : candidate,
          )
        : Arr.append(held, current),
  );
  const nonZero = Arr.filter(combined, (held) => !isZeroF(held.coefficient));
  if (nonZero.length > 2) return Option.none();
  return Option.some(nonZero);
};

const normalize = (
  rational: Fraction,
  pi: Fraction,
  radicals: ReadonlyArray<RadicalTerm>,
): Option.Option<Symbolic> =>
  Option.map(normalizeRadicals(radicals), (held) =>
    symbolic(rational, pi, held),
  );

const addSymbolic = (
  left: Symbolic,
  right: Symbolic,
): Option.Option<Symbolic> =>
  normalize(addF(left.rational, right.rational), addF(left.pi, right.pi), [
    ...left.radicals,
    ...right.radicals,
  ]);

const multiplyTerm = (
  left: RadicalTerm,
  right: RadicalTerm,
): Option.Option<RadicalTerm> =>
  term(
    mulF(left.coefficient, right.coefficient),
    left.radicand * right.radicand,
  );

const multiplySymbolic = (
  left: Symbolic,
  right: Symbolic,
): Option.Option<Symbolic> => {
  if (!isZeroF(left.pi) && (!isZeroF(right.pi) || right.radicals.length > 0))
    return Option.none();
  if (!isZeroF(right.pi) && left.radicals.length > 0) return Option.none();
  if (left.radicals.length > 0 && right.radicals.length > 0) {
    const products = Arr.flatMap(left.radicals, (a) =>
      Arr.map(right.radicals, (b) => multiplyTerm(a, b)),
    );
    if (!Arr.every(products, Option.isSome)) return Option.none();
    const terms = Arr.flatMap(products, (held) =>
      Option.isSome(held) ? [held.value] : [],
    );
    const rationalFromRoots = Arr.reduce(terms, zero, (total, held) =>
      held.radicand === 1 ? addF(total, held.coefficient) : total,
    );
    const radicalPart = Arr.filter(terms, (held) => held.radicand !== 1);
    return normalize(
      addF(mulF(left.rational, right.rational), rationalFromRoots),
      zero,
      [
        ...radicalPart,
        ...Arr.map(left.radicals, (held) => ({
          coefficient: mulF(held.coefficient, right.rational),
          radicand: held.radicand,
        })),
        ...Arr.map(right.radicals, (held) => ({
          coefficient: mulF(held.coefficient, left.rational),
          radicand: held.radicand,
        })),
      ],
    );
  }
  const rational = mulF(left.rational, right.rational);
  const pi = isZeroF(left.pi)
    ? mulF(right.pi, left.rational)
    : mulF(left.pi, right.rational);
  const radicals = [
    ...Arr.map(left.radicals, (held) => ({
      coefficient: mulF(held.coefficient, right.rational),
      radicand: held.radicand,
    })),
    ...Arr.map(right.radicals, (held) => ({
      coefficient: mulF(held.coefficient, left.rational),
      radicand: held.radicand,
    })),
  ];
  return normalize(rational, pi, radicals);
};

const negateSymbolic = (value: Symbolic): Symbolic =>
  symbolic(
    mulF(value.rational, fraction(-1)),
    mulF(value.pi, fraction(-1)),
    Arr.map(value.radicals, (held) => ({
      coefficient: mulF(held.coefficient, fraction(-1)),
      radicand: held.radicand,
    })),
  );

const divideSymbolic = (
  left: Symbolic,
  right: Symbolic,
): Option.Option<Symbolic> => {
  if (!isZeroF(right.pi) || right.radicals.length > 1) return Option.none();
  const radical = right.radicals[0];
  if (radical === undefined) {
    if (isZeroF(right.rational)) return Option.none();
    return normalize(
      divF(left.rational, right.rational),
      divF(left.pi, right.rational),
      Arr.map(left.radicals, (held) => ({
        coefficient: divF(held.coefficient, right.rational),
        radicand: held.radicand,
      })),
    );
  }
  // (a + b√d) / (c√d) = b/c + a√d/(cd), with a second radicand when e ≠ d.
  const denominator = mulF(radical.coefficient, fraction(radical.radicand));
  if (isZeroF(denominator)) return Option.none();
  if (left.radicals.length > 1) return Option.none();
  const leftRadical = left.radicals[0];
  const rational =
    leftRadical === undefined
      ? zero
      : divF(leftRadical.coefficient, radical.coefficient);
  return normalize(rational, zero, [
    ...(isZeroF(left.rational)
      ? []
      : [
          {
            coefficient: divF(left.rational, denominator),
            radicand: radical.radicand,
          },
        ]),
    ...(leftRadical === undefined || leftRadical.radicand === radical.radicand
      ? []
      : [
          {
            coefficient: divF(leftRadical.coefficient, denominator),
            radicand: leftRadical.radicand * radical.radicand,
          },
        ]),
  ]);
};

const powerSymbolic = (
  value: Symbolic,
  exponent: number,
): Option.Option<Symbolic> => {
  if (exponent === 0) return Option.some(symbolic(one));
  if (exponent < 0) {
    return Option.flatMap(powerSymbolic(value, -exponent), (positive) =>
      divideSymbolic(symbolic(one), positive),
    );
  }
  return Arr.reduce(
    Arr.range(1, exponent),
    Option.some(symbolic(one)),
    (held) =>
      Option.flatMap(held, (current) => multiplySymbolic(current, value)),
  );
};

const sqrtSymbolic = (value: Symbolic): Option.Option<Symbolic> => {
  if (!isZeroF(value.pi) || value.radicals.length > 0) return Option.none();
  if (isNegativeF(value.rational)) return Option.none();
  const n = Number(value.rational.n);
  const d = Number(value.rational.d);
  const rootN = Math.sqrt(n);
  const rootD = Math.sqrt(d);
  if (Number.isInteger(rootN) && Number.isInteger(rootD)) {
    return Option.some(symbolic(fraction(rootN, rootD)));
  }
  // √(n/d) = √(n·d)/d
  return Option.map(term(divF(one, fraction(d)), n * d), (held) =>
    symbolic(zero, zero, [held]),
  );
};

const symbolicNumber = (text: string): Option.Option<Symbolic> =>
  Option.some(symbolic(fraction(text)));

/** The exact shape of an expression, when it has one this display understands. */
export const symbolicOf = (expression: Expr): Option.Option<Symbolic> => {
  if (expression._tag === "number") return symbolicNumber(expression.text);
  if (expression._tag === "constant") {
    if (expression.name === "π") return Option.some(symbolic(zero, one));
    return Option.none();
  }
  if (expression._tag === "variable") return Option.none();
  if (expression._tag === "binary") {
    if (expression.op === "=") return symbolicOf(expression.right);
    const left = symbolicOf(expression.left);
    const right = symbolicOf(expression.right);
    if (Option.isNone(left) || Option.isNone(right)) return Option.none();
    const a = left.value;
    const b = right.value;
    if (expression.op === "+") return addSymbolic(a, b);
    if (expression.op === "-") return addSymbolic(a, negateSymbolic(b));
    if (expression.op === "×") return multiplySymbolic(a, b);
    if (expression.op === "÷") return divideSymbolic(a, b);
    if (expression.op === "^") {
      const exponent = Number(b.rational);
      return Number.isInteger(exponent) && Math.abs(exponent) <= 8
        ? powerSymbolic(a, exponent)
        : Option.none();
    }
    return Option.none();
  }
  if (expression._tag === "unary") {
    return Option.map(symbolicOf(expression.value), (value) =>
      expression.op === "-" ? negateSymbolic(value) : value,
    );
  }
  if (expression._tag === "percent") {
    return Option.flatMap(symbolicOf(expression.value), (value) =>
      normalize(
        divF(value.rational, fraction(100)),
        divF(value.pi, fraction(100)),
        Arr.map(value.radicals, (held) => ({
          coefficient: divF(held.coefficient, fraction(100)),
          radicand: held.radicand,
        })),
      ),
    );
  }
  if (expression._tag === "postfix") {
    return Option.flatMap(symbolicOf(expression.value), (value) => {
      if (expression.op === "x²") return powerSymbolic(value, 2);
      if (expression.op === "x³") return powerSymbolic(value, 3);
      if (expression.op === "x⁻¹") return divideSymbolic(symbolic(one), value);
      return Option.none();
    });
  }
  if (expression._tag === "call") {
    if (expression.name === "√") {
      return Option.flatMap(Option.fromUndefinedOr(expression.args[0]), (arg) =>
        Option.flatMap(symbolicOf(arg), sqrtSymbolic),
      );
    }
    return Option.none();
  }
  if (expression._tag === "format") return symbolicOf(expression.value);
  if (expression._tag === "sequence") {
    return Arr.reduce(
      expression.items,
      Option.none<Symbolic>(),
      (_held, item) => symbolicOf(item),
    );
  }
  return Option.none();
};

/** The decimal a symbolic form projects to, for checking it against the result. */
export const projectSymbolic = (value: Symbolic): number =>
  numberValue(value.rational) +
  numberValue(value.pi) * Math.PI +
  Arr.reduce(
    value.radicals,
    0,
    (total, held) =>
      total + numberValue(held.coefficient) * Math.sqrt(held.radicand),
  );

/** Whether a symbolic form and the numeric result agree. */
export const agrees = (value: Symbolic, result: number): boolean => {
  const projected = projectSymbolic(value);
  const tolerance = Math.max(1e-9, Math.abs(result) * 1e-9);
  return Math.abs(projected - result) <= tolerance;
};

export { addF, mulF, one, zero };
