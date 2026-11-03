/**
 * Chart animation: the values between two data sets, over a clock.
 *
 * A chart is a picture of numbers, so a data change is drawn by repainting the
 * marks at interpolated values rather than by a renderer transform (GPUix
 * 0.11 has neither `transform` nor a chart host). The interpolation is pure, so
 * the frame a reader sees can be asserted; the hook is the clock that advances
 * it, and the motion preference switches it off for a reader who asked for less.
 *
 * The default is **off**: a chart is often a readout, and a mount that starts at
 * zero and grows is a choice the caller makes with `animate`.
 */

import { useMotionPreference } from "@gpuixui/motion/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import type { ChartSeries } from "./logic.js";

/** The interval a running chart paints at: just under a 60 Hz frame. */
export const ANIMATION_FRAME_MS = 16;

/** The duration a chart takes when the caller turns animation on. */
export const DEFAULT_ANIMATION_DURATION = 320;

/** A tween's progress, eased out so the last frames settle rather than stop. */
export const easeOutCubic = (progress: number): number => {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return 1 - (1 - t) ** 3;
};

/** One number between `from` and `to`; progress outside 0–1 clamps. */
export const between = (from: number, to: number, progress: number): number => {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const start = Number.isFinite(from) ? from : 0;
  const end = Number.isFinite(to) ? to : 0;
  return start + (end - start) * t;
};

/**
 * One data set blended toward another.
 *
 * A series is matched by its key, so a series the new set drops is not painted
 * and one it adds grows from zero rather than jumping in; values past either
 * list's length read as zero. Identity — key, label, colour — comes from the
 * **target**, so the legend and the accessible name settle immediately while
 * only the numbers travel.
 */
export const interpolateSeries = (
  from: ReadonlyArray<ChartSeries>,
  to: ReadonlyArray<ChartSeries>,
  progress: number,
): ReadonlyArray<ChartSeries> => {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Arr.map(to, (target) => {
    const before = Option.match(
      Arr.findFirst(from, (one) => one.key === target.key),
      {
        onNone: () => [] as ReadonlyArray<number>,
        onSome: (one) => one.values,
      },
    );
    return {
      ...target,
      values: Arr.map(target.values, (value, index) =>
        between(before[index] ?? 0, value, t),
      ),
    };
  });
};

/** One list of numbers blended toward another. */
export const interpolateValues = (
  from: ReadonlyArray<number>,
  to: ReadonlyArray<number>,
  progress: number,
): ReadonlyArray<number> =>
  Arr.map(to, (value, index) => between(from[index] ?? 0, value, progress));

/** The values-only signature a data set is compared by. */
export const signatureOf = (
  values: ReadonlyArray<ReadonlyArray<number>>,
): string =>
  Arr.join(
    Arr.map(values, (one) => Arr.join(Arr.map(one, String), ",")),
    "|",
  );

/**
 * The value a tween shows: the target at rest, the frames between while it runs.
 *
 * A data set changing is a new `signature`; the frame on screen becomes the
 * `from` for the next run, so a change halfway through a tween continues from
 * where the reader was rather than snapping back.
 */
const useTween = <A>(
  value: A,
  signature: string,
  blend: (from: A, to: A, progress: number) => A,
  animate: boolean,
  duration: number,
  reduced: boolean,
): A => {
  const durationMs = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const running = animate && !reduced && durationMs > 0;
  const [painted, setPainted] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (!running) {
      from.current = value;
      setPainted(value);
      return;
    }
    const start = performance.now();
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      setPainted(blend(from.current, value, easeOutCubic(t)));
      if (t < 1) {
        handle = setTimeout(tick, ANIMATION_FRAME_MS);
      } else {
        from.current = value;
      }
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
    // `signature` is the data set's identity; the arrays are rebuilt every
    // render, so depending on them would restart the tween forever.
  }, [signature, running, durationMs]);
  return running ? painted : value;
};

/** The values a chart paints, tweened from the set it last showed. */
export const useAnimatedValues = (
  values: ReadonlyArray<ReadonlyArray<number>>,
  animate: boolean,
  duration: number,
): ReadonlyArray<ReadonlyArray<number>> => {
  const reduced = useMotionPreference() === "reduced";
  return useTween(
    values,
    signatureOf(values),
    interpolateValues2,
    animate,
    duration,
    reduced,
  );
};

/** Two lists blended, for the values hook. */
const interpolateValues2 = (
  from: ReadonlyArray<ReadonlyArray<number>>,
  to: ReadonlyArray<ReadonlyArray<number>>,
  progress: number,
): ReadonlyArray<ReadonlyArray<number>> =>
  Arr.map(to, (one, index) =>
    interpolateValues(from[index] ?? [], one, progress),
  );

/** The series a chart paints, tweened from the set it last showed. */
export const useAnimatedSeries = (
  series: ReadonlyArray<ChartSeries>,
  animate: boolean,
  duration: number,
): ReadonlyArray<ChartSeries> => {
  const reduced = useMotionPreference() === "reduced";
  return useTween(
    series,
    signatureOf(Arr.map(series, (one) => one.values)),
    interpolateSeries,
    animate,
    duration,
    reduced,
  );
};
