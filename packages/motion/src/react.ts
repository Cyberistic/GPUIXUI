/**
 * React hooks that drive GPUix `motion.div` numeric targets.
 *
 * Each hook returns a scalar `{ value, velocity, complete }` the caller maps
 * onto a GPUix `MotionStyle` field (`width` / `height` / `top` / `right` /
 * `bottom` / `left` / `opacity` / `borderRadius`). GPUix 0.10 has no
 * `transform`, so scale/rotate/translate have no style key yet — the hook still
 * exposes the computed `value`, which becomes usable once the runtime patch
 * (plan 525) lands. Pass `options.reducedMotion` from your platform's
 * reduced-motion preference; it completes immediately at the target.
 */

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TWEEN_MS,
  MotionValue,
  easeOut,
  layoutSpring,
  springTransition,
  tween,
  type Easing,
  type Inertia,
  type MotionFrame,
  type SpringPhysics,
  type Transition,
} from "./index.js";

/** The sampled scalar state a hook publishes. */
export interface MotionState {
  readonly value: number;
  readonly velocity: number;
  readonly complete: boolean;
}

/** Hook options. */
export interface MotionOptions {
  readonly reducedMotion?: boolean;
  /**
   * The value the **first** run starts from. Default: the target, so a hook
   * mounted at rest paints without an entry run. Read once at mount; a later
   * change is ignored because the current presentation is the truth after it.
   */
  readonly initial?: number;
}

/** Tween parameters accepted by {@link useTransition}. */
export interface TweenSpec {
  readonly durationMs?: number;
  readonly easing?: Easing;
}

const FRAME_MS = 16;

const initialFrame = (value: number): MotionFrame => ({
  value,
  velocity: 0,
  active: false,
  complete: false,
});

/**
 * The retained-motion hook: animates `target` with `transition` on a monotonic
 * `performance.now()` clock. `transition` must be a stable reference (pass a
 * memoized value or one of {@link useSpring}/{@link useTransition}).
 */
export const useMotion = (
  target: number,
  transition: Transition,
  options: MotionOptions = {},
): MotionState => {
  const [start] = useState(() => options.initial ?? target);
  const [motion] = useState(() => new MotionValue(start));
  const [origin] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => initialFrame(start));

  useEffect(() => {
    motion.animate(target, transition);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(
        performance.now() - origin,
        options.reducedMotion === true,
      );
      setFrame(next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, target, transition, origin, options.reducedMotion]);

  return {
    value: frame.value,
    velocity: frame.velocity,
    complete: frame.complete,
  };
};

/**
 * Animates `target` with a spring. Retargeting keeps velocity, so a target that
 * moves mid-flight continues smoothly instead of restarting.
 */
export const useSpring = (
  target: number,
  physics: SpringPhysics = layoutSpring,
  options: MotionOptions = {},
): MotionState => {
  const transition = useMemo(() => springTransition(physics), [physics]);
  return useMotion(target, transition, options);
};

/**
 * Animates `target` with a duration/easing tween. Retargeting keeps position
 * and recomputes velocity.
 */
export const useTransition = (
  target: number,
  spec: TweenSpec = {},
  options: MotionOptions = {},
): MotionState => {
  const durationMs = spec.durationMs ?? DEFAULT_TWEEN_MS;
  const easing = spec.easing ?? easeOut;
  const transition = useMemo(
    () => tween(durationMs, easing),
    [durationMs, easing],
  );
  return useMotion(target, transition, options);
};

/**
 * Coasts with an initial velocity under inertial decay. `value` accumulates
 * from zero across releases; when `velocity` becomes `0` the value holds.
 * `inertia` must be a stable reference.
 */
export const useInertia = (
  velocity: number,
  inertia: Inertia,
  options: MotionOptions = {},
): MotionState => {
  const [motion] = useState(() => new MotionValue(0));
  const [start] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => initialFrame(0));

  useEffect(() => {
    motion.coast(inertia, velocity);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(
        performance.now() - start,
        options.reducedMotion === true,
      );
      setFrame(next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, velocity, inertia, start, options.reducedMotion]);

  return {
    value: frame.value,
    velocity: frame.velocity,
    complete: frame.complete,
  };
};
