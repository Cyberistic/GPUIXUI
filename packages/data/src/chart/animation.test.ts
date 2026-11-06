import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  DEFAULT_ANIMATION_DURATION,
  between,
  easeOutCubic,
  interpolateSeries,
  interpolateValues,
  scaleSeries,
  scaleValue,
} from "./animation.js";

const series = (key: string, values: ReadonlyArray<number>) => ({
  key,
  label: key,
  values,
});

describe("the tween's numbers", () => {
  it("stays inside its endpoints", () => {
    expect(between(0, 100, 0)).toBe(0);
    expect(between(0, 100, 1)).toBe(100);
    expect(between(0, 100, 0.25)).toBe(25);
    expect(between(0, 100, 2)).toBe(100);
    expect(between(0, 100, -1)).toBe(0);
  });

  it("treats an unreadable value as zero rather than painting NaN", () => {
    expect(between(Number.NaN, 100, 0.5)).toBe(50);
    expect(between(0, Number.POSITIVE_INFINITY, 0.5)).toBe(0);
  });

  it("eases out, so the last frames settle", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(Number.NaN)).toBe(0);
  });
});

describe("a data set blended toward another", () => {
  it("matches a series by its key, not its position", () => {
    const from = [series("a", [10]), series("b", [20])];
    const to = [series("b", [40]), series("a", [30])];
    const middle = interpolateSeries(from, to, 0.5);
    expect(Arr.map(middle, (one) => [one.key, one.values[0]])).toEqual([
      ["b", 30],
      ["a", 20],
    ]);
  });

  it("grows a series the new set adds from zero", () => {
    const middle = interpolateSeries([], [series("new", [100])], 0.5);
    expect(middle[0]?.values).toEqual([50]);
  });

  it("drops a series the new set no longer carries", () => {
    const middle = interpolateSeries([series("gone", [100])], [], 0.5);
    expect(middle).toEqual([]);
  });

  it("lands exactly on the target at the end", () => {
    const target = [series("a", [32, 48])];
    expect(interpolateSeries([series("a", [1, 2])], target, 1)).toEqual(target);
    expect(interpolateSeries([series("a", [1, 2])], target, 4)).toEqual(target);
  });

  it("reads a value past either list's length as zero", () => {
    const middle = interpolateSeries(
      [series("a", [10])],
      [series("a", [10, 20])],
      0.5,
    );
    expect(middle[0]?.values).toEqual([10, 10]);
  });

  it("blends a bare list the same way", () => {
    expect(interpolateValues([0, 10], [10, 20], 0.5)).toEqual([5, 15]);
    expect(interpolateValues([], [4], 0.25)).toEqual([1]);
  });
});

describe("a mount's zero state", () => {
  it("takes Recharts' duration rather than the old 320ms tween", () => {
    expect(DEFAULT_ANIMATION_DURATION).toBe(1500);
  });

  it("starts at zero and lands exactly on the data", () => {
    expect(scaleValue(100, 0)).toBe(0);
    expect(scaleValue(100, 0.5)).toBe(50);
    expect(scaleValue(100, 1)).toBe(100);
    expect(scaleValue(-40, 0.5)).toBe(-20);
    expect(scaleValue(100, 2)).toBe(100);
    expect(scaleValue(100, -1)).toBe(0);
  });

  it("keeps a value the geometry cannot draw", () => {
    expect(Number.isNaN(scaleValue(Number.NaN, 0))).toBe(true);
    expect(Number.isNaN(scaleValue(Number.NaN, 1))).toBe(true);
    expect(scaleValue(Number.POSITIVE_INFINITY, 1)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it("moves a series' numbers while its identity stays at the target", () => {
    const target = [series("a", [10, -4])];
    expect(scaleSeries(target, 0)).toEqual([
      { key: "a", label: "a", values: [0, 0] },
    ]);
    expect(scaleSeries(target, 1)).toEqual(target);
  });
});
