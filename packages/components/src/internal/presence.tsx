/** @jsxImportSource @gpuix/react */
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
 * - a leaving surface takes no presses on its own box (`presenceStyle`), and one
 *   that keeps controls mounted covers them with `PresenceShield` for the exit —
 *   `pointerEvents` does not inherit, so a child keeps its own hitbox;
 * - the reduced preference is read from `MotionProvider`, because the runtime
 *   exposes no preference of its own. The provider and its context are
 *   `@gpuixui/motion/react`'s and this module re-publishes them, so a primitive
 *   below the same provider reads the same flag. It zeroes the duration: the
 *   resting frame still paints, only the journey is removed.
 *
 * The frames, the hold window and the pointer rule are **numbers and strings**,
 * so they live in the motion package (`@gpuixui/motion/presence`) where a
 * primitive package can compose the same ones without depending on this one.
 * The **React half** lives there too — the preference provider, the surface
 * timing it reads and the mounted window (`@gpuixui/motion/react/presence`)
 * — because a timer and a React tree are not this package's to give away, and a
 * second copy of the window could only agree with this one by hand. It is the
 * physics-free half of the motion package's React entry: a surface that only
 * enters and leaves composes it without loading the spring, inertia and timeline
 * samplers, which no fade samples. What stays here is the GPUix half: the
 * shield, which is a host element the runtime paints.
 *
 * A movement that is neither an arrival nor a departure — a tab pill sliding
 * between triggers, a carousel dot growing into its neighbour — is the timing
 * table's third phase, `standard`, and this module composes it as
 * {@link moveTiming} from the motion package's own `motionTiming`: it is a
 * curve, not a frame or a window, so it adds no table of its own.
 *
 * The runtime is given geometry as a *between* value (the offset), so a headless
 * suite can read the movement in element bounds; the fade itself is a paint value
 * the native tree does not expose, and the live probes are what prove it.
 */

import type { MotionProps } from "@gpuix/react";
import {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  presenceMotion as motionOfPresence,
  presenceStyle,
  transitionWindowMs,
  type PresenceFrames,
  type PresenceHitRule,
  type PresenceSide,
  type PresenceTiming,
  type PresenceTransition,
} from "@gpuixui/motion/presence";
import {
  MotionProvider,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
  type MotionProviderProps,
  type SurfacePresence,
} from "@gpuixui/motion/react/presence";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";

/**
 * The preference provider is the motion package's, re-published here because
 * this is where the package's own records and pages point at it. Every surface
 * in the library reads the one context it creates, so an application states the
 * flag once and a primitive below the same provider agrees with these surfaces.
 */
export { MotionProvider, useMotionPreference, type MotionProviderProps };

/** The frames a surface paints, in the runtime's `motion` grammar. */
export type SurfaceFrames = PresenceFrames;

/** The enter and exit timing a surface at one level moves with. */
export type SurfaceTiming = PresenceTiming;

/** A window edge a panel is anchored to. */
export type PanelSide = PresenceSide;

/**
 * The frames, staggered arrivals and pointer rule, re-published from
 * `@gpuixui/motion/presence` so this package's surfaces keep one import.
 */
export {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  presenceStyle,
  transitionWindowMs,
};
export type { PresenceHitRule };

/**
 * The timings a surface at `level` moves with, and the window a leaving one
 * stays mounted for, re-published from `@gpuixui/motion/react`.
 *
 * The window was written out here once and in the primitives' `Tooltip` once,
 * so a package that owns a tree carried its own copy of the rule that decides
 * when a leaving surface stops being real. It is the motion package's now, and
 * this module keeps one import for the surfaces that use it.
 */
export { useSurfacePresence, useSurfaceTiming, type SurfacePresence };

/**
 * The timing a movement between two resting states runs on.
 *
 * The timing table names three phases: a surface arrives decelerating
 * (`enter`), leaves accelerating (`exit`), and a thing that moves from one
 * resting place to another — a tab pill travelling between triggers, a carousel
 * dot growing out of its neighbour — eases at both ends (`standard`). The latter
 * is not presence, so it has no frame of its own; it is the curve the runtime
 * paints between the two boxes the surface already measured.
 *
 * The preference is the provider's, the same one every surface reads, so a
 * reduced reader lands on the new place instead of travelling to it.
 */
export const moveTiming = (
  level: MotionLevel,
  preference: MotionPreference,
): PresenceTransition => motionTiming(level, { phase: "standard", preference });

/** {@link moveTiming} under the nearest provider's preference. */
export const useMoveTiming = (level: MotionLevel): PresenceTransition =>
  moveTiming(level, useMotionPreference());

/** The `motion` prop a surface paints for its current presence. */
export const presenceMotion = (
  frames: SurfaceFrames,
  presence: SurfacePresence,
): MotionProps => motionOfPresence(frames, presence.present, presence.timing);

/**
 * The layer a leaving surface paints over its content.
 *
 * {@link presenceStyle} removes the surface's **own** hitbox, and that is all it
 * can do: `pointerEvents` does not inherit in `@gpuix/native@0.11.0`, whose hit
 * test keeps every child's own box, so a control inside a box that is fading
 * still answers a press. Measured in this renderer: a dismissed `Dialog` stayed
 * painted for its exit and a press on its confirm action ran the action. A
 * positioned layer that answers nothing is the one box the hit test can find, so
 * a leaving surface takes the press for its exit instead of letting a ghost act
 * on it.
 *
 * The layer is inset against its **positioned parent**, so a surface renders it
 * as a child of the box that fades — the wrapper a reveal paints already owns
 * such a box (`position: "relative"`), and a surface whose root is not positioned
 * must make it so before it can shield its content.
 *
 * A press is the half this layer can take. The runtime's **Tab order** is decided
 * element by element, and neither `pointerEvents` nor a covered box removes a
 * descendant's stop: measured on `@gpuix/native@0.11.0`, a dismissed menu's rows
 * stayed stops at the end of the window's order, so a reader who pressed Escape
 * and then two Tabs landed on a row that unmounted under the keyboard. A control
 * has to drop its own stop, which is why the menu family carries `MenuLeaving`
 * (`menu/state.ts`) and its rows read it. Content a consumer composes inside a
 * modal ghost keeps its stops until this runtime publishes an inherited `inert`.
 */
export const PresenceShield = ({ present }: { readonly present: boolean }) =>
  present ? null : (
    <div
      testId="presence-shield"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );

/**
 * The Tab stop a surface's **own** control wears, for the presence it sits in.
 *
 * A surface kept for its exit tween is still painted, and the runtime decides
 * the Tab order element by element, so a control the library paints inside the
 * ghost needs its own stop dropped — the shield takes the press, not the
 * traversal. `-1` keeps the control addressable from code and a press while it
 * is out of the window's order for that window, and the caller's own
 * `tabIndex` still wins when this is spread before their props.
 */
export const presenceTabStop = (
  present: boolean,
): { readonly tabIndex?: number } => (present ? {} : { tabIndex: -1 });
