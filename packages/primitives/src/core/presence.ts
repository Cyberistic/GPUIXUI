/**
 * The motion seam a floating primitive moves with.
 *
 * GPUix executes a tween — a numeric `motion` description per host element —
 * and `@gpuixui/motion` owns the house rule: the frames, the timing, the hold
 * window and the pointer rule. That rule is published from
 * `@gpuixui/motion/presence` so both this package and the components package
 * compose one table instead of agreeing by hand, and this module is the
 * primitive side of that composition:
 *
 * - the frames, the exit window and the pointer rule are **re-exported** from
 *   the published seam, so an edit there reaches a tip with no copy to update;
 * - `surfaceTiming` names the level a small surface moves at and the phases a
 *   surface has, and the per-phase easing and the reduced policy come from the
 *   timing package through `presenceTiming`;
 * - a primitive that floats above the page still **fades** and travels a couple
 *   of pixels on its entry axis; it never scales, rotates or slides in a
 *   transform, because the runtime has no `transform` style key (the capability
 *   record's measured gap);
 * - presence is a **duration**, not a frame callback: the surface stays mounted
 *   for its exit tween and then unmounts, and it takes no presses while it
 *   leaves (`presenceStyle`), because the press that dismissed it belongs to
 *   whatever now lies underneath;
 * - the reduced preference zeroes the duration, so the resting frame still
 *   paints and only the journey is removed. The runtime exposes no preference,
 *   so the caller states it, exactly as it states the theme mode.
 *
 * The runtime is given geometry as a *between* value (the offset), so a headless
 * suite can read the movement in element bounds; the fade itself is a paint
 * value the native tree does not expose, and a live probe is what proves it.
 */

import type { MotionProps } from "@gpuix/react";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  type PresenceFrames,
  type PresenceSide,
  type PresenceTiming,
} from "@gpuixui/motion/presence";

export { exitWindowMs, fadeFromAnchor, presenceStyle };

/** The side of its trigger a floating surface is anchored to. */
export type AnchorSide = PresenceSide;

/** A surface's three frames: its first paint, its resting frame and its exit. */
export type SurfaceFrames = PresenceFrames;

/** The enter and exit timing a surface moves with. */
export type SurfaceTiming = PresenceTiming;

/**
 * The house timing for a small floating surface, in both phases.
 *
 * A tip is the smallest surface the library has, so it moves at the `fast`
 * level. The enter decelerates and the exit accelerates — `presenceTiming` reads
 * both from the timing package, so the pair cannot drift apart, and a reduced
 * preference zeroes the durations without touching the frames.
 */
export const surfaceTiming = (reducedMotion = false): SurfaceTiming =>
  presenceTiming("fast", reducedMotion ? "reduced" : "animated");

/** The `motion` prop a surface paints for its current presence. */
export const surfaceMotion = (
  frames: SurfaceFrames,
  present: boolean,
  timing: SurfaceTiming,
): MotionProps => presenceMotion(frames, present, timing);
