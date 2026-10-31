/**
 * The values a calculation produces, and the arithmetic on them.
 *
 * A fx-991ES has one number type with three faces: a 15-digit decimal, an
 * exact rational the Natural Display can show as a fraction, and a complex
 * pair in CMPLX mode. `Real` keeps the decimal *and* the exact rational beside
 * it, so `1/3` can display as `1/3` while `sin(1)` stays a decimal. Matrices
 * and vectors are small immutable grids, and `Base` is an integer whose
 * display base the mode owns.
 *
 * `mathjs` supplies the `Fraction` type and its exact arithmetic; the complex
 * arithmetic is here because the calculator's angle unit, display rounding
 * and failure ranges are its own.
 */

import { add, divide, fraction, multiply, Fraction } from "mathjs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { failure, isFailure, type CalculatorFailure } from "./failure.js";

/** A real result: the decimal plus, when the operation stayed exact, the rational. */
export interface Real {
  readonly _tag: "real";
  readonly value: number;
  readonly exact: Option.Option<Fraction>;
  /** The result entered or produced through `°′″`; display it sexagesimally. */
  readonly sexagesimal: boolean;
}

/** A complex result. */
export interface ComplexValue {
  readonly _tag: "complex";
  readonly re: number;
  readonly im: number;
}

export type Scalar = Real | ComplexValue;

export interface MatrixValue {
  readonly _tag: "matrix";
  readonly rows: ReadonlyArray<ReadonlyArray<number>>;
}

export interface VectorValue {
  readonly _tag: "vector";
  readonly items: ReadonlyArray<number>;
}

/** One labelled reading, for Pol/Rec, statistics and regression results. */
export interface Reading {
  readonly label: string;
  readonly value: Scalar;
}

export interface ListValue {
  readonly _tag: "list";
  readonly title: string;
  readonly items: ReadonlyArray<Reading>;
}

/** An integer whose displayed base is the mode's (BASE-N). */
export interface BaseValue {
  readonly _tag: "base";
  readonly value: number;
  readonly base: number;
}

export type CalcValue =
  | Scalar
  | MatrixValue
  | VectorValue
  | ListValue
  | BaseValue;

/** A decimal with no exact form. Exactness is created by `exact` or a literal. */
export const real = (value: number, sexagesimal = false): Real => ({
  _tag: "real",
  value,
  exact: Option.none(),
  sexagesimal,
});

/** A literal number keeps the rational its digits denote. */
export const literal = (value: number, text: string): Real => ({
  _tag: "real",
  value,
  exact: Number.isFinite(value) ? Option.some(fraction(text)) : Option.none(),
  sexagesimal: false,
});

/** A decimal known to be irrational or rounded; no exact form. */
export const approx = (value: number, sexagesimal = false): Real => ({
  _tag: "real",
  value,
  exact: Option.none(),
  sexagesimal,
});

/** An exact rational. */
export const exact = (numerator: number, denominator = 1): Real => {
  const value = fraction(numerator, denominator);
  return {
    _tag: "real",
    value: Number(value.s) * (Number(value.n) / Number(value.d)),
    exact: Option.some(value),
    sexagesimal: false,
  };
};

/** A complex pair, without collapsing. */
export const complexValue = (re: number, im: number): ComplexValue => ({
  _tag: "complex",
  re,
  im,
});

/** A complex pair, collapsing to a real when the imaginary part is zero. */
export const complex = (re: number, im: number): Scalar =>
  im === 0 ? approx(re) : complexValue(re, im);

/** Read any scalar as a complex pair, for arithmetic that crosses the axis. */
const complexOf = (value: Scalar): ComplexValue =>
  isReal(value) ? complexValue(value.value, 0) : value;

/** Whether a scalar is real. */
export const isReal = (value: Scalar): value is Real => value._tag === "real";

/** The decimal magnitude of a scalar, or `None` for a complex. */
export const asNumber = (value: Scalar): Option.Option<number> =>
  isReal(value) ? Option.some(value.value) : Option.none();

/** The exact rational of a real, when it has one. */
export const asFraction = (value: Scalar): Option.Option<Fraction> =>
  isReal(value) ? value.exact : Option.none();

export const numberOf = (value: Fraction): number =>
  (Number(value.s) * Number(value.n)) / Number(value.d);

