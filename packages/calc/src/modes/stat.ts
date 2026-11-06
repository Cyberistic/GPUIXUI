import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const STAT_KINDS = [
  "1-VAR",
  "A+BX",
  "_+CX²",
  "ln X",
  "e^X",
  "A·B^X",
  "A·X^B",
  "1/X",
] as const;

export type StatKind = (typeof STAT_KINDS)[number];

export interface StatRow {
  readonly x: string;
  readonly y: string;
  readonly freq: string;
}

export interface StatPoint {
  readonly x: number;
  readonly y: number;
  readonly frequency: number;
}

export const emptyStatRow = (): StatRow => ({ x: "", y: "", freq: "" });

export const STAT_ROWS = 80;

export const statRowLimit = (kind: StatKind, frequency: boolean): number =>
  isPaired(kind) ? (frequency ? 26 : 40) : frequency ? 40 : 80;

export const emptyStatRows = (): ReadonlyArray<StatRow> =>
  Arr.map(Arr.range(1, STAT_ROWS), emptyStatRow);

export const isPaired = (kind: StatKind): boolean => kind !== "1-VAR";

export const columnsOf = (
  kind: StatKind,
  frequency: boolean,
): ReadonlyArray<"x" | "y" | "freq"> =>
  isPaired(kind)
    ? frequency
      ? ["x", "y", "freq"]
      : ["x", "y"]
    : frequency
      ? ["x", "freq"]
      : ["x"];

export const pointsOf = (
  rows: ReadonlyArray<StatRow>,
  frequency: boolean,
): ReadonlyArray<StatPoint> =>
  Arr.flatMap(rows, (row) => {
    const x = Number(row.x);
    const y = row.y === "" ? 0 : Number(row.y);
    const freq = frequency ? (row.freq === "" ? 1 : Number(row.freq)) : 1;
    return row.x !== "" &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(freq)
      ? [{ x, y, frequency: freq }]
      : [];
  });

const sumBy = (
  points: ReadonlyArray<StatPoint>,
  project: (point: StatPoint) => number,
): number =>
  Arr.reduce(
    points,
    0,
    (total, point) => total + point.frequency * project(point),
  );

export interface Sums {
  readonly n: number;
  readonly sx: number;
  readonly sy: number;
  readonly sxx: number;
  readonly syy: number;
  readonly sxy: number;
  readonly sx2: number;
  readonly sy2: number;
  readonly sx3: number;
  readonly sx4: number;
  readonly sx2y: number;
}

export const sumsOf = (points: ReadonlyArray<StatPoint>): Sums => {
  const n = Arr.reduce(points, 0, (total, point) => total + point.frequency);
  const sx = sumBy(points, (point) => point.x);
  const sy = sumBy(points, (point) => point.y);
  const sxx = sumBy(points, (point) => point.x * point.x);
  const syy = sumBy(points, (point) => point.y * point.y);
  const sxy = sumBy(points, (point) => point.x * point.y);
  return {
    n,
    sx,
    sy,
    sxx,
    syy,
    sxy,
    sx2: sxx,
    sy2: syy,
    sx3: sumBy(points, (point) => point.x ** 3),
    sx4: sumBy(points, (point) => point.x ** 4),
    sx2y: sumBy(points, (point) => point.x * point.x * point.y),
  };
};

export interface Regression {
  readonly a: number;
  readonly b: number;
  readonly c?: number;
  readonly r?: number;

  readonly at: (x: number) => number;

  readonly inverse: (y: number) => ReadonlyArray<number>;
}

const linearFrom = (
  xs: ReadonlyArray<number>,
  ys: ReadonlyArray<number>,
  weights: ReadonlyArray<number>,
): Option.Option<{
  readonly a: number;
  readonly b: number;
  readonly r: number;
}> => {
  const n = Arr.reduce(weights, 0, (total, weight) => total + weight);
  if (n < 2) return Option.none();
  const meanX =
    Arr.reduce(
      xs,
      0,
      (total, value, index) => total + value * (weights[index] ?? 1),
    ) / n;
  const meanY =
    Arr.reduce(
      ys,
      0,
      (total, value, index) => total + value * (weights[index] ?? 1),
    ) / n;
  const sxx = Arr.reduce(
    xs,
    0,
    (total, value, index) =>
      total + (weights[index] ?? 1) * (value - meanX) ** 2,
  );
  const syy = Arr.reduce(
    ys,
    0,
    (total, value, index) =>
      total + (weights[index] ?? 1) * (value - meanY) ** 2,
  );
  const sxy = Arr.reduce(
    xs,
    0,
    (total, value, index) =>
      total +
      (weights[index] ?? 1) * (value - meanX) * ((ys[index] ?? 0) - meanY),
  );
  if (sxx === 0) return Option.none();
  const b = sxy / sxx;
  const a = meanY - b * meanX;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return Option.some({ a, b, r });
};

