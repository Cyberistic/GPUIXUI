import { useMotionPreference } from "@gpuixui/motion/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import type { ChartSeries } from "./logic.js";

export const ANIMATION_FRAME_MS = 16;

export const DEFAULT_ANIMATION_DURATION = 1500;

export const easeOutCubic = (progress: number): number => {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return 1 - (1 - t) ** 3;
};

export const between = (from: number, to: number, progress: number): number => {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const start = Number.isFinite(from) ? from : 0;
  const end = Number.isFinite(to) ? to : 0;
  return start + (end - start) * t;
};

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

export const interpolateValues = (
  from: ReadonlyArray<number>,
  to: ReadonlyArray<number>,
  progress: number,
): ReadonlyArray<number> =>
  Arr.map(to, (value, index) => between(from[index] ?? 0, value, progress));

export const scaleValue = (value: number, progress: number): number =>
  !Number.isFinite(value) || progress >= 1
    ? value
    : value === 0
      ? 0
      : between(0, value, progress);

export const scaleValues = (
  values: ReadonlyArray<number>,
  progress: number,
): ReadonlyArray<number> =>
  Arr.map(values, (value) => scaleValue(value, progress));

export const scaleSeries = (
  series: ReadonlyArray<ChartSeries>,
  progress: number,
): ReadonlyArray<ChartSeries> =>
  Arr.map(series, (one) => ({
    ...one,
    values: scaleValues(one.values, progress),
  }));

export const signatureOf = (
  values: ReadonlyArray<ReadonlyArray<number>>,
): string =>
  Arr.join(
    Arr.map(values, (one) => Arr.join(Arr.map(one, String), ",")),
    "|",
  );

const now = (): number => performance.now();

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
    const start = now();
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const t = Math.min(1, (now() - start) / durationMs);
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
  }, [signature, running, durationMs]);
  return running ? painted : value;
};

export const useMountReveal = (animate: boolean, duration: number): number => {
  const reduced = useMotionPreference() === "reduced";
  const durationMs = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const running = animate && !reduced && durationMs > 0;
  const [progress, setProgress] = useState(running ? 0 : 1);
  useEffect(() => {
    if (!running) {
      setProgress(1);
      return;
    }
    const start = now();
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const t = Math.min(1, (now() - start) / durationMs);
      setProgress(easeOutCubic(t));
      if (t < 1) {
        handle = setTimeout(tick, ANIMATION_FRAME_MS);
      }
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [running, durationMs]);
  return running ? progress : 1;
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
