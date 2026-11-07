import { linear, type Easing } from "./easing.js";
import { clamp01, eased, mix } from "./progress.js";

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const durationOf = (durationMs: number): number =>
  Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;

const endOf = (startMs: number, durationMs: number): number => {
  const duration = durationOf(durationMs);
  const end = startMs + duration;
  return Number.isFinite(end) && end > startMs ? duration : 0;
};

const placedAt = (startMs: number, waitMs: number): number => {
  const placed = startMs + waitMs;
  return Number.isFinite(placed) ? placed : startMs;
};

export interface Keyframe {
  readonly at: number;
  readonly value: number;
  readonly easing?: Easing;
}

export const keyframe = (
  at: number,
  value: number,
  easing?: Easing,
): Keyframe => ({ at, value, easing });

const isFrame = (frame: Keyframe | null | undefined): frame is Keyframe =>
  typeof frame === "object" &&
  frame !== null &&
  Number.isFinite(frame.at) &&
  Number.isFinite(frame.value);

const stopsOf = (
  frames: readonly (Keyframe | null | undefined)[] | null | undefined,
): ReadonlyArray<Keyframe> =>
  Array.isArray(frames) ? frames.filter(isFrame) : [];

const firstStop = (stops: ReadonlyArray<Keyframe>): Keyframe =>
  stops.reduce((first, frame) => (frame.at < first.at ? frame : first));

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

export const sampleKeyframes = (
  frames: readonly (Keyframe | null | undefined)[] | null | undefined,
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

export type StaggerFrom = "start" | "end" | "center";

const staggerFromOf = (from: StaggerFrom): StaggerFrom =>
  from === "start" || from === "end" || from === "center" ? from : "start";

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
  const step = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0;
  const delay = step * distance;
  return Number.isFinite(delay) ? delay : 0;
};

export const stagger = (
  stepMs: number,
  index: number,
  count: number,
  from: StaggerFrom = "start",
): number => staggerDelay(stepMs, index, count, from);

export type SequenceStepState = "pending" | "active" | "completed";

export interface SequenceStepSample<K> {
  readonly key: K;
  readonly state: SequenceStepState;

  readonly value: number;
}

interface Step<K> {
  readonly key: K;
  readonly startMs: number;
  readonly durationMs: number;
  readonly easing: Easing;
}

const clockOf = (elapsedMs: number): number =>
  Number.isNaN(elapsedMs) ? 0 : Math.max(elapsedMs, 0);

const keysOf = <K>(keys: readonly K[] | null | undefined): ReadonlyArray<K> =>
  Array.isArray(keys) ? keys : [];

export class Sequence<K> {
  private readonly steps: Step<K>[] = [];

  at(
    key: K,
    startMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    const start = finiteOr(startMs, 0);
    this.steps.push({
      key,
      startMs: start,
      durationMs: endOf(start, durationMs),
      easing,
    });
    return this;
  }

  append(key: K, durationMs: number, easing: Easing = linear): this {
    return this.at(key, this.duration(), durationMs, easing);
  }

  stagger(
    keys: readonly K[] | null | undefined,
    startMs: number,
    stepMs: number,
    durationMs: number,
    easing: Easing = linear,
  ): this {
    const start = finiteOr(startMs, 0);
    const list = keysOf(keys);
    const count = list.length;
    list.forEach((key, index) => {
      this.at(
        key,
        placedAt(start, staggerDelay(stepMs, index, count, "start")),
        durationMs,
        easing,
      );
    });
    return this;
  }

  duration(): number {
    return this.steps.reduce(
      (max, step) => Math.max(max, step.startMs + step.durationMs),
      0,
    );
  }

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

  complete(elapsedMs: number): boolean {
    return clockOf(elapsedMs) >= this.duration();
  }
}