const quadraticFrom = (
  points: ReadonlyArray<StatPoint>,
): Option.Option<{
  readonly a: number;
  readonly b: number;
  readonly c: number;
}> => {
  const sums = sumsOf(points);
  if (sums.n < 3) return Option.none();

  const matrix = [
    [sums.n, sums.sx, sums.sx2, sums.sy],
    [sums.sx, sums.sx2, sums.sx3, sums.sxy],
    [sums.sx2, sums.sx3, sums.sx4, sums.sx2y],
  ];
  const solved = gauss(matrix);
  return solved._tag === "None"
    ? Option.none()
    : Option.some({
        a: solved.value[0] ?? 0,
        b: solved.value[1] ?? 0,
        c: solved.value[2] ?? 0,
      });
};

const gauss = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
): Option.Option<ReadonlyArray<number>> => {
  const size = rows.length;
  const pivot = (
    matrix: ReadonlyArray<ReadonlyArray<number>>,
    column: number,
  ) =>
    Arr.findFirstIndex(
      Arr.range(column, size - 1),
      (row) => Math.abs(matrix[row]?.[column] ?? 0) > 1e-14,
    );
  const eliminate = (
    matrix: ReadonlyArray<ReadonlyArray<number>>,
    column: number,
  ): ReadonlyArray<ReadonlyArray<number>> => {
    const found = pivot(matrix, column);
    if (Option.isNone(found)) return matrix;
    const rowIndex = Option.getOrElse(found, () => column);
    const base = matrix[rowIndex] ?? [];
    const factor = base[column] ?? 1;
    const normalised = Arr.map(base, (value) => value / factor);
    const withPivot = Arr.map(matrix, (row, index) =>
      index === rowIndex ? normalised : row,
    );
    return Arr.map(withPivot, (row, index) => {
      if (index === rowIndex) return row;
      const scale = row[column] ?? 0;
      return Arr.map(
        row,
        (value, cell) => value - scale * (normalised[cell] ?? 0),
      );
    });
  };
  const reduced = Arr.reduce(Arr.range(0, size - 1), rows, eliminate);
  const solution = Arr.map(Arr.range(0, size - 1), (row) => {
    const held = reduced[row] ?? [];
    const diagonal = held[row] ?? 0;
    return diagonal === 0 ? Number.NaN : (held[size] ?? 0) / diagonal;
  });
  return Arr.every(solution, Number.isFinite)
    ? Option.some(solution)
    : Option.none();
};

