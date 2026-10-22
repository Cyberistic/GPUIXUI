/**
 * Keyframes with normalized offsets, a stagger helper, and a small keyed
 * sequence driver.
 *
 * The keyframe sampling follows `gpui-ce-motion`'s `Animation` segment model
 * (the upper keyframe's easing shapes the segment ending there); the sequence
 * driver follows open-gpui `crates/motion/src/sequence.rs` (Apache-2.0).
 *
 * The values a caller builds a timeline from are repaired before they reach the
 * formulas: a frame whose offset or value cannot be read is not a stop, a step
 * whose timing cannot be read is placed at the start with no duration, and a
 * step that cannot be read is no wait. A `NaN` anywhere used to paint a frame
 * the runtime draws as nothing and leave `Sequence.complete` false forever.
 */

import { linear, type Easing } from "./easing.js";

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** A number a formula can read, or the fallback it stands for. */
const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/** One timed target at a normalized offset in `[0, 1]`. */
export interface Keyframe {
  readonly at: number;
  readonly value: number;
  readonly easing?: Easing;
}

/** Builds a keyframe at a normalized offset. */
export const keyframe = (
  at: number,
  value: number,
  easing?: Easing,
): Keyframe => ({ at, value, easing });

/** The frames a sample can stop on, in the order it was given. */
const stopsOf = (frames: readonly Keyframe[]): ReadonlyArray<Keyframe> =>
  frames.filter(
    (frame) => Number.isFinite(frame.at) && Number.isFinite(frame.value),
  );

/**
 * Samples sorted keyframes at unit progress, interpolating between the
 * surrounding keyframes and applying the upper keyframe's easing. Frames must be
 * sorted ascending by `at`. A progress that is not a number reads as `0`, and a
 * frame whose offset or value cannot be read is dropped rather than becoming the
 * segment's endpoint — an unreadable stop would make every value between it and
 * its neighbour `NaN`, which the runtime paints as nothing.
 */
export const sampleKeyframes = (
  frames: readonly Keyframe[],
  progress: number,
): number => {
  const stops = stopsOf(frames);
  if (stops.length === 0) return 0;
  const t = clamp01(Number.isNaN(progress) ? 0 : progress);
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (t <= first.at) return first.value;
  if (t >= last.at) return last.value;

  const upper = stops.findIndex((frame) => frame.at >= t);
  const hi = stops[upper];
  const lo = stops[upper - 1];
  if (lo === undefined || hi === undefined || hi.at === lo.at) {
    return hi?.value ?? lo?.value ?? 0;
  }
  const local = (t - lo.at) / (hi.at - lo.at);
  const easing = hi.easing ?? linear;
  return lo.value + (hi.value - lo.value) * easing(clamp01(local));
};

/** Where a stagger group starts. */
export type StaggerFrom = "start" | "end" | "center";

/**
 * The delay (ms) for the `index`-th of `count` children under `from`. Returns
 * `0` for an out-of-range index or empty group, and for a step that is not a
 * wait: a non-finite one is unreadable and a negative one is no delay at all.
 */
export const stagger = (
  stepMs: number,
  index: number,
  count: number,
  from: StaggerFrom = "start",
): number => {
  if (count <= 0 || index < 0 || index >= count) return 0;
  const distance =
    from === "start"
      ? index
      : from === "end"
        ? count - 1 - index
        : Math.abs(index - (count - 1) / 2);
  return (Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0) * distance;
};

/** Per-step sample state. */
export type SequenceStepState = "pending" | "active" | "completed";

/** A sampled keyed step of a sequence. */
export interface SequenceStepSample<K> {
  readonly key: K;
  readonly state: SequenceStepState;
  /** Eased progress `0..1`. */
  readonly value: number;
}

interface Step<K> {
  readonly key: K;
  readonly startMs: number;
  readonly durationMs: number;
  readonly easing: Easing;
}

/**
 * A deterministic keyed sequence of tween steps. Steps are positioned in
 * absolute elapsed time and sampled by a single `elapsedMs`; the caller owns
 * the clock, exactly like the hooks own `performance.now()`.
 */
export class Sequence<K> {
  private readonly steps: Step<K>[] = [];

  /**
   * Appends a step at an absolute start time.
   *
   * A start or duration that cannot be read is repaired to `0`: a `NaN` start
   * used to leave the step permanently active at `NaN` and a `NaN` duration made
   * `duration()`/`complete()` `NaN`, so a driver loop never stopped.
   */
  at(
    key: K,
    startMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    this.steps.push({
      key,
      startMs: finiteOr(startMs, 0),
      durationMs: finiteOr(durationMs, 0),
      easing,
    });
    return this;
  }

  /** Appends a step after the current end time. */
  append(key: K, durationMs: number, easing: Easing = linear): this {
    return this.at(key, this.duration(), durationMs, easing);
  }

  /** Inserts `keys` as steps with a fixed stagger from `startMs`. */
  stagger(
    keys: readonly K[],
    startMs: number,
    stepMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    keys.forEach((key, index) => {
      this.at(key, startMs + stepMs * index, durationMs, easing);
    });
    return this;
  }

  /** The sequence end time. */
  duration(): number {
    return this.steps.reduce(
      (max, step) => Math.max(max, step.startMs + step.durationMs),
      0,
    );
  }

  /** Samples every step at sequence elapsed time. A `NaN` time reads as `0`. */
  sample(elapsedMs: number): readonly SequenceStepSample<K>[] {
    const elapsed = Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0);
    return this.steps.map((step) => {
      if (elapsed < step.startMs)
        return { key: step.key, state: "pending", value: 0 };
      const local = elapsed - step.startMs;
      if (step.durationMs <= 0 || local >= step.durationMs) {
        return { key: step.key, state: "completed", value: 1 };
      }
      return {
        key: step.key,
        state: "active",
        value: step.easing(local / step.durationMs),
      };
    });
  }

  /** Whether every step has completed at sequence elapsed time. */
  complete(elapsedMs: number): boolean {
    return (Number.isNaN(elapsedMs) ? 0 : elapsedMs) >= this.duration();
  }
}
