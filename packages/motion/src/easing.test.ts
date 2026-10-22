/**
 * Guards the easing curves: the monotonic family stays monotonic, the
 * overshooting family overshoots by the expected sign, and the Bezier inversion
 * hits its endpoints. Reverting any curve's formula fails its assertion.
 */
import { describe, expect, it } from "vitest";
import {
  anticipate,
  backIn,
  backInOut,
  backOut,
  bezier,
  circIn,
  circInOut,
  circOut,
  easeIn,
  easeInOut,
  easeOut,
  linear,
  type Easing,
} from "./easing.js";

const monotonic: readonly [string, Easing][] = [
  ["linear", linear],
  ["easeIn", easeIn],
  ["easeOut", easeOut],
  ["easeInOut", easeInOut],
  ["circIn", circIn],
  ["circOut", circOut],
  ["circInOut", circInOut],
];

describe("easing", () => {
  it.each(monotonic)("%s is monotonic on [0, 1]", (_name, easing) => {
    const step = 1 / 32;
    for (let i = 0; i < 32; i += 1) {
      expect(easing((i + 1) * step)).toBeGreaterThanOrEqual(easing(i * step));
    }
  });

  it("hits the 0/1 endpoints for the closed curves", () => {
    const closed: readonly Easing[] = [
      linear,
      easeIn,
      easeOut,
      easeInOut,
      circIn,
      circOut,
      circInOut,
      backIn,
      backOut,
      backInOut,
      anticipate,
    ];
    closed.forEach((easing) => {
      expect(easing(0)).toBeCloseTo(0, 5);
      expect(easing(1)).toBeCloseTo(1, 5);
    });
  });

  it("samples the known midpoints", () => {
    expect(linear(0.5)).toBe(0.5);
    expect(easeIn(0.5)).toBe(0.125);
    expect(easeOut(0.5)).toBe(0.875);
    expect(easeInOut(0.25)).toBeCloseTo(0.15625, 5);
    expect(circOut(0.5)).toBeCloseTo(Math.sqrt(0.75), 5);
  });

  it("back and anticipate overshoot in the expected direction", () => {
    expect(backOut(0.5)).toBeGreaterThan(1);
    expect(backIn(0.5)).toBeLessThan(0);
    expect(anticipate(0.25)).toBeLessThan(0);
    expect(anticipate(0.75)).toBeGreaterThan(0.9);
  });

  it("bezier is the identity curve with unit controls", () => {
    const identity = bezier(0, 0, 1, 1);
    expect(identity(0)).toBeCloseTo(0, 5);
    expect(identity(0.5)).toBeCloseTo(0.5, 5);
    expect(identity(1)).toBeCloseTo(1, 5);
  });

  it("bezier falls back to linear for non-finite controls", () => {
    const fallback = bezier(Number.NaN, 0, 1, 1);
    expect(fallback(0.5)).toBe(0.5);
  });

  it("reads a progress it cannot read as the start of the run", () => {
    // Every curve promises a value over `t` clamped to `[0, 1]`, and the
    // package's totality rule is that a number a formula cannot read is
    // replaced before it arrives. `clamp01` let `NaN` through, so a presenter
    // whose progress read failed got `NaN` from every curve — a value the
    // runtime paints as nothing.
    const curves: readonly [string, Easing][] = [
      ...monotonic,
      ["backIn", backIn],
      ["backOut", backOut],
      ["backInOut", backInOut],
      ["anticipate", anticipate],
      ["bezier", bezier(0.4, 0, 0.2, 1)],
    ];
    curves.forEach(([name, easing]) => {
      expect(easing(Number.NaN), name).toBeCloseTo(0, 5);
      [Number.NEGATIVE_INFINITY, -1, 0, 0.5, 1, 2, Number.POSITIVE_INFINITY]
        .map(easing)
        .forEach((value) => expect(Number.isFinite(value), name).toBe(true));
    });
  });
});
