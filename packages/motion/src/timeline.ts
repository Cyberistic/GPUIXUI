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
 * whose timing cannot be read is placed at the start with no duration, a step
 * that cannot be read is no wait, a stagger direction the package does not name
 * is the house start, and a curve that cannot read the frame it is handed — or
 * cannot be called at all — falls back to the linear progress (`eased` in
 * `progress.ts`). A `NaN` anywhere used to paint a frame the runtime draws as
 * nothing and leave `Sequence.complete` false forever. The sequence's own end
 * follows the same rule: a step whose duration it cannot run ends at its start,
 * so the end is never before a step the sequence still has to run.
 */

import { linear, type Easing } from "./easing.js";
import { clamp01, eased, mix } from "./progress.js";

/** A number a formula can read, or the fallback it stands for. */
const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/**
 * A duration a step can run.
 *
 * A duration the step cannot run — one that is not a number, or one that is
 * not positive — is no duration at all. The step's own sample already read it
 * that way (a step with no duration is done at its start), so the sequence's
 * end time has to agree: a negative duration used to be added to the step's
 * start, landing the sequence's end *before* a step it still had to run.
 */
const durationOf = (durationMs: number): number =>
  Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;

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

/** The stop the set starts at: the least offset, the first declared at it. */
const firstStop = (stops: ReadonlyArray<Keyframe>): Keyframe =>
  stops.reduce((first, frame) => (frame.at < first.at ? frame : first));

/**
 * The stop in effect at `progress`: the last frame declared at the greatest
 * offset at or below it.
 *
 * The later declaration wins among frames sharing an offset because that is how
 * a keyframe format reads a repeated stop — an instant jump at it — and the
 * sample below lands on this frame's value exactly at the offset.
 */
const lowerStop = (
  stops: ReadonlyArray<Keyframe>,
  progress: number,
): Keyframe | undefined =>
  stops.reduce<Keyframe | undefined>(
    (lower, frame) =>
      frame.at > progress
        ? lower
        : lower === undefined || frame.at >= lower.at
          ? frame
          : lower,
    undefined,
  );

/** The stop the segment ends at: the first frame declared above `progress`. */
const upperStop = (
  stops: ReadonlyArray<Keyframe>,
  progress: number,
): Keyframe | undefined =>
  stops.reduce<Keyframe | undefined>(
    (upper, frame) =>
      frame.at <= progress || (upper !== undefined && frame.at >= upper.at)
        ? upper
        : frame,
    undefined,
  );

/**
 * Samples a set of keyframes at unit progress, interpolating between the stops
 * around it and applying the upper stop's easing.
 *
 * The frames are read as a **set of stops**, not as the order they were
 * declared: a caller who builds them from a map or a decoded config hands them
 * over in whatever order the source iterates, and reading the first and last
 * entries as the ends made one frame declared first answer for every progress
 * below its offset — a step function instead of the journey the frames describe.
 * Two frames at one offset are an instant jump, the way a keyframe format reads
 * them: from that offset on the value declared last at it is in effect.
 *
 * A progress that is not a number reads as `0`, a frame whose offset or value
 * cannot be read is dropped rather than becoming the segment's endpoint — an
 * unreadable stop would make every value between it and its neighbour `NaN`,
 * which the runtime paints as nothing — and a curve that cannot read the segment
 * falls back to its linear progress.
 */
export const sampleKeyframes = (
  frames: readonly Keyframe[],
  progress: number,
): number => {
  const stops = stopsOf(frames);
  if (stops.length === 0) return 0;
  const t = clamp01(progress);
  const lo = lowerStop(stops, t);
  if (lo === undefined) return firstStop(stops).value;
  const hi = upperStop(stops, t);
  if (hi === undefined) return lo.value;

  const local = (t - lo.at) / (hi.at - lo.at);
  const easing = hi.easing ?? linear;
  return mix(lo.value, hi.value, eased(easing, local));
};

/** Where a stagger group starts. */
export type StaggerFrom = "start" | "end" | "center";

/**
 * The direction a group starts from.
 *
 * `from` may be a persisted choice a caller reads back, so a name the package
 * does not carry takes the house default (`start`). The distance arithmetic used
 * to end in a `center` arm, so an unreadable direction silently staggered a
 * group from its middle.
 */
