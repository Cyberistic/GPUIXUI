/**
 * The motion seam a floating primitive moves with.
 *
 * GPUix executes a tween — a numeric `motion` description per host element —
 * and `@gpuixui/motion` owns the timing: the levels, the per-phase easing and
 * the reduced-motion policy. A primitive that floats above the page composes
 * the two here, so the packages agree on how a small surface arrives:
 *
 * - it **fades** and travels a couple of pixels on its entry axis; it never
 *   scales, rotates or slides in a transform, because the runtime has no
 *   `transform` style key (the capability record's measured gap);
 * - presence is a **duration**, not a frame callback: the surface stays
 *   mounted for its exit tween and then unmounts, and it takes no presses while
 *   it leaves (`presenceStyle`), because the press that dismissed it belongs to
 *   whatever now lies underneath;
 * - the reduced preference zeroes the duration, so the resting frame still
 *   paints and only the journey is removed. The runtime exposes no preference,
 *   so the caller states it, exactly as it states the theme mode.
 *
 * The runtime is given geometry as a *between* value (the offset), so a headless
 * suite can read the movement in element bounds; the fade itself is a paint
 * value the native tree does not expose, and a live probe is what proves it.
 */

import type {
  MotionProps,
  MotionStyle,
  MotionTransition,
  StyleDesc,
} from "@gpuix/react";
import { motionTiming } from "@gpuixui/motion/timing";

/** The side of its trigger a floating surface is anchored to. */
export type AnchorSide = "top" | "right" | "bottom" | "left";

/** A surface's three frames: its first paint, its resting frame and its exit. */
export interface SurfaceFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
  readonly exit: MotionStyle;
}

/**
 * A fade that travels `offset` pixels along one axis.
 *
 * A positive `top` starts the surface low and rises it into place; a negative
 * one starts high.
 */
const fadeFrom = (axis: "top" | "left", offset: number): SurfaceFrames =>
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

/**
 * A fade that travels out from the control it is anchored to.
 *
 * A surface below its trigger starts above its resting place and moves down
 * while it fades, so the movement points away from the edge it hangs on.
 */
export const fadeFromAnchor = (
  side: AnchorSide,
  offset: number,
): SurfaceFrames =>
  side === "top"
    ? fadeFrom("top", offset)
    : side === "bottom"
      ? fadeFrom("top", -offset)
      : side === "left"
        ? fadeFrom("left", offset)
        : fadeFrom("left", -offset);

/** The enter and exit timing a surface moves with. */
export interface SurfaceTiming {
  readonly enter: MotionTransition;
  readonly exit: MotionTransition;
}

/**
 * The house timing for a small floating surface, in both phases.
 *
 * The enter decelerates and the exit accelerates, so the two are separate
 * transitions rather than one shared curve: a surface that speeds up as it
 * leaves reads as being pulled away.
 */
export const surfaceTiming = (reducedMotion = false): SurfaceTiming => {
  const preference = reducedMotion ? "reduced" : "animated";
  return {
    enter: motionTiming("fast", { phase: "enter", preference }),
    exit: motionTiming("fast", { phase: "exit", preference }),
  };
};

/** A timing field in milliseconds, with a value that cannot be read as none. */
const milliseconds = (seconds: number | undefined): number =>
  seconds !== undefined && Number.isFinite(seconds) ? seconds * 1000 : 0;

/**
 * The window a leaving surface stays mounted for, in whole milliseconds.
 *
 * The hold is the tween **plus the wait it sits out first**: the runtime waits
 * a delay before an instant assignment, so keying the timer to the duration
 * would unmount a surface before its journey began. A reduced timing is no
 * window at all.
 */
export const exitWindowMs = (timing: SurfaceTiming): number =>
  Math.round(
    milliseconds(timing.exit.duration) + milliseconds(timing.exit.delay),
  );

/** The `motion` prop a surface paints for its current presence. */
export const surfaceMotion = (
  frames: SurfaceFrames,
  present: boolean,
  timing: SurfaceTiming,
): MotionProps => ({
  initial: frames.initial,
  animate: present ? frames.animate : frames.exit,
  transition: present ? timing.enter : timing.exit,
});

/**
 * The pointer rule a surface paints for its current presence.
 *
 * A surface stays painted for its exit tween, so it is still a box while it
 * leaves. The press that dismissed it belongs to whatever now lies underneath,
 * so a leaving surface takes none until its tween ends and it unmounts.
 */
export const presenceStyle = (present: boolean): StyleDesc => ({
  pointerEvents: present ? "auto" : "none",
});
