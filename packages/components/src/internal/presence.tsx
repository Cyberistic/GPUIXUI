/**
 * The motion seam: how a surface enters and leaves.
 *
 * GPUix executes the tween — a numeric `motion` description per host element —
 * and `@gpuixui/motion` owns the timing: the levels, the per-phase easing and the
 * reduced-motion policy. This module is the one place a component composes those
 * two, so every overlay moves the same way:
 *
 * - a surface **fades** and travels a few pixels on its entry axis (`fadeFrom`);
 *   it never scales, rotates or slides in a transform, because the runtime has
 *   no `transform` style key (plan 600 §3, upstream issue #102);
 * - presence is a duration, not a frame callback: the surface stays mounted for
 *   its exit tween and then unmounts. `AnimatePresence` reports an exit only
 *   through `onMotionComplete` on `motion.div`, and the popover, menu and
 *   preview-card surfaces are hosted by `FloatingLayer`'s own element, so one
 *   mechanism covers every surface;
 * - the reduced preference is read from `MotionProvider`, because the runtime
 *   exposes no preference of its own. It zeroes the duration: the resting frame
 *   still paints, only the journey is removed.
 *
 * The runtime is given geometry as a *between* value (the offset), so a headless
 * suite can read the movement in element bounds; the fade itself is a paint value
 * the native tree does not expose, and the live probes are what prove it.
 */

import type {
  MotionProps,
  MotionStyle,
  MotionTransition,
  StyleDesc,
} from "@gpuix/react";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

const MotionContext = createContext<MotionPreference>("animated");

/** Props for {@link MotionProvider}. */
export interface MotionProviderProps {
  /**
   * The reader's motion preference. Default `"animated"`; a host that knows the
   * platform's setting passes `"reduced"`.
   */
  readonly preference?: MotionPreference;
  readonly children?: ReactNode;
}

/**
 * Supply a motion preference to every surface below it.
 *
 * There is no runtime query to read: `@gpuix/native@0.11.0` exposes no
 * reduced-motion preference (`docs/gpuix-capabilities.md`), so the application
 * owns it, exactly as it owns the theme mode.
 */
export const MotionProvider = ({
  preference = "animated",
  children,
}: MotionProviderProps) => (
  <MotionContext.Provider value={preference}>{children}</MotionContext.Provider>
);

/** Read the nearest motion preference, `"animated"` without a provider. */
export const useMotionPreference = (): MotionPreference =>
  useContext(MotionContext);

/** The enter and exit timing a surface at one level moves with. */
export interface SurfaceTiming {
  readonly enter: MotionTransition;
  readonly exit: MotionTransition;
}

/** A surface's three frames: its first paint, its resting frame and its exit. */
export interface SurfaceFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
  readonly exit: MotionStyle;
}

/**
 * The timings a surface at `level` moves with, under the current preference.
 *
 * The enter decelerates and the exit accelerates, so the two are separate
 * transitions rather than one shared curve: a surface that speeds up as it
 * leaves reads as being pulled away.
 */
export const useSurfaceTiming = (level: MotionLevel): SurfaceTiming => {
  const preference = useMotionPreference();
  return {
    enter: motionTiming(level, { phase: "enter", preference }),
    exit: motionTiming(level, { phase: "exit", preference }),
  };
};

/**
 * The window a run occupies, in whole milliseconds.
 *
 * `motionTiming` names a duration in seconds because the runtime reads seconds;
 * every component that keeps a box painted for the length of a journey converts
 * through here, so a preference change rescales the window with the tween it
 * belongs to. A run with no duration is no window at all.
 */
export const transitionWindowMs = (timing: MotionTransition): number =>
  Math.round((timing.duration ?? 0) * 1000);

/**
 * The mount window a leaving surface occupies, in whole milliseconds.
 *
 * The seam and the toast stack both keep a leaving box painted for exactly the
 * length of its exit tween, so the conversion lives in one place and a
 * preference change rescales both.
 */
export const exitWindowMs = (timing: SurfaceTiming): number =>
  transitionWindowMs(timing.exit);

/**
 * A house timing that waits `delayMs` before it runs — a stagger.
 *
 * The delay is named in milliseconds and handed to the runtime in seconds. A
 * reduced timing (a zero duration) drops the delay with the journey: the runtime
 * waits a delay out *before* an instant assignment, so keeping it would hold a
 * resting frame back by exactly the wait the preference removes. A delay that
 * cannot be scheduled (negative, infinite, `NaN`) adds nothing, and the timing
 * is returned as it was, so an unstaggered run keeps the object it was given.
 *
 * This is the one place a timing gains a stagger; a component that spreads a
 * delay onto a timing itself re-implements the reduced rule.
 */
