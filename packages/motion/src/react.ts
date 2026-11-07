import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  retainCoast,
  retainTransition,
  sameCoast,
  sameFrame,
  tweenSpecOf,
  type CoastDeclaration,
  type TweenSpec,
} from "./hook-read.js";
import { project, type Inertia } from "./inertia.js";
import {
  MotionValue,
  springTransition,
  tween,
  type MotionFrame,
  type Transition,
} from "./motion.js";
import { useMotionPreference } from "./provider.js";
import { layoutSpring, type SpringPhysics } from "./spring.js";
import { reducedMotionOf } from "./timing.js";

export {
  MotionProvider,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
  type MotionProviderProps,
  type SurfacePresence,
} from "./react/presence.js";

export interface MotionState {
  readonly value: number;
  readonly velocity: number;
  readonly complete: boolean;
}

const restingFrame = (value: number, complete: boolean): MotionState => ({
  value,
  velocity: 0,
  complete,
});

export interface MotionOptions {
  readonly reducedMotion?: boolean;

  readonly initial?: number;
}

export type { TweenSpec } from "./hook-read.js";

const FRAME_MS = 16;

const initialFrame = (value: number): MotionFrame => ({
  value,
  velocity: 0,
  active: false,
  complete: false,
});

const optionsOf = (options: MotionOptions | null | undefined): MotionOptions =>
  options ?? {};

const useReducedMotion = (options: MotionOptions): boolean =>
  reducedMotionOf(options.reducedMotion, useMotionPreference());

const publish = (
  setFrame: Dispatch<SetStateAction<MotionFrame>>,
  frame: MotionFrame,
): void =>
  setFrame((previous) => (sameFrame(previous, frame) ? previous : frame));

const settleBefore = (
  motion: MotionValue,
  origin: number,
  reducedMotion: boolean,
): MotionFrame => motion.sample(performance.now() - origin, reducedMotion);

const startValue = (target: number, initial: number | undefined): number => {
  if (initial !== undefined && Number.isFinite(initial)) return initial;
  return Number.isFinite(target) ? target : 0;
};

const firstValue = (
  target: number,
  initial: number | undefined,
  reducedMotion: boolean,
): number => startValue(target, reducedMotion ? undefined : initial);

const skipsJourney = (
  target: number,
  initial: number | undefined,
  reducedMotion: boolean,
): boolean =>
  reducedMotion &&
  Number.isFinite(target) &&
  initial !== undefined &&
  Number.isFinite(initial) &&
  initial !== startValue(target, undefined);

const restingValue = (named: number, current: number): number =>
  Number.isFinite(named) ? named : current;

const coastRest = (declaration: CoastDeclaration, position: number): number =>
  Number.isFinite(declaration.velocity)
    ? project(declaration.inertia, position, declaration.velocity)
    : position;

export const useMotion = (
  target: number,
  transition: Transition,
  options: MotionOptions | null = {},
): MotionState => {
  const settings = optionsOf(options);
  const reducedMotion = useReducedMotion(settings);
  const [start] = useState(() =>
    firstValue(target, settings.initial, reducedMotion),
  );
  const [motion] = useState(() => new MotionValue(start));
  const [origin] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => {
    const first = initialFrame(start);
    return skipsJourney(target, settings.initial, reducedMotion)
      ? { ...first, complete: true }
      : first;
  });

  const skipped = useRef(skipsJourney(target, settings.initial, reducedMotion));

  const declared = useRef(transition);
  declared.current = retainTransition(declared.current, transition);
  const running = declared.current;

  const resting = restingValue(target, motion.current);

  useEffect(() => {
    if (skipped.current) {
      skipped.current = false;
      return;
    }
    if (reducedMotion) {
      if (resting === motion.current) return;
      motion.set(resting);
      publish(setFrame, {
        value: resting,
        velocity: 0,
        active: false,
        complete: true,
      });
      return;
    }
    publish(setFrame, settleBefore(motion, origin, reducedMotion));
    motion.animate(target, running);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - origin, reducedMotion);
      publish(setFrame, next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, target, resting, running, origin, reducedMotion]);

  return reducedMotion
    ? restingFrame(
        resting,

        frame.complete || resting !== motion.current,
      )
    : {
        value: frame.value,
        velocity: frame.velocity,
        complete: frame.complete,
      };
};

export const useSpring = (
  target: number,
  physics: SpringPhysics = layoutSpring,
  options: MotionOptions | null = {},
): MotionState => {
  const transition = useMemo(() => springTransition(physics), [physics]);
  return useMotion(target, transition, options);
};

export const useTransition = (
  target: number,
  spec: TweenSpec | null = {},
  options: MotionOptions | null = {},
): MotionState => {
  const { durationMs, easing } = tweenSpecOf(spec);
  const transition = useMemo(
    () => tween(durationMs, easing),
    [durationMs, easing],
  );
  return useMotion(target, transition, options);
};

export const useInertia = (
  velocity: number,
  inertia: Inertia,
  options: MotionOptions | null = {},
): MotionState => {
  const settings = optionsOf(options);
  const reducedMotion = useReducedMotion(settings);
  const [offset] = useState(() => startValue(0, settings.initial));
  const [rest] = useState(() => coastRest({ inertia, velocity }, offset));
  const [motion] = useState(() => new MotionValue(offset));
  const [start] = useState(() => performance.now());
  const [frame, setFrame] = useState<MotionFrame>(() => {
    if (reducedMotion && rest !== offset) {
      return { ...initialFrame(rest), complete: true };
    }
    return initialFrame(reducedMotion ? rest : offset);
  });

  const skippingStart = useRef(reducedMotion);

  const retired = useRef<CoastDeclaration | undefined>(undefined);

  const declared = useRef<CoastDeclaration>({ inertia, velocity });
  declared.current = retainCoast(declared.current, { inertia, velocity });
  const running = declared.current;

  const ended =
    retired.current !== undefined && sameCoast(retired.current, running);

  useEffect(() => {
    if (reducedMotion) {
      retired.current = running;

      const destination = coastRest(running, motion.current);

      if (ended) return;
      if (destination === motion.current) return;
      motion.set(destination);
      skippingStart.current = false;
      publish(setFrame, {
        value: destination,
        velocity: 0,
        active: false,
        complete: true,
      });
      return;
    }
    if (ended) {
      publish(setFrame, settleBefore(motion, start, false));
      return;
    }
    retired.current = undefined;
    const sampled = settleBefore(motion, start, reducedMotion);
    if (skippingStart.current && sampled.value === offset) {
    } else {
      skippingStart.current = false;
      publish(setFrame, sampled);
    }
    motion.coast(running.inertia, running.velocity);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - start, reducedMotion);
      publish(setFrame, next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, running, start, offset, reducedMotion]);

  const resting = ended ? motion.current : coastRest(running, motion.current);
  return reducedMotion
    ? restingFrame(
        resting,

        frame.complete || resting !== motion.current,
      )
    : {
        value: frame.value,
        velocity: frame.velocity,
        complete: frame.complete,
      };
};
