/**
 * Keyframes with normalized offsets, a stagger helper, and a small keyed
 * sequence driver.
 *
 * The keyframe sampling follows `gpui-ce-motion`'s `Animation` segment model
 * (the upper keyframe's easing shapes the segment ending there); the sequence
 * driver follows open-gpui `crates/motion/src/sequence.rs` (Apache-2.0).
 */

import { linear, type Easing } from "./easing.js";

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

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

/**
 * Samples sorted keyframes at unit progress, interpolating between the
 * surrounding keyframes and applying the upper keyframe's easing. Frames must
 * be sorted ascending by `at`.
 */
export const sampleKeyframes = (
  frames: readonly Keyframe[],
  progress: number,
): number => {
  if (frames.length === 0) return 0;
  const t = clamp01(progress);
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (t <= first.at) return first.value;
  if (t >= last.at) return last.value;

  let upper = 1;
  while (upper < frames.length && (frames[upper]?.at ?? 1) < t) upper += 1;
  const hi = frames[upper];
  const lo = frames[upper - 1];
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
 * `0` for an out-of-range index or empty group.
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
  return stepMs * distance;
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

  /** Appends a step at an absolute start time. */
  at(
    key: K,
    startMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    this.steps.push({ key, startMs, durationMs, easing });
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

  /** Samples every step at sequence elapsed time. */
  sample(elapsedMs: number): readonly SequenceStepSample<K>[] {
    return this.steps.map((step) => {
      const t = Math.max(elapsedMs, 0);
      if (t < step.startMs)
        return { key: step.key, state: "pending", value: 0 };
      const local = t - step.startMs;
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
    return elapsedMs >= this.duration();
  }
}