export const regressionOf = (
  kind: StatKind,
  points: ReadonlyArray<StatPoint>,
): Option.Option<Regression> => {
  const weights = Arr.map(points, (point) => point.frequency);
  const xs = Arr.map(points, (point) => point.x);
  const ys = Arr.map(points, (point) => point.y);
  if (kind === "1-VAR" || points.length < 2) return Option.none();
  if (kind === "_+CX²") {
    return Option.map(quadraticFrom(points), (coefficients) => ({
      a: coefficients.a,
      b: coefficients.b,
      c: coefficients.c,
      at: (x: number) =>
        coefficients.a + coefficients.b * x + coefficients.c * x * x,
      inverse: (y: number) => {
        const c = coefficients.c;
        const b = coefficients.b;
        const a = coefficients.a - y;
        if (Math.abs(c) < 1e-15) {
          return Math.abs(b) < 1e-15 ? [] : [-a / b];
        }
        const discriminant = b * b - 4 * c * a;
        if (discriminant < 0) return [];
        const root = Math.sqrt(discriminant);
        return [(-b + root) / (2 * c), (-b - root) / (2 * c)];
      },
    }));
  }
  if (kind === "ln X") {
    const transformed = Arr.map(xs, (x) => Math.log(x));
    return Option.map(linearFrom(transformed, ys, weights), (linear) => ({
      a: linear.a,
      b: linear.b,
      r: linear.r,
      at: (x: number) => linear.a + linear.b * Math.log(x),
      inverse: (y: number) => [Math.exp((y - linear.a) / linear.b)],
    }));
  }
  if (kind === "e^X") {
    const transformed = Arr.map(ys, (y) => Math.log(y));
    return Option.map(linearFrom(xs, transformed, weights), (linear) => ({
      a: Math.exp(linear.a),
      b: linear.b,
      r: linear.r,
      at: (x: number) => Math.exp(linear.a + linear.b * x),
      inverse: (y: number) => [(Math.log(y) - linear.a) / linear.b],
    }));
  }
  if (kind === "A·B^X") {
    const transformed = Arr.map(ys, (y) => Math.log(y));
    return Option.map(linearFrom(xs, transformed, weights), (linear) => ({
      a: Math.exp(linear.a),
      b: Math.exp(linear.b),
      r: linear.r,
      at: (x: number) => Math.exp(linear.a) * Math.exp(linear.b * x),
      inverse: (y: number) => [(Math.log(y) - linear.a) / linear.b],
    }));
  }
  if (kind === "A·X^B") {
    const transformedX = Arr.map(xs, (x) => Math.log(x));
    const transformedY = Arr.map(ys, (y) => Math.log(y));
    return Option.map(
      linearFrom(transformedX, transformedY, weights),
      (linear) => ({
        a: Math.exp(linear.a),
        b: linear.b,
        r: linear.r,
        at: (x: number) => Math.exp(linear.a) * x ** linear.b,
        inverse: (y: number) => [Math.exp((Math.log(y) - linear.a) / linear.b)],
      }),
    );
  }
  if (kind === "1/X") {
    const transformed = Arr.map(xs, (x) => 1 / x);
    return Option.map(linearFrom(transformed, ys, weights), (linear) => ({
      a: linear.a,
      b: linear.b,
      r: linear.r,
      at: (x: number) => linear.a + linear.b / x,
      inverse: (y: number) => [linear.b / (y - linear.a)],
    }));
  }
  const transformed = Arr.map(ys, (y) => y);
  return Option.map(linearFrom(xs, transformed, weights), (linear) => ({
    a: linear.a,
    b: linear.b,
    r: linear.r,
    at: (x: number) => linear.a + linear.b * x,
    inverse: (y: number) => [(y - linear.a) / linear.b],
  }));
};

export interface Reading {
  readonly label: string;
  readonly value: number;
}

const mean = (points: ReadonlyArray<StatPoint>, axis: "x" | "y"): number => {
  const total = Arr.reduce(points, 0, (sum, point) => sum + point.frequency);
  return total === 0
    ? 0
    : Arr.reduce(
        points,
        0,
        (sum, point) => sum + point.frequency * point[axis],
      ) / total;
};

const deviation = (
  points: ReadonlyArray<StatPoint>,
  axis: "x" | "y",
  sample: boolean,
): number => {
  const n = Arr.reduce(points, 0, (total, point) => total + point.frequency);
  const centre = mean(points, axis);
  const variance =
    Arr.reduce(
      points,
      0,
      (total, point) => total + point.frequency * (point[axis] - centre) ** 2,
    ) / Math.max(1, sample ? n - 1 : n);
  return Math.sqrt(variance);
};

const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const absolute = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absolute);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-absolute * absolute));
};

const normalCdf = (value: number): number =>
  0.5 * (1 + erf(value / Math.SQRT2));

export type StatCommand = "sum" | "var" | "reg" | "minmax" | "distr";

export type StatReadingId =
  | "Σx²"
  | "Σx"
  | "Σy²"
  | "Σy"
  | "Σxy"
  | "Σx³"
  | "Σx²y"
  | "Σx⁴"
  | "n"
  | "x̄"
  | "σx"
  | "sx"
  | "ȳ"
  | "σy"
  | "sy"
  | "A"
  | "B"
  | "C"
  | "r"
  | "x̂"
  | "ŷ"
  | "x̂1"
  | "x̂2"
  | "minX"
  | "maxX"
  | "minY"
  | "maxY"
  | "t"
  | "P()"
  | "Q()"
  | "R()";

export interface StatQuery {
  readonly kind: StatKind;
  readonly points: ReadonlyArray<StatPoint>;

  readonly argument?: number;
}

