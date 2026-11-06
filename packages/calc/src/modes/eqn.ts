import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Scalar } from "../value.js";
import { complex, real } from "../value.js";

export const EQUATION_KINDS = ["2x2", "3x3", "quadratic", "cubic"] as const;
export type EquationKind = (typeof EQUATION_KINDS)[number];

export interface EquationSolution {
  readonly label: string;
  readonly value: Scalar;
}

export const coefficientCount = (kind: EquationKind): number =>
  kind === "2x2" ? 6 : kind === "3x3" ? 12 : kind === "quadratic" ? 3 : 4;

export const equationLabel = (kind: EquationKind): string =>
  kind === "2x2"
    ? "aₙX + bₙY = cₙ"
    : kind === "3x3"
      ? "aₙX + bₙY + cₙZ = dₙ"
      : kind === "quadratic"
        ? "aX² + bX + c = 0"
        : "aX³ + bX² + cX + d = 0";

export const coefficientLabels = (kind: EquationKind): ReadonlyArray<string> =>
  kind === "2x2"
    ? ["a1", "b1", "c1", "a2", "b2", "c2"]
    : kind === "3x3"
      ? ["a1", "b1", "c1", "d1", "a2", "b2", "c2", "d2", "a3", "b3", "c3", "d3"]
      : kind === "quadratic"
        ? ["a", "b", "c"]
        : ["a", "b", "c", "d"];

const determinant2 = (a: number, b: number, c: number, d: number): number =>
  a * d - b * c;

const determinant3 = (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
): number => a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

const linear = (
  values: ReadonlyArray<number>,
): Option.Option<ReadonlyArray<EquationSolution>> => {
  if (values.length === 6) {
    const [a, b, c, d, e, f] = values;
    if (
      a === undefined ||
      b === undefined ||
      c === undefined ||
      d === undefined ||
      e === undefined ||
      f === undefined
    ) {
      return Option.none();
    }
    const det = determinant2(a, b, d, e);
    if (det === 0) return Option.none();
    return Option.some([
      { label: "X", value: real(determinant2(c, b, f, e) / det) },
      { label: "Y", value: real(determinant2(a, c, d, f) / det) },
    ]);
  }
  const [a, b, c, d, e, f, g, h, i, j, k, l] = values;
  if (
    [a, b, c, d, e, f, g, h, i, j, k, l].some((value) => value === undefined)
  ) {
    return Option.none();
  }
  const det = determinant3(a!, b!, c!, e!, f!, g!, i!, j!, k!);
  if (det === 0) return Option.none();
  return Option.some([
    {
      label: "X",
      value: real(determinant3(d!, b!, c!, h!, f!, g!, l!, j!, k!) / det),
    },
    {
      label: "Y",
      value: real(determinant3(a!, d!, c!, e!, h!, g!, i!, l!, k!) / det),
    },
    {
      label: "Z",
      value: real(determinant3(a!, b!, d!, e!, f!, h!, i!, j!, l!) / det),
    },
  ]);
};

const quadratic = (
  a: number,
  b: number,
  c: number,
): Option.Option<ReadonlyArray<EquationSolution>> => {
  if (a === 0) {
    if (b === 0) return Option.none();
    return Option.some([{ label: "X", value: real(-c / b) }]);
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    const root = Math.sqrt(-discriminant) / (2 * a);
    const centre = -b / (2 * a);
    return Option.some([
      { label: "X1", value: complex(centre, root) },
      { label: "X2", value: complex(centre, -root) },
    ]);
  }
  const root = Math.sqrt(discriminant) / (2 * a);
  const centre = -b / (2 * a);
  if (root === 0) return Option.some([{ label: "X", value: real(centre) }]);
  return Option.some([
    { label: "X1", value: real(centre + root) },
    { label: "X2", value: real(centre - root) },
  ]);
};

const cubic = (
  a: number,
  b: number,
  c: number,
  d: number,
): Option.Option<ReadonlyArray<EquationSolution>> => {
  if (a === 0) return quadratic(b, c, d);
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b ** 3 - 9 * a * b * c + 27 * a * a * d) / (27 * a ** 3);
  const shift = -b / (3 * a);
  const delta = (q / 2) ** 2 + (p / 3) ** 3;
  if (delta > 0) {
    const root = Math.sqrt(delta);
    const u = Math.cbrt(-q / 2 + root);
    const v = Math.cbrt(-q / 2 - root);
    const realRoot = u + v + shift;
    const realPart = -(u + v) / 2 + shift;
    const imaginaryPart = ((u - v) * Math.sqrt(3)) / 2;
    return Option.some([
      { label: "X1", value: real(realRoot) },
      { label: "X2", value: complex(realPart, imaginaryPart) },
      { label: "X3", value: complex(realPart, -imaginaryPart) },
    ]);
  }
  if (delta === 0) {
    const u = Math.cbrt(-q / 2);
    return Option.some([
      { label: "X1", value: real(2 * u + shift) },
      { label: "X2", value: real(-u + shift) },
      { label: "X3", value: real(-u + shift) },
    ]);
  }
  const radius = 2 * Math.sqrt(-p / 3);
  const angle = Math.acos(((3 * q) / (2 * p)) * Math.sqrt(-3 / p)) / 3;
  return Option.some(
    Arr.map(Arr.range(0, 2), (index) => ({
      label: `X${index + 1}`,
      value: real(radius * Math.cos(angle - (2 * Math.PI * index) / 3) + shift),
    })),
  );
};

export const solveEquation = (
  kind: EquationKind,
  values: ReadonlyArray<number>,
): Option.Option<ReadonlyArray<EquationSolution>> => {
  if (kind === "2x2" || kind === "3x3") return linear(values);
  if (kind === "quadratic")
    return quadratic(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0);
  return cubic(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 0);
};

export const newtonSolve = (
  fn: (x: number) => number,
  initial: number,
  tolerance = 1e-10,
): Option.Option<{ readonly value: number; readonly residual: number }> => {
  const iterate = (
    current: number,
    remaining: number,
  ): Option.Option<{ readonly value: number; readonly residual: number }> => {
    if (remaining === 0) return Option.none();
    const value = fn(current);
    if (!Number.isFinite(value)) return Option.none();
    if (Math.abs(value) < tolerance) {
      return Option.some({ value: current, residual: value });
    }
    const step = Math.max(1e-8, Math.abs(current) * 1e-6);
    const derivative = (fn(current + step) - fn(current - step)) / (2 * step);
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) {
      return Option.none();
    }
    return iterate(current - value / derivative, remaining - 1);
  };
  return iterate(initial, 100);
};
