/**
 * Motion a reader asked not to see.
 *
 * `@gpuix/native` 0.11.0 exposes no reduced-motion preference (see
 * `docs/gpuix-capabilities.md`), so the caller owns one — it reads the platform
 * setting its host application already knows about and passes it down. A
 * primitive that moves honours it in one of two ways: a discrete indicator
 * paints its **resting** frame instead of a later one, and an interpolated part
 * paints with no duration. Both rules live here so every animated primitive
 * agrees about what "less motion" means.
 */

import type { MotionTransition } from "@gpuix/react";
import type { MotionPreference } from "@gpuixui/motion/timing";

/**
 * Whether a primitive removes its motion.
 *
 * The application states the preference **once** — `MotionProvider` from
 * `@gpuixui/motion/react` — so a tooltip, a switch and a spinner below one
 * provider agree; a control's own `reducedMotion` is the per-control override,
 * and a tree that states neither keeps its motion (the provider's default).
 */
export const reducedMotionOf = (
  override: boolean | undefined,
  preference: MotionPreference,
): boolean => override ?? preference === "reduced";

/** The frame a timed indicator paints: the first one when motion is off. */
export const stillFrame = (step: number, reducedMotion?: boolean): number =>
  reducedMotion === true ? 0 : step;

/**
 * The transition an interpolated part paints.
 *
 * A zero duration rather than `undefined`: omitting the transition hands the
 * part the runtime's default spring, which is the motion being refused.
 */
export const stillTransition = (
  transition: MotionTransition,
  reducedMotion?: boolean,
): MotionTransition => (reducedMotion === true ? { duration: 0 } : transition);