/**
 * Narrow a mathjs result to `Fraction` without a type assertion.
 *
 * `mathjs` types its operators as `MathType`; the exact path only stays exact
 * when both operands were fractions, and this is the one place that fact is
 * checked.
 */
const mathFraction = (value: unknown): Option.Option<Fraction> =>
  value instanceof Fraction ? Option.some(value) : Option.none();

const exactAdd = (left: Fraction, right: Fraction): Option.Option<Fraction> =>
  mathFraction(add(left, right));

const exactMultiply = (
  left: Fraction,
  right: Fraction,
): Option.Option<Fraction> => mathFraction(multiply(left, right));

const exactDivide = (
  left: Fraction,
  right: Fraction,
): Option.Option<Fraction> => mathFraction(divide(left, right));

/** Preserve the sexagesimal display flag across an operation. */
const flagOf = (left: Real, right: Real): boolean =>
  left.sexagesimal || right.sexagesimal;

export const negate = (value: Scalar): Scalar =>
  isReal(value)
    ? {
        _tag: "real",
        value: -value.value,
        exact: Option.map(value.exact, (held) =>
          fraction(-Number(held.s) * Number(held.n), Number(held.d)),
        ),
        sexagesimal: value.sexagesimal,
      }
    : complex(-value.re, -value.im);

export const addScalar = (left: Scalar, right: Scalar): Scalar => {
  if (isReal(left) && isReal(right)) {
    return {
      _tag: "real",
      value: left.value + right.value,
      exact: Option.flatMap(Option.all([left.exact, right.exact]), ([a, b]) =>
        exactAdd(a, b),
      ),
      sexagesimal: flagOf(left, right),
    };
  }
  const a = complexOf(left);
  const b = complexOf(right);
  return complex(a.re + b.re, a.im + b.im);
};

export const subtractScalar = (left: Scalar, right: Scalar): Scalar =>
  addScalar(left, negate(right));

export const multiplyScalar = (left: Scalar, right: Scalar): Scalar => {
  if (isReal(left) && isReal(right)) {
    return {
      _tag: "real",
      value: left.value * right.value,
      exact: Option.flatMap(Option.all([left.exact, right.exact]), ([a, b]) =>
        exactMultiply(a, b),
      ),
      sexagesimal: flagOf(left, right),
    };
  }
  const a = complexOf(left);
  const b = complexOf(right);
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
};

export const divideScalar = (
  left: Scalar,
  right: Scalar,
): Scalar | CalculatorFailure => {
  if (isReal(right) && right.value === 0) return failure("Math");
  if (isReal(left) && isReal(right)) {
    return {
      _tag: "real",
      value: left.value / right.value,
      exact: Option.flatMap(Option.all([left.exact, right.exact]), ([a, b]) =>
        exactDivide(a, b),
      ),
      sexagesimal: flagOf(left, right),
    };
  }
  const a = complexOf(left);
  const b = complexOf(right);
  const denominator = b.re * b.re + b.im * b.im;
  if (denominator === 0) return failure("Math");
  return complex(
    (a.re * b.re + a.im * b.im) / denominator,
    (a.im * b.re - a.re * b.im) / denominator,
  );
};

/** The magnitude of a scalar. */
export const magnitude = (value: Scalar): number =>
  isReal(value) ? Math.abs(value.value) : Math.hypot(value.re, value.im);

/** The angle of a complex value in radians. */
export const argument = (value: Scalar): number =>
  isReal(value)
    ? value.value >= 0
      ? 0
      : Math.PI
    : Math.atan2(value.im, value.re);

export const conjugate = (value: Scalar): Scalar =>
  isReal(value) ? value : complex(value.re, -value.im);

export const isZero = (value: Scalar): boolean =>
  isReal(value) ? value.value === 0 : value.re === 0 && value.im === 0;