const staggerFromOf = (from: StaggerFrom): StaggerFrom =>
  from === "start" || from === "end" || from === "center" ? from : "start";

/**
 * The delay (ms) the `index`-th of `count` children waits under `from`.
 *
 * A step that is not a wait is no wait: a non-finite one is unreadable and a
 * negative one is no delay at all. The same holds for the `index` and `count` a
 * caller passes — a position or a length it could not compute is no wait rather
 * than a `NaN`/infinite delay reached the runtime. This is the one rule both
 * stagger entry points share — the standalone {@link stagger} and the
 * {@link Sequence}'s own group — so a caller cannot get two answers for the same
 * input.
 */
const staggerDelay = (
  stepMs: number,
  index: number,
  count: number,
  from: StaggerFrom,
): number => {
  if (!Number.isFinite(index) || !Number.isFinite(count)) return 0;
  if (count <= 0 || index < 0 || index >= count) return 0;
  const direction = staggerFromOf(from);
  const distance =
    direction === "start"
      ? index
      : direction === "end"
        ? count - 1 - index
        : Math.abs(index - (count - 1) / 2);
  return (Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0) * distance;
};

/**
 * The delay (ms) for the `index`-th of `count` children under `from`. Returns
 * `0` for an out-of-range index or empty group, and for a step that is not a
 * wait: a non-finite one is unreadable and a negative one is no delay at all. An
 * `index` or `count` that cannot be read is no wait too, so a caller's failed
 * measurement never reaches the runtime as a `NaN` or infinite delay. A `from`
 * the package does not name is the house default (`"start"`), not the centre.
 */
export const stagger = (
  stepMs: number,
  index: number,
  count: number,
  from: StaggerFrom = "start",
): number => staggerDelay(stepMs, index, count, from);

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
 * The elapsed time a sequence reads from a clock.
 *
 * A clock before the sequence starts (`NaN`, a negative number, `-Infinity`) is
 * the start of the run, which is how every other sampler reads one. `sample` and
 * `complete` share this read, so the two entry points cannot disagree about the
 * same clock: a sequence with nothing left to run used to answer `complete(-5)`
 * false while `sample(-5)` painted every step completed.
 */
const clockOf = (elapsedMs: number): number =>
  Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0);

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
   * A start that cannot be read is repaired to `0`: a `NaN` start used to leave
   * the step permanently active at `NaN` and a `NaN` duration made
   * `duration()`/`complete()` `NaN`, so a driver loop never stopped. A duration
   * the step cannot run is no duration at all, so the sequence's end is never
   * before a step it still has to run.
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
      durationMs: durationOf(durationMs),
      easing,
    });
    return this;
  }

  /** Appends a step after the current end time. */
  append(key: K, durationMs: number, easing: Easing = linear): this {
    return this.at(key, this.duration(), durationMs, easing);
  }

  /**
   * Inserts `keys` as steps with a fixed stagger from `startMs`.
   *
   * The group is placed with the package's own stagger rule, so an unusable
   * step is no wait — every member sits at the group's start — and no member
   * starts before the sequence does. A step used to be placed at
   * `startMs + stepMs * index` directly, which put a member *before* the
   * group for a negative step (already running when the sequence began) and
   * collapsed the whole group to the start of the clock for an unreadable one.
   */
  stagger(
    keys: readonly K[],
    startMs: number,
    stepMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    const count = keys.length;
    keys.forEach((key, index) => {
      this.at(
        key,
        startMs + staggerDelay(stepMs, index, count, "start"),
        durationMs,
        easing,
      );
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

  /** Samples every step at sequence elapsed time. A clock before the sequence is its start. */
  sample(elapsedMs: number): readonly SequenceStepSample<K>[] {
    const elapsed = clockOf(elapsedMs);
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
        value: eased(step.easing, local / step.durationMs),
      };
    });
  }

  /** Whether every step has completed at sequence elapsed time. */
  complete(elapsedMs: number): boolean {
    return clockOf(elapsedMs) >= this.duration();
  }
}