export const delayedTiming = (
  timing: MotionTransition,
  delayMs: number,
): MotionTransition =>
  timing.duration === 0 || !Number.isFinite(delayMs) || delayMs <= 0
    ? timing
    : { ...timing, delay: delayMs / 1000 };

/**
 * A fade that travels `offset` pixels along one axis.
 *
 * A positive `top` starts the surface low and rises it into place; a negative
 * one starts high. Panels anchored to an edge pass the direction they open
 * from, so the movement points at the edge it belongs to.
 */
export const fadeFrom = (axis: "top" | "left", offset: number): SurfaceFrames =>
  axis === "top"
    ? {
        initial: { opacity: 0, top: offset },
        animate: { opacity: 1, top: 0 },
        exit: { opacity: 0, top: offset },
      }
    : {
        initial: { opacity: 0, left: offset },
        animate: { opacity: 1, left: 0 },
        exit: { opacity: 0, left: offset },
      };

/** A fade that travels nowhere: a scrim dims, it does not move. */
export const fadeOnly: SurfaceFrames = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** A window edge a panel is anchored to. */
export type PanelSide = "top" | "right" | "bottom" | "left";

/**
 * A fade that travels in from a window edge.
 *
 * A panel at the right edge starts `offset` pixels further right and moves in;
 * the surface reads as arriving from outside the window. This is the drawer's
 * rule, and the reverse of {@link fadeFromAnchor}.
 */
export const fadeFromSide = (side: PanelSide, offset: number): SurfaceFrames =>
  side === "top"
    ? fadeFrom("top", -offset)
    : side === "bottom"
      ? fadeFrom("top", offset)
      : side === "left"
        ? fadeFrom("left", -offset)
        : fadeFrom("left", offset);

/**
 * A fade that travels out from the control it is anchored to.
 *
 * shadcn's popover enters from the side facing its trigger (`slide-in-from-*`),
 * so a surface below its trigger starts above its resting place and moves down
 * while it fades. The menu, popover and preview card share the rule.
 */
export const fadeFromAnchor = (
  side: PanelSide,
  offset: number,
): SurfaceFrames =>
  side === "top"
    ? fadeFrom("top", offset)
    : side === "bottom"
      ? fadeFrom("top", -offset)
      : side === "left"
        ? fadeFrom("left", offset)
        : fadeFrom("left", -offset);

/** A surface's mount and presence state while it enters or leaves. */
export interface SurfacePresence {
  /** Render the surface at all: true from open until its exit has run. */
  readonly mounted: boolean;
  /** The resting frame's target: true while open, false while leaving. */
  readonly present: boolean;
  readonly timing: SurfaceTiming;
}

/**
 * Keep a surface mounted for its exit tween.
 *
 * `open` publishes the resting state at once; closing flips `present` so the
 * runtime tweens to the exit frame, and the surface unmounts when that tween's
 * duration has elapsed. Re-opening during the exit keeps the same instance, so
 * the run retargets instead of restarting.
 */
export const useSurfacePresence = (
  open: boolean,
  timing: SurfaceTiming,
): SurfacePresence => {
  const [mounted, setMounted] = useState(open);

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    const ms = exitWindowMs(timing);
    if (ms === 0) {
      setMounted(false);
      return;
    }
    const handle = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(handle);
  }, [mounted, open, timing.exit.duration]);

  return { mounted, present: open, timing };
};

/** The `motion` prop a surface paints for its current presence. */
export const presenceMotion = (
  frames: SurfaceFrames,
  presence: SurfacePresence,
): MotionProps => ({
  initial: frames.initial,
  animate: presence.present ? frames.animate : frames.exit,
  transition: presence.present ? presence.timing.enter : presence.timing.exit,
});

/**
 * The input rule a surface paints for its current presence.
 *
 * A surface stays painted for its exit tween, so it is still a box with
 * controls in it. The press that dismissed it belongs to whatever now lies
 * underneath, so a leaving surface takes none: its whole subtree is out of the
 * pointer until the tween ends and it unmounts. Every surface the seam keeps
 * mounted composes this, because a box that keeps taking presses is a control
 * nobody can see.
 */
export const presenceStyle = (present: boolean): StyleDesc => ({
  pointerEvents: present ? "auto" : "none",
});
