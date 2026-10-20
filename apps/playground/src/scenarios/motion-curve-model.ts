/**
 * The declared tween curve: does `ease`, `delay` and a cubic-bezier reach the
 * frame? (plan `823`)
 *
 * The bug being guarded: every motion claim in both registries declares
 * `ease: "linear"`, so a runtime that accepted `ease`, `delay` and a
 * four-number curve and ignored them — tweening linearly, immediately, or
 * retargeting from the target instead of the visible value — passes the whole
 * suite while every component's declared curve is unproven.
 *
 * This module owns the CSS curve model, the sample plan and the fit, so the
 * view, the checks and the tests read one source of truth. The runtime solves a
 * cubic-bezier by bisection and clamps the result to `[0, 1]`; this model does
 * the same, so an exact geometry comparison is honest.
 */
import { Order, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The five easing names `MotionEase` publishes. */
export type NamedEase = "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut";

/** A named ease or a cubic-bezier control-point tuple. */
export type Curve = NamedEase | [number, number, number, number];

/** The named eases, in the order the checks report them. */
export const NAMED_EASES: ReadonlyArray<NamedEase> = [
  "linear",
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
];

/**
 * The probe's cubic-bezier fixture, shared by the view and its expectation.
 *
 * Chosen so that **every** named curve misses it by at least `0.09` progress
 * (21 px of the probe's travel) at one of the three sample times, which is what
 * makes "a tuple is honoured, not aliased to a name" a falsifiable check. A
 * mutable tuple is what `MotionEase` accepts, so no cast is needed.
 */
export const CUSTOM_CURVE: [number, number, number, number] = [
  0.6, 0.05, 0.3, 0.95,
];

/** The probe's tween duration, in milliseconds (`transition.duration` is seconds). */
export const CURVE_DURATION_MS = 200;

/** The runtime's default duration in milliseconds, measured by the default row. */
export const DEFAULT_DURATION_MS = 300;

/** The travel every fixture animates, in pixels. */
export const TRAVEL = 240;

/** The three sample times of a 200 ms tween: a quarter, half and three quarters. */
export const SAMPLE_TIMES: ReadonlyArray<number> = [50, 100, 150];

/** The largest deviation the fit accepts; above it, nothing is named. */
export const MATCH_TOLERANCE = 0.05;

/** The delay the delay fixture declares, in milliseconds. */
export const CURVE_DELAY_MS = 100;

const CONTROL_POINTS: Record<
  Exclude<NamedEase, "linear">,
  readonly [number, number, number, number]
> = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

/** The CSS definition, solved the way the runtime solves it. */
const BISECTION_ROUNDS = 40;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const bezierSample = (t: number, first: number, second: number): number => {
  const c = 3 * first;
  const b = 3 * (second - first) - c;
  const a = 1 - c - b;
  return ((a * t + b) * t + c) * t;
};

const bezierAt = (
  x: number,
  [x1, y1, x2, y2]: readonly [number, number, number, number],
): number => {
  const bracket = Arr.reduce(
    Arr.range(0, BISECTION_ROUNDS),
    { low: 0, high: 1 },
    (current) => {
      const middle = (current.low + current.high) / 2;
      return bezierSample(middle, x1, x2) < x
        ? { low: middle, high: current.high }
        : { low: current.low, high: middle };
    },
  );
  return clamp01(bezierSample((bracket.low + bracket.high) / 2, y1, y2));
};

/** Whether a curve carries control points rather than a name. */
export const isTuple = (
  curve: Curve,
): curve is [number, number, number, number] => typeof curve !== "string";

/** The eased fraction of the distance at `progress` of the duration. */
export const easedProgress = (curve: Curve, progress: number): number => {
  const at = clamp01(progress);
  return curve === "linear"
    ? at
    : bezierAt(at, isTuple(curve) ? curve : CONTROL_POINTS[curve]);
};

/** One declared tween, in the units a `MotionTransition` declares. */
export interface Tween {
  readonly from: number;
  readonly to: number;
  readonly durationMs: number;
  readonly delayMs?: number;
  readonly ease: Curve;
}

/** The painted value of a tween at `elapsedMs`, clamped at both ends. */
export const widthAt = (tween: Tween, elapsedMs: number): number => {
  const delay = tween.delayMs ?? 0;
  if (elapsedMs <= delay) return tween.from;
  const duration = Math.max(tween.durationMs, 1);
  const progress = Math.min(1, (elapsedMs - delay) / duration);
  return (
    tween.from + (tween.to - tween.from) * easedProgress(tween.ease, progress)
  );
};

/** One observed sample: a width as a fraction of the travel, at a time. */
export interface Sample {
  readonly at: number;
  readonly progress: number;
}

/** One named curve and how far it misses the samples. */
interface ScoredEase {
  readonly ease: NamedEase;
  readonly deviation: number;
}

const worstDeviation = (
  ease: NamedEase,
  samples: ReadonlyArray<Sample>,
  durationMs: number,
): number =>
  Arr.reduce(samples, 0, (worst, sample) =>
    Math.max(
      worst,
      Math.abs(easedProgress(ease, sample.at / durationMs) - sample.progress),
    ),
  );

/**
 * The named curve whose model is closest to the samples, or `None` when no
 * named curve is within {@link MATCH_TOLERANCE}.
 *
 * A wrong curve is named instead of merely rejected, so a failing run reports
 * what the runtime actually paints.
 */
export const nearestEase = (
  samples: ReadonlyArray<Sample>,
  durationMs: number,
): Option.Option<NamedEase> => {
  const scored: ReadonlyArray<ScoredEase> = Arr.map(NAMED_EASES, (ease) => ({
    ease,
    deviation: worstDeviation(ease, samples, durationMs),
  }));
  const best = pipe(
    scored,
    Arr.sort(
      Order.mapInput(
        Order.Number,
        (candidate: ScoredEase) => candidate.deviation,
      ),
    ),
    Arr.head,
  );
  return Option.flatMap(best, (candidate) =>
    candidate.deviation <= MATCH_TOLERANCE
      ? Option.some(candidate.ease)
      : Option.none(),
  );
};

/** A sample taken from a width, in travel fractions. */
export const sampleAt = (at: number, width: number): Sample => ({
  at,
  progress: width / TRAVEL,
});
