/**
 * The React half of the presence table: the timings a surface enters and leaves
 * with, and the window a leaving box stays mounted for.
 *
 * Published on its own entry, `@gpuixui/motion/react/presence`, because the
 * hooks on `@gpuixui/motion/react` drive a retained `MotionValue` and reach the
 * spring, inertia and timeline samplers — physics a fade never samples. A
 * surface that only enters and leaves (every overlay, panel and reveal in
 * `@gpuixui/components`) imports this entry, so the physics stay out of its
 * graph. `@gpuixui/motion/react` re-exports everything here, so the two entries
 * cannot drift.
 *
 * The frames, the per-phase timing and the mounted window's conversion are
 * numbers and strings and live in `presence.ts`; this module is the React half.
 */

import { useEffect, useLayoutEffect, useState } from "react";
import {
  exitWindowMs,
  presenceTiming,
  presenceTimingOf,
  type PresenceTiming,
  type PresenceTimingInput,
} from "../presence.js";
import { useMotionPreference } from "../provider.js";
import type { MotionLevel } from "../timing.js";

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
} from "../provider.js";

/**
 * The timings a surface at `level` moves with, under the current preference.
 *
 * The enter decelerates and the exit accelerates, so the two are separate
 * transitions rather than one shared curve: a surface that speeds up as it
 * leaves reads as being pulled away. The preference is the provider's, so a
 * surface reads the one flag the whole tree states.
 */
export const useSurfaceTiming = (level: MotionLevel): PresenceTiming =>
  presenceTiming(level, useMotionPreference());

/** A surface's mount and presence state while it enters or leaves. */
export interface SurfacePresence {
  /** Render the surface at all: true from open until its exit has run. */
  readonly mounted: boolean;
  /** The resting frame's target: true while open, false while leaving. */
  readonly present: boolean;
  readonly timing: PresenceTiming;
}

/**
 * Keep a surface mounted for its exit tween.
 *
 * `open` publishes the resting state at once; closing flips `present` so the
 * runtime tweens to the exit frame, and the surface unmounts when that run's
 * whole window has elapsed — the tween plus the wait it sits out first. The
 * timer is keyed to that window, not to the duration, so a leave already in
 * flight is re-timed when the window changes. Re-opening during the exit keeps
 * the same instance, so the run retargets instead of restarting.
 *
 * The window is the table's own conversion ({@link exitWindowMs}), so a
 * delayed run keeps its box for the wait it sits out first, and a timing that
 * cannot be scheduled holds nothing.
 */
export const useSurfacePresence = (
  open: boolean,
  timing: PresenceTimingInput | null | undefined,
): SurfacePresence => {
  const [mounted, setMounted] = useState(open);
  // The hold is the window, not the duration: a delayed exit sits out its wait
  // before the tween, so keying the timer to the duration would unmount a box
  // before its journey began — and a changed wait would not re-arm it at all.
  // A stored timing that names no phase is read as no transition here too, so a
  // surface handed one paints at once instead of throwing in this render.
  const phases = presenceTimingOf(timing);
  const windowMs = exitWindowMs(phases);

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    if (windowMs === 0) {
      setMounted(false);
      return;
    }
    const handle = setTimeout(() => setMounted(false), windowMs);
    return () => clearTimeout(handle);
  }, [mounted, open, windowMs]);

  return { mounted, present: open, timing: phases };
};
