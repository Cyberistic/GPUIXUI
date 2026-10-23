/**
 * React hooks that drive GPUix `motion.div` numeric targets, and the preference
 * provider they read.
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
  retainCoast,
  retainTransition,
  sameCoast,
  sameFrame,
  type CoastDeclaration,
} from "./hook-read.js";
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

/**
 * The application's preference, published beside the hooks that read it.
 *
 * One provider for the whole library: a component package, a primitive and an
 * application surface below it share the context, so the flag is stated once
 * rather than threaded into every control.
 */
export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "./provider.js";

/** The sampled scalar state a hook publishes. */
export interface MotionState {
  readonly value: number;
  readonly velocity: number;
  readonly complete: boolean;
}

/**
 * The frame a reduced reader sees when nothing moves.
 *
 * The preference removes the journey, so the presentation is the resting value
 * from the render that names it — not the frame the removed run would have
 * started from. The retained value is settled in an effect, so a later animated
 * preference starts where the reader is, but the paint must not wait for that
 * commit: a changed target would otherwise show the previous frame first, which
 * is the one-frame flash the mount rule already forbids.
 */
const restingFrame = (value: number, complete: boolean): MotionState => ({
  value,
  velocity: 0,
  complete,
});

/** Hook options. */
export interface MotionOptions {
  /**
   * The reader's reduced-motion preference. Default `false`.
   *
   * A reduced hook paints its resting frame in the render that names it — the
   * target, or a coast's projected rest — and ignores `initial`, because that
   * value is the start of a journey the preference removed. A later target or
   * release changed while the preference is on paints (and completes) the same
   * way, rather than showing the previous frame for one commit. A later target or
   * release the render cannot read names no destination: the hook holds the
   * frame on screen, because a failed measurement is not a resting place. A
   * mount that skipped such a run reports it as complete; a mount that asked for
   * no journey does not.
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
 * it. The sample is only published when it changed the frame the caller holds —
 * including the completion edge, which is a change even when nothing moved.
 */
const publish = (
  setFrame: Dispatch<SetStateAction<MotionFrame>>,
  frame: MotionFrame,
): void =>
  setFrame((previous) => (sameFrame(previous, frame) ? previous : frame));

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
 * outcome — so the first frame carries the completion edge a run would. A target
 * the render cannot read names no destination, so there is no run to skip.
 */
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

/**
 * The frame a reduced render lands on when the caller names a value.
 *
 * A value this render cannot read is no destination: the surface holds the frame
 * it shows rather than collapsing to the first one, because a measurement that
 * failed for a commit is not a new resting place. The retained value follows the
 * same rule, so the mount (whose frame is the start it paints) reads it too.
 */
const restingValue = (named: number, current: number): number =>
  Number.isFinite(named) ? named : current;

/**
 * The frame a release names from the position the surface is on.
 *
 * A release is a new gesture from where the surface is, which is the rule the
 * retained `MotionValue.coast` follows (`from = this.value`) and the one the
 * README prints. The reduced branch used to project from the offset the hook
 * mounted at, so a reader whose coast had already rested at `140` saw the next
 * release or a release of `0` send the surface back to `0`.
 */
const coastRest = (declaration: CoastDeclaration, position: number): number =>
  Number.isFinite(declaration.velocity)
    ? project(declaration.inertia, position, declaration.velocity)
    : position;

/**
 * The retained-motion hook: animates `target` with `transition` on a monotonic
 * `performance.now()` clock.
 *
 * The declaration is read **by value**, so an equal re-declaration — the
 * `springPhysics({ … })` form builds one on every render — keeps the run and the
 * frame loop already driving it instead of re-arming them. A declaration that
 * means another run replaces it and starts from the frame on screen.
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
  /**
   * The declaration the loop is running. A render builds a fresh object for the
   * documented `springPhysics({ … })` form, so identity would re-arm the effect —
   * and its frame loop — for a run that never changed. Retention reads it by
   * value, which is the same rule the retained value applies.
   */
  const declared = useRef(transition);
  declared.current = retainTransition(declared.current, transition);
  const running = declared.current;
  /** The frame a reduced render paints: the target, or the one on screen. */
  const resting = restingValue(target, motion.current);

