/**
 * Guards the declared-curve model (plan `823`).
 *
 * The bug being guarded: every motion check in both registries declares
 * `ease: "linear"`, so the runtime's `ease`, `delay` and cubic-bezier support
 * is unproven. This model is what the probe compares the paint against, so its
 * own premises must be falsifiable: the named curves must match the CSS
 * reference, the fixture's tuple must be separable from every name, the names
 * must be separable from each other (or the fit proves nothing), and the fit
 * must refuse samples no name explains. Each test fails if its rule is broken.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  CURVE_DELAY_MS,
  CURVE_DURATION_MS,
  CUSTOM_CURVE,
  DEFAULT_DURATION_MS,
  MATCH_TOLERANCE,
  NAMED_EASES,
  SAMPLE_TIMES,
  TRAVEL,
  easedProgress,
  isTuple,
  nearestEase,
  sampleAt,
  widthAt,
  type NamedEase,
} from "./motion-curve-model.js";

/** The model's progress grid, dense enough to catch a non-monotonic curve. */
const GRID = Arr.map(Arr.range(0, 100), (step) => step / 100);

const sampleOf = (ease: NamedEase, durationMs: number) =>
  Arr.map(SAMPLE_TIMES, (at) =>
    sampleAt(at, widthAt({ from: 0, to: TRAVEL, durationMs, ease }, at)),
  );

/** The largest model gap between two curves over the probe's sample times. */
const separation = (left: NamedEase, right: NamedEase): number =>
  Arr.reduce(SAMPLE_TIMES, 0, (worst, at) =>
    Math.max(
      worst,
      Math.abs(
        easedProgress(left, at / CURVE_DURATION_MS) -
          easedProgress(right, at / CURVE_DURATION_MS),
      ),
    ),
  );

describe("the declared-curve model", () => {
  it("linear is the identity", () => {
    expect(easedProgress("linear", 0.25)).toBeCloseTo(0.25, 6);
    expect(easedProgress("linear", 0.5)).toBeCloseTo(0.5, 6);
    expect(easedProgress("linear", 0.75)).toBeCloseTo(0.75, 6);
  });

  it.each(NAMED_EASES)("%s is monotonic and closed at both ends", (ease) => {
    const values = Arr.map(GRID, (progress) => easedProgress(ease, progress));
    expect(values[0] ?? 1).toBeCloseTo(0, 6);
    expect(values[values.length - 1] ?? 0).toBeCloseTo(1, 6);
    const regressions = Arr.filter(
      Arr.map(values, (value, index) => ({
        value,
        previous: index === 0 ? 0 : (values[index - 1] ?? 0),
      })),
      (pair) => pair.value < pair.previous - 1e-9,
    );
    expect(regressions).toEqual([]);
  });

  it("matches the CSS reference values", () => {
    expect(easedProgress("easeInOut", 0.5)).toBeCloseTo(0.5, 3);
    expect(easedProgress("easeIn", 0.25)).toBeLessThan(0.25);
    expect(easedProgress("easeOut", 0.25)).toBeGreaterThan(0.25);
    expect(easedProgress("ease", 0.5)).toBeGreaterThan(
      easedProgress("easeOut", 0.5),
    );
  });

  it("the fixture's tuple is separable from every named curve", () => {
    expect(isTuple(CUSTOM_CURVE)).toBe(true);
    const gaps = Arr.map(NAMED_EASES, (ease) =>
      Arr.reduce(SAMPLE_TIMES, 0, (worst, at) =>
        Math.max(
          worst,
          Math.abs(
            easedProgress(CUSTOM_CURVE, at / CURVE_DURATION_MS) -
              easedProgress(ease, at / CURVE_DURATION_MS),
          ),
        ),
      ),
    );
    // At least 0.09 (21 px of travel) from the closest name, so aliasing the
    // tuple to a named curve cannot pass the runtime check.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.09);
  });

  it("the named curves are separable from each other", () => {
    const gaps = Arr.flatMap(NAMED_EASES, (left, index) =>
      Arr.map(Arr.drop(NAMED_EASES, index + 1), (right) =>
        separation(left, right),
      ),
    );
    // The closest pair (`ease`/`easeOut`) still differs by ~0.12 over the
    // sample grid, which is what makes `nearestEase` a fit rather than a guess.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.1);
  });

  it("a tween holds its from-value through the delay and clamps at both ends", () => {
    const tween = {
      from: 0,
      to: TRAVEL,
      durationMs: CURVE_DURATION_MS,
      delayMs: CURVE_DELAY_MS,
      ease: "linear" as const,
    };
    expect(widthAt(tween, 0)).toBe(0);
    expect(widthAt(tween, CURVE_DELAY_MS)).toBe(0);
    expect(widthAt(tween, CURVE_DELAY_MS + CURVE_DURATION_MS / 4)).toBeCloseTo(
      TRAVEL / 4,
      6,
    );
    expect(widthAt(tween, CURVE_DELAY_MS + CURVE_DURATION_MS)).toBe(TRAVEL);
    expect(widthAt(tween, 10_000)).toBe(TRAVEL);
    expect(widthAt(tween, -5)).toBe(0);
  });

  it.each(NAMED_EASES)(
    "nearestEase identifies %s from its own samples",
    (ease) => {
      expect(
        Option.getOrElse(
          nearestEase(sampleOf(ease, CURVE_DURATION_MS), CURVE_DURATION_MS),
          () => "none",
        ),
      ).toBe(ease);
    },
  );

  it("nearestEase refuses samples no named curve explains", () => {
    const samples = Arr.map([0.9, 0.95, 0.98], (progress, index) =>
      sampleAt(SAMPLE_TIMES[index] ?? 0, progress * TRAVEL),
    );
    expect(Option.isNone(nearestEase(samples, CURVE_DURATION_MS))).toBe(true);
  });

  it("fits the default row's 300 ms duration", () => {
    const samples = Arr.map([1, 2, 3], (step) => {
      const at = (step * DEFAULT_DURATION_MS) / 6;
      return sampleAt(
        at,
        widthAt(
          {
            from: 0,
            to: TRAVEL,
            durationMs: DEFAULT_DURATION_MS,
            ease: "easeOut",
          },
          at,
        ),
      );
    });
    expect(
      Option.getOrElse(nearestEase(samples, DEFAULT_DURATION_MS), () => "none"),
    ).toBe("easeOut");
    expect(MATCH_TOLERANCE).toBeLessThan(separation("ease", "easeOut"));
  });

  it("a retarget continues from the visible value", () => {
    const tween = {
      from: 96,
      to: 0,
      durationMs: CURVE_DURATION_MS,
      ease: "linear" as const,
    };
    expect(widthAt(tween, 80)).toBeCloseTo(57.6, 6);
    // From the target (240) it would be 144; from zero, 0.
    expect(widthAt(tween, 80)).toBeLessThan(96);
  });
});
