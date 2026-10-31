import * as Option from "effect/Option";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { solveEquation } from "./eqn.js";
import {
  pointsOf,
  readingsFor,
  regressionOf,
  statReading,
  type StatRow,
} from "./stat.js";

describe("STAT mode", () => {
  it("computes the manual's frequency-weighted mean and σx", () => {
    const rows: ReadonlyArray<StatRow> = [
      { x: "1", y: "", freq: "1" },
      { x: "2", y: "", freq: "2" },
      { x: "3", y: "", freq: "3" },
      { x: "4", y: "", freq: "2" },
      { x: "5", y: "", freq: "1" },
    ];
    const points = pointsOf(rows, true);
    const mean = statReading({ kind: "1-VAR", points }, "x̄");
    expect(Option.getOrElse(mean, () => ({ label: "", value: 0 })).value).toBe(
      3,
    );
    const sigma = statReading({ kind: "1-VAR", points }, "σx");
    expect(
      Option.getOrElse(sigma, () => ({ label: "", value: 0 })).value,
    ).toBeCloseTo(1.154700538, 8);
  });

  it("computes the manual's linear regression coefficient", () => {
    const rows: ReadonlyArray<StatRow> = [
      { x: "20", y: "3150", freq: "" },
      { x: "110", y: "7310", freq: "" },
      { x: "200", y: "8800", freq: "" },
      { x: "290", y: "9310", freq: "" },
    ];
    const points = pointsOf(rows, false);
    const linear = regressionOf("A+BX", points);
    expect(Option.isSome(linear)).toBe(true);
    if (Option.isSome(linear))
      expect(linear.value.r ?? 0).toBeCloseTo(0.923, 3);
    const logarithmic = regressionOf("ln X", points);
    expect(Option.isSome(logarithmic)).toBe(true);
    if (Option.isSome(logarithmic)) {
      expect(logarithmic.value.r ?? 0).toBeCloseTo(0.998, 3);
      expect(logarithmic.value.a).toBeCloseTo(-3857.984, 3);
      expect(logarithmic.value.b).toBeCloseTo(2357.532, 3);
    }
  });

  it("estimates x̂ from y in the logarithmic regression", () => {
    const rows: ReadonlyArray<StatRow> = [
      { x: "20", y: "3150", freq: "" },
      { x: "110", y: "7310", freq: "" },
      { x: "200", y: "8800", freq: "" },
      { x: "290", y: "9310", freq: "" },
    ];
    const estimate = statReading(
      { kind: "ln X", points: pointsOf(rows, false), argument: -130 },
      "x̂",
    );
    expect(
      Option.getOrElse(estimate, () => ({ label: "", value: 0 })).value,
    ).toBeCloseTo(4.861, 3);
  });

  it("offers every reading a menu names", () => {
    const rows: ReadonlyArray<StatRow> = [
      { x: "1", y: "2", freq: "" },
      { x: "2", y: "4", freq: "" },
      { x: "3", y: "6", freq: "" },
    ];
    const points = pointsOf(rows, false);
    const sums = readingsFor({ kind: "A+BX", points }, "sum");
    expect(sums.map((reading) => reading.label)).toContain("Σxy");
    const vars = readingsFor({ kind: "A+BX", points }, "var");
    expect(vars.map((reading) => reading.label)).toEqual([
      "n",
      "x̄",
      "σx",
      "sx",
      "ȳ",
      "σy",
      "sy",
    ]);
  });

  it("computes the normal distribution readings", () => {
    const rows: ReadonlyArray<StatRow> = [
      { x: "1", y: "", freq: "" },
      { x: "2", y: "", freq: "" },
      { x: "3", y: "", freq: "" },
      { x: "4", y: "", freq: "" },
      { x: "5", y: "", freq: "" },
    ];
    const points = pointsOf(rows, false);
    const p = statReading(
      { kind: "1-VAR", points, argument: 3 + Math.SQRT2 },
      "P()",
    );
    expect(
      Option.getOrElse(p, () => ({ label: "", value: 0 })).value,
    ).toBeCloseTo(0.8413, 3);
  });
});

describe("EQN mode", () => {
  it("solves the manual's 2×2 system", () => {
    const solutions = solveEquation("2x2", [1, 2, 3, 2, 3, 4]);
    expect(Option.isSome(solutions)).toBe(true);
    if (Option.isSome(solutions)) {
      expect(solutions.value[0]?.value._tag).toBe("real");
      if (solutions.value[0]?.value._tag === "real") {
        expect(solutions.value[0].value.value).toBeCloseTo(-1, 10);
      }
      if (solutions.value[1]?.value._tag === "real") {
        expect(solutions.value[1].value.value).toBeCloseTo(2, 10);
      }
    }
  });

  it("solves the manual's 3×3 system", () => {
    const solutions = solveEquation(
      "3x3",
      [1, -1, 1, 2, 1, 1, -1, 0, -1, 1, 1, 4],
    );
    expect(Option.isSome(solutions)).toBe(true);
    if (Option.isSome(solutions)) {
      const values = solutions.value.map((solution) =>
        solution.value._tag === "real" ? solution.value.value : Number.NaN,
      );
      expect(values[0]).toBeCloseTo(1, 10);
      expect(values[1]).toBeCloseTo(2, 10);
      expect(values[2]).toBeCloseTo(3, 10);
    }
  });

  it("solves a quadratic with complex roots", () => {
    const solutions = solveEquation("quadratic", [1, 1, 3 / 4]);
    expect(Option.isSome(solutions)).toBe(true);
    if (Option.isSome(solutions)) {
      expect(solutions.value[0]?.value._tag).toBe("complex");
      if (solutions.value[0]?.value._tag === "complex") {
        expect(solutions.value[0].value.re).toBeCloseTo(-0.5, 10);
        expect(Math.abs(solutions.value[0].value.im)).toBeCloseTo(
          Math.SQRT2 / 2,
          10,
        );
      }
    }
  });

  it("solves a cubic", () => {
    const solutions = solveEquation("cubic", [1, -2, -1, 2]);
    expect(Option.isSome(solutions)).toBe(true);
    if (Option.isSome(solutions)) {
      const values = Arr.sort(
        Arr.map(solutions.value, (solution) =>
          solution.value._tag === "real" ? solution.value.value : Number.NaN,
        ),
        Order.Number,
      );
      expect(values[0]).toBeCloseTo(-1, 9);
      expect(values[1]).toBeCloseTo(1, 9);
      expect(values[2]).toBeCloseTo(2, 9);
    }
  });
});