/** A scalar at a power. Integer real powers keep exact rationals. */
export const powerScalar = (
  base: Scalar,
  exponent: Scalar,
): Scalar | CalculatorFailure => {
  if (isReal(base) && isReal(exponent)) {
    const n = exponent.value;
    if (!Number.isFinite(n)) return failure("Math");
    if (base.value === 0 && n < 0) return failure("Math");
    if (Number.isInteger(n) && n >= 0) {
      const exactPower = Option.flatMap(base.exact, (held) =>
        Arr.reduce(Arr.range(1, n), Option.some(held), (accumulated, _step) =>
          Option.flatMap(accumulated, (current) =>
            exactMultiply(current, held),
          ),
        ),
      );
      return {
        _tag: "real",
        value: base.value ** n,
        exact: n === 0 ? Option.some(fraction(1)) : exactPower,
        sexagesimal: false,
      };
    }
    if (base.value < 0 && !Number.isInteger(n)) {
      const theta = Math.PI;
      const radius = Math.abs(base.value) ** n;
      return complex(
        radius * Math.cos(theta * n),
        radius * Math.sin(theta * n),
      );
    }
    const value = base.value ** n;
    if (!Number.isFinite(value)) return failure("Math");
    return approx(value);
  }
  const b = complexOf(base);
  const e = complexOf(exponent);
  // exp(e * ln b)
  const radius = Math.hypot(b.re, b.im);
  if (radius === 0) return failure("Math");
  const theta = Math.atan2(b.im, b.re);
  const realPart = e.re * Math.log(radius) - e.im * theta;
  const imagPart = e.re * theta + e.im * Math.log(radius);
  const scale = Math.exp(realPart);
  return complex(scale * Math.cos(imagPart), scale * Math.sin(imagPart));
};

/** A square root, exact for perfect-square rationals. */
export const sqrtScalar = (value: Scalar): Scalar => {
  if (isReal(value)) {
    if (value.value < 0) return complex(0, Math.sqrt(-value.value));
    const exactRoot = Option.flatMap(value.exact, (held) => {
      const n = Number(held.n);
      const d = Number(held.d);
      const rn = Math.sqrt(n);
      const rd = Math.sqrt(d);
      return Number.isInteger(rn) && Number.isInteger(rd)
        ? Option.some(fraction(rn, rd))
        : Option.none<Fraction>();
    });
    const magnitudeRoot = Math.sqrt(value.value);
    return {
      _tag: "real",
      value: magnitudeRoot,
      exact: exactRoot,
      sexagesimal: false,
    };
  }
  const radius = Math.hypot(value.re, value.im);
  const theta = Math.atan2(value.im, value.re) / 2;
  const root = Math.sqrt(radius);
  return complex(root * Math.cos(theta), root * Math.sin(theta));
};

/** An n-th root. */
export const rootScalar = (
  value: Scalar,
  index: number,
): Scalar | CalculatorFailure => {
  if (index === 0) return failure("Math");
  if (isReal(value) && value.value < 0) {
    if (Math.abs(index % 2) !== 1) return failure("Math");
    return approx(-((-value.value) ** (1 / index)));
  }
  if (!Number.isInteger(index)) return failure("Argument");
  return powerScalar(value, approx(1 / index));
};

/** e^x. */
export const expScalar = (value: Scalar): Scalar => {
  if (isReal(value)) {
    const result = Math.exp(value.value);
    return Number.isFinite(result)
      ? approx(result)
      : approx(Number.POSITIVE_INFINITY);
  }
  const scale = Math.exp(value.re);
  return complex(scale * Math.cos(value.im), scale * Math.sin(value.im));
};

/** The natural logarithm. */
export const lnScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    if (value.value <= 0) return failure("Math");
    return approx(Math.log(value.value));
  }
  const radius = Math.hypot(value.re, value.im);
  if (radius === 0) return failure("Math");
  return complex(Math.log(radius), Math.atan2(value.im, value.re));
};

/** A logarithm in a given base. */
export const logScalar = (
  value: Scalar,
  base: number,
): Scalar | CalculatorFailure => {
  if (!Number.isFinite(base) || base <= 0 || base === 1) return failure("Math");
  const natural = lnScalar(value);
  if (isFailure(natural)) return natural;
  const denominator = Math.log(base);
  if (isReal(natural)) return approx(natural.value / denominator);
  return complex(natural.re / denominator, natural.im / denominator);
};

const trig = (
  value: Scalar,
  applyReal: (n: number) => number,
  applyComplex: (re: number, im: number) => [number, number],
): Scalar => {
  if (isReal(value)) return approx(applyReal(value.value));
  const [re, im] = applyComplex(value.re, value.im);
  return complex(re, im);
};

export const sinScalar = (value: Scalar): Scalar =>
  trig(value, Math.sin, (re, im) => [
    Math.sin(re) * Math.cosh(im),
    Math.cos(re) * Math.sinh(im),
  ]);

