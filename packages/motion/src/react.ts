/**
 * React hooks that drive GPUix `motion.div` numeric targets.
 *
 * Each hook returns a scalar `{ value, velocity, complete }` the caller maps
 * onto a GPUix `MotionStyle` field (`width` / `height` / `top` / `right` /
 * `bottom` / `left` / `opacity` / `borderRadius`). GPUix 0.11 has no
 * `transform`, so scale/rotate/translate have no style key yet — the hook still
 * exposes the computed `value`, which becomes usable once the runtime patch
 * (plan 525) lands. Pass `options.reducedMotion` from your platform's
 * reduced-motion preference; it completes immediately at the target.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  DEFAULT_TWEEN_MS,
  MotionValue,
  easeOut,
  layoutSpring,
  project,
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
  /**
   * The reader's reduced-motion preference. Default `false`.
   *
   * A reduced hook paints its resting frame in the **first** render — the
   * target, or a coast's projected rest — and ignores `initial`, because that
   * value is the start of a journey the preference removed. A mount that
   * skipped such a run reports it as complete.
   */
  readonly reducedMotion?: boolean;
  /**
   * The value the **first** run starts from. Default: the target, so a hook
   * mounted at rest paints without an entry run. Read once at mount; a later
   * change is ignored because the current presentation is the truth after it.
   *
   * A value it cannot read is no value: the start is the target, so the first
   * published frame is a number the runtime can paint.
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

const reduced = (options: MotionOptions): boolean =>
  options.reducedMotion === true;

/**
 * Publish a sample taken before a retarget, so the frame on screen moves with
 * it. The sample is only published when it changed the painted value.
 */
const publish = (
  setFrame: Dispatch<SetStateAction<MotionFrame>>,
  frame: MotionFrame,
): void =>
  setFrame((previous) =>
    previous.value === frame.value && previous.velocity === frame.velocity
      ? previous
      : frame,
  );

/**
 * Close the gap since the last sample before retargeting.
 *
 * A {@link MotionValue} measures a run from its previous sample, and a hook
 * stops sampling once its run is at rest. Handing the retained value a new
 * target without a sample would count the idle pause as elapsed motion, so a
 * value changed after a wait would land on the new target in one frame. One
 * sample at the moment of the retarget makes the pause elapsed time that moved
 * nothing.
 */
const settleBefore = (
  motion: MotionValue,
  origin: number,
  reducedMotion: boolean,
): MotionFrame => motion.sample(performance.now() - origin, reducedMotion);

/**
 * The value a hook's first run starts from.
 *
 * The caller supplies the target and, optionally, the value the first run
 * starts from. Both are numbers a caller computed — a measured height, a count
 * that has not arrived — so one it cannot read is replaced here: an unreadable
 * `initial` is **no initial**, so the start is the target (the documented
 * default, so a hook mounted at rest paints without an entry run), and an
 * unreadable target is **no target**, so the start is `0`.
 *
 * The retained `MotionValue` repaired the same value to `0` on its own, so the
 * hook and the value it drives could disagree about the first frame: the hook
 * published the caller's `NaN` and the runtime drew it as nothing.
 */
const startValue = (target: number, initial: number | undefined): number => {
  if (initial !== undefined && Number.isFinite(initial)) return initial;
  return Number.isFinite(target) ? target : 0;
};

/**
 * The value a hook paints in its first render.
 *
 * The reduced preference removes the journey, not only its duration, so a mount
 * under it paints the resting frame even when the caller named an `initial`:
 * that value is the start of a run the reader asked not to see. The retained
 * value starts at the same frame, so the effect's first sample cannot repaint
 * the start for a commit.
 */
const firstValue = (
  target: number,
  initial: number | undefined,
  reducedMotion: boolean,
): number => startValue(target, reducedMotion ? undefined : initial);

/**
 * Whether a reduced mount skips a journey the caller named.
 *
 * The skipped run still completes — the preference removes the journey, not its
 * outcome — so the first frame carries the completion edge a run would.
 */
const skipsJourney = (
  target: number,
  initial: number | undefined,
  reducedMotion: boolean,
): boolean =>
  reducedMotion &&
  initial !== undefined &&
  Number.isFinite(initial) &&
  initial !== startValue(target, undefined);

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
  const reducedMotion = reduced(options);
  const [start] = useState(() =>
    firstValue(target, options.initial, reducedMotion),
  );
  const [motion] = useState(() => new MotionValue(start));
  const [origin] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => {
    const first = initialFrame(start);
    return skipsJourney(target, options.initial, reducedMotion)
      ? { ...first, complete: true }
      : first;
  });
  /** The mount already paints the resting frame, so there is no run to start. */
  const skipped = useRef(skipsJourney(target, options.initial, reducedMotion));

  useEffect(() => {
    if (skipped.current) {
      skipped.current = false;
      return;
    }
    publish(setFrame, settleBefore(motion, origin, reduced(options)));
    motion.animate(target, transition);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - origin, reduced(options));
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
 * Coasts with an initial velocity under inertial decay. The value accumulates
 * from the start of the run across releases; when `velocity` becomes `0` the
 * value holds. `inertia` must be a stable reference.
 *
 * `options.initial` is the value the first run accumulates from — the offset a
 * gesture released at — and it obeys the family's rule: one it cannot read is no
 * initial, so the run starts at `0`. Until this hook read it, the option was
 * accepted and silently dropped, so a caller that handed a drag's offset got a
 * value starting at zero.
 */
export const useInertia = (
  velocity: number,
  inertia: Inertia,
  options: MotionOptions = {},
): MotionState => {
  const reducedMotion = reduced(options);
  const [offset] = useState(() => startValue(0, options.initial));
  const [rest] = useState(() => project(inertia, offset, velocity));
  const [motion] = useState(() => new MotionValue(offset));
  const [start] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => {
    if (reducedMotion && rest !== offset) {
      return { ...initialFrame(rest), complete: true };
    }
    return initialFrame(reducedMotion ? rest : offset);
  });
  /** The first paint shows the projected rest; the release point is skipped. */
  const skippingStart = useRef(reducedMotion);

  useEffect(() => {
    const sampled = settleBefore(motion, start, reduced(options));
    if (skippingStart.current && sampled.value === offset) {
      // The mount painted the rest the preference names, so the release offset
      // is not a frame the reader should see for a commit.
    } else {
      skippingStart.current = false;
      publish(setFrame, sampled);
    }
    motion.coast(inertia, velocity);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - start, reduced(options));
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