export const statReading = (
  query: StatQuery,
  id: StatReadingId,
): Option.Option<Reading> => {
  const { points, kind } = query;
  if (points.length === 0) return Option.none();
  const sums = sumsOf(points);
  if (id === "Σx²") return Option.some({ label: id, value: sums.sx2 });
  if (id === "Σx") return Option.some({ label: id, value: sums.sx });
  if (id === "Σy²") return Option.some({ label: id, value: sums.sy2 });
  if (id === "Σy") return Option.some({ label: id, value: sums.sy });
  if (id === "Σxy") return Option.some({ label: id, value: sums.sxy });
  if (id === "Σx³") return Option.some({ label: id, value: sums.sx3 });
  if (id === "Σx²y") return Option.some({ label: id, value: sums.sx2y });
  if (id === "Σx⁴") return Option.some({ label: id, value: sums.sx4 });
  if (id === "n") return Option.some({ label: id, value: sums.n });
  if (id === "x̄") return Option.some({ label: id, value: mean(points, "x") });
  if (id === "σx")
    return Option.some({ label: id, value: deviation(points, "x", false) });
  if (id === "sx")
    return Option.some({ label: id, value: deviation(points, "x", true) });
  if (id === "ȳ") {
    return isPaired(kind)
      ? Option.some({ label: id, value: mean(points, "y") })
      : Option.none();
  }
  if (id === "σy") {
    return isPaired(kind)
      ? Option.some({ label: id, value: deviation(points, "y", false) })
      : Option.none();
  }
  if (id === "sy") {
    return isPaired(kind)
      ? Option.some({ label: id, value: deviation(points, "y", true) })
      : Option.none();
  }
  if (id === "minX")
    return Option.some({
      label: id,
      value: Math.min(...Arr.map(points, (point) => point.x)),
    });
  if (id === "maxX")
    return Option.some({
      label: id,
      value: Math.max(...Arr.map(points, (point) => point.x)),
    });
  if (id === "minY") {
    return isPaired(kind)
      ? Option.some({
          label: id,
          value: Math.min(...Arr.map(points, (point) => point.y)),
        })
      : Option.none();
  }
  if (id === "maxY") {
    return isPaired(kind)
      ? Option.some({
          label: id,
          value: Math.max(...Arr.map(points, (point) => point.y)),
        })
      : Option.none();
  }
  if (id === "t" || id === "P()" || id === "Q()" || id === "R()") {
    const argument = query.argument;
    if (argument === undefined) return Option.none();
    const sigma = deviation(points, "x", false);
    if (id === "t") {
      return sigma === 0
        ? Option.none()
        : Option.some({
            label: id,
            value: (argument - mean(points, "x")) / sigma,
          });
    }
    const normalised = sigma === 0 ? 0 : (argument - mean(points, "x")) / sigma;
    const lower = normalCdf(normalised);
    return Option.some({
      label: id,
      value: id === "P()" ? lower : id === "Q()" ? lower - 0.5 : 1 - lower,
    });
  }
  return Option.flatMap(regressionOf(kind, points), (model) => {
    if (id === "A") return Option.some({ label: id, value: model.a });
    if (id === "B") return Option.some({ label: id, value: model.b });
    if (id === "C") {
      return model.c === undefined
        ? Option.none()
        : Option.some({ label: id, value: model.c });
    }
    if (id === "r") {
      return model.r === undefined
        ? Option.none()
        : Option.some({ label: id, value: model.r });
    }
    const argument = query.argument;
    if (argument === undefined) return Option.none();
    if (id === "ŷ")
      return Option.some({ label: id, value: model.at(argument) });
    if (id === "x̂") {
      const first = model.inverse(argument)[0];
      return first === undefined
        ? Option.none()
        : Option.some({ label: id, value: first });
    }
    if (id === "x̂1" || id === "x̂2") {
      const roots = model.inverse(argument);
      const value = roots[id === "x̂1" ? 0 : 1];
      return value === undefined
        ? Option.none()
        : Option.some({ label: id, value });
    }
    return Option.none();
  });
};

export const readingsFor = (
  query: StatQuery,
  command: StatCommand,
): ReadonlyArray<Reading> => {
  const ids: Readonly<Record<StatCommand, ReadonlyArray<StatReadingId>>> = {
    sum: isPaired(query.kind)
      ? ["Σx²", "Σx", "Σy²", "Σy", "Σxy", "Σx³", "Σx²y", "Σx⁴"]
      : ["Σx²", "Σx"],
    var: isPaired(query.kind)
      ? ["n", "x̄", "σx", "sx", "ȳ", "σy", "sy"]
      : ["n", "x̄", "σx", "sx"],
    reg: isPaired(query.kind) ? ["A", "B", "C", "r", "x̂", "ŷ", "x̂1", "x̂2"] : [],
    minmax: isPaired(query.kind)
      ? ["minX", "maxX", "minY", "maxY"]
      : ["minX", "maxX"],
    distr: ["t", "P()", "Q()", "R()"],
  };
  return Arr.flatMap(ids[command], (id) =>
    Option.match(statReading(query, id), {
      onNone: () => [],
      onSome: (reading) => [reading],
    }),
  );
};