export const cosScalar = (value: Scalar): Scalar =>
  trig(value, Math.cos, (re, im) => [
    Math.cos(re) * Math.cosh(im),
    -Math.sin(re) * Math.sinh(im),
  ]);

export const tanScalar = (value: Scalar): Scalar | CalculatorFailure => {
  const cosine = cosScalar(value);
  if (isReal(cosine) && Math.abs(cosine.value) < 1e-15) return failure("Math");
  if (isReal(value)) return approx(Math.tan(value.value));
  const sine = sinScalar(value);
  const divided = divideScalar(sine, cosine);
  return divided;
};

export const sinhScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    const result = Math.sinh(value.value);
    return Number.isFinite(result) ? approx(result) : failure("Math");
  }
  const a = expScalar(value);
  const b = expScalar(negate(value));
  const difference = subtractScalar(a, b);
  const divided = divideScalar(difference, approx(2));
  return divided;
};

export const coshScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    const result = Math.cosh(value.value);
    return Number.isFinite(result) ? approx(result) : failure("Math");
  }
  const a = expScalar(value);
  const b = expScalar(negate(value));
  const sum = addScalar(a, b);
  const divided = divideScalar(sum, approx(2));
  return divided;
};

export const tanhScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) return approx(Math.tanh(value.value));
  const sinh = sinhScalar(value);
  if (isFailure(sinh)) return sinh;
  const cosh = coshScalar(value);
  if (isFailure(cosh)) return cosh;
  const divided = divideScalar(sinh, cosh);
  return divided;
};

/** Inverse sine, in radians. */
export const asinScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    if (Math.abs(value.value) > 1) return failure("Math");
    return approx(Math.asin(value.value));
  }
  // asin(z) = -i ln(iz + sqrt(1 - z²))
  const zSquared = multiplyScalar(value, value);
  const oneMinus = subtractScalar(approx(1), zSquared);
  const root = sqrtScalar(oneMinus);
  const iz = complex(-value.im, value.re);
  const inside = addScalar(iz, root);
  const logged = lnScalar(inside);
  if (isFailure(logged)) return logged;
  const result = multiplyScalar(complex(0, -1), logged);
  return result;
};

/** Inverse cosine, in radians. */
export const acosScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    if (Math.abs(value.value) > 1) return failure("Math");
    return approx(Math.acos(value.value));
  }
  const asin = asinScalar(value);
  if (isFailure(asin)) return asin;
  return subtractScalar(approx(Math.PI / 2), asin);
};

/** Inverse tangent, in radians. */
export const atanScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) return approx(Math.atan(value.value));
  return failure("Argument");
};

/** Inverse hyperbolic sine. */
export const asinhScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) return approx(Math.asinh(value.value));
  return failure("Argument");
};

/** Inverse hyperbolic cosine. */
export const acoshScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    if (value.value < 1) return failure("Math");
    return approx(Math.acosh(value.value));
  }
  return failure("Argument");
};

/** Inverse hyperbolic tangent. */
export const atanhScalar = (value: Scalar): Scalar | CalculatorFailure => {
  if (isReal(value)) {
    if (Math.abs(value.value) >= 1) return failure("Math");
    return approx(Math.atanh(value.value));
  }
  return failure("Argument");
};

/** Whether a scalar is inside the calculator's display range. */
export const inRange = (value: Scalar): boolean => {
  const magnitudes = isReal(value)
    ? [Math.abs(value.value)]
    : [Math.abs(value.re), Math.abs(value.im)];
  return magnitudes.every(
    (part) => part === 0 || (part >= 1e-99 && part <= 9.999999999e99),
  );
};

/** Treat a value as an integer for BASE-N and combinatorics. */
export const integerOf = (value: Scalar): Option.Option<number> =>
  isReal(value) && Number.isInteger(value.value)
    ? Option.some(value.value)
    : Option.none();

/** A scalar rounded as Rnd does: decimal places under Fix, digits under Sci/Norm. */
export const roundScalar = (
  value: Scalar,
  digits: number,
  mode: "decimal" | "significant" = "significant",
): Scalar => {
  if (isReal(value)) {
    if (value.value === 0) return exact(0);
    const factor =
      mode === "decimal"
        ? 10 ** digits
        : 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value.value))));
    const rounded = Math.round(value.value * factor) / factor;
    return approx(rounded);
  }
  return complex(
    Number(value.re.toPrecision(digits)),
    Number(value.im.toPrecision(digits)),
  );
};