  useEffect(() => {
    if (skipped.current) {
      skipped.current = false;
      return;
    }
    if (reduced(options)) {
      // The render already paints the resting frame; retargeting the retained
      // value to it now means a preference that turns back on starts where the
      // reader is, and the skipped journey reports its end with that frame.
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
    publish(setFrame, settleBefore(motion, origin, reduced(options)));
    motion.animate(target, running);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - origin, reduced(options));
      publish(setFrame, next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, target, resting, running, origin, options.reducedMotion]);

  return reducedMotion
    ? restingFrame(
        resting,
        // A destination this render just reached is a journey the preference
        // removed: report its end with it, rather than one commit later. The
        // mount that asked for no journey (the value it started on) keeps
        // `complete` false.
        frame.complete || resting !== motion.current,
      )
    : {
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
 * value holds. The declaration is compared structurally, so an `inertia()`
 * built inline on every render does not restart the coast already in flight —
 * nor does it re-arm the frame loop driving it.
 *
 * `options.initial` is the value the first run accumulates from — the offset a
 * gesture released at — and it obeys the family's rule: one it cannot read is no
 * initial, so the run starts at `0`. Until this hook read it, the option was
 * accepted and silently dropped, so a caller that handed a drag's offset got a
 * value starting at zero.
 *
 * A new release is a gesture from where the surface is, not from the offset it
 * mounted at. That holds under the reduced preference too: the frame it paints
 * projects from the frame on screen, so a reader whose coast has rested is not
 * sent back to the offset by the next release (or by a release of `0`).
 */
export const useInertia = (
  velocity: number,
  inertia: Inertia,
  options: MotionOptions = {},
): MotionState => {
  const reducedMotion = reduced(options);
  const [offset] = useState(() => startValue(0, options.initial));
  const [rest] = useState(() => coastRest({ inertia, velocity }, offset));
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
  /**
   * The coast a reduced commit retired — the gesture the reader saw end.
   *
   * Retiring the retained value in that commit is not enough on its own: the
   * effect also re-runs when the preference turns back **off**, and it would
   * launch the same declaration again from the frame it ends on, replaying a
   * gesture the reader already watched finish (a 50 ms coast released at `400`
   * rested at `20` and then drifted to `40`). A declaration this ref names is
   * therefore held rather than launched, and a genuinely new release forgets it
   * so the next gesture starts from the frame on screen.
   */
  const retired = useRef<CoastDeclaration | undefined>(undefined);
  /**
   * The coast this hook is running. `inertia()` is documented as safe to build
   * inline, and identity would re-arm the effect — and its frame loop — on every
   * render, so the declaration is retained by the physics a sample reads and the
   * release velocity it was kicked with.
   */
  const declared = useRef<CoastDeclaration>({ inertia, velocity });
  declared.current = retainCoast(declared.current, { inertia, velocity });
  const running = declared.current;
  /**
   * Whether this coast is one the hook already ended under the reduced
   * preference — the gesture the reader watched finish.
   */
  const ended =
    retired.current !== undefined && sameCoast(retired.current, running);

  useEffect(() => {
    if (reduced(options)) {
      // The declaration this commit ends is retired, whether or not the frame it
      // names differs from the one on screen: the animated branch must not
      // launch it again when the preference turns back off.
      retired.current = running;
      // The render paints the projection the declaration names from the frame on
      // screen, and this commit retires the retained value there.
      const destination = coastRest(running, motion.current);
      // A coast this hook already ended is held rather than projected again: the
      // reader watched that journey finish, so another reduced commit is not a
      // new gesture to complete.
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
      // This declaration's journey ended under the reduced preference and the
      // reader watched it finish, so the preference turning off holds the frame
      // it rests on instead of releasing the same coast a second time. The
      // sample keeps the retained clock current, so a later release starts from
      // now rather than counting the pause as its own travel.
      publish(setFrame, settleBefore(motion, start, false));
      return;
    }
    retired.current = undefined;
    const sampled = settleBefore(motion, start, reduced(options));
    if (skippingStart.current && sampled.value === offset) {
      // The mount painted the rest the preference names, so the release offset
      // is not a frame the reader should see for a commit.
    } else {
      skippingStart.current = false;
      publish(setFrame, sampled);
    }
    motion.coast(running.inertia, running.velocity);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const next = motion.sample(performance.now() - start, reduced(options));
      publish(setFrame, next);
      if (next.active) handle = setTimeout(tick, FRAME_MS);
    };
    handle = setTimeout(tick, 0);
    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [motion, running, start, offset, options.reducedMotion]);

  /**
   * The frame a reduced render paints: the projection the release names from
   * the frame on screen, or — when the release cannot be read — that frame,
   * which is the standstill. A projection read from the mount offset sent a
   * reader who had already coasted back to where the gesture began, and
   * projecting `NaN` as `0` flashed the same first frame. A declaration whose
   * journey this hook already ended paints the frame it rests on instead of a
   * projection the reader never asked for.
   */
  const resting = ended ? motion.current : coastRest(running, motion.current);
  return reducedMotion
    ? restingFrame(
        resting,
        // The projection this render names is the gesture's end; a release the
        // render just accumulated to reports it with the frame, not a commit
        // later. A coast that cannot leave its offset asked for no journey.
        frame.complete || resting !== motion.current,
      )
    : {
        value: frame.value,
        velocity: frame.velocity,
        complete: frame.complete,
      };
};
