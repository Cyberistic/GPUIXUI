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
import { motionTiming, type MotionLevel } from "@gpuixui/motion/timing";
import {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "@gpuixui/motion/react";
import { useEffect, useLayoutEffect, useState } from "react";

/**
 * The preference provider is the motion package's, re-published here because
 * this is where the package's own records and pages point at it. Every surface
 * in the library reads the one context it creates, so an application states the
 * flag once and a primitive below the same provider agrees with these surfaces.
 */
export { MotionProvider, useMotionPreference, type MotionProviderProps };

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

/** A timing field in milliseconds, with a value that cannot be read as none. */
const milliseconds = (seconds: number | undefined): number =>
  seconds !== undefined && Number.isFinite(seconds) ? seconds * 1000 : 0;

/**
 * The window a run occupies, in whole milliseconds.
 *
 * `motionTiming` names a duration in seconds because the runtime reads seconds;
 * every component that keeps a box painted for the length of a journey converts
 * through here, so a preference change rescales the window with the tween it
 * belongs to. The wait a delayed run sits out first is part of its window — the
 * runtime holds the first frame for it — so a window that counted only the
 * duration would unmount a feedback layer before its journey began. A run with
 * no duration and no wait is no window at all.
 */
export const transitionWindowMs = (timing: MotionTransition): number =>
  Math.round(milliseconds(timing.duration) + milliseconds(timing.delay));

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
 * runtime tweens to the exit frame, and the surface unmounts when that run's
 * whole window has elapsed — the tween plus the wait it sits out first. The
 * timer is keyed to that window, not to the duration, so a leave already in
 * flight is re-timed when the window changes. Re-opening during the exit keeps
 * the same instance, so the run retargets instead of restarting.
 */
export const useSurfacePresence = (
  open: boolean,
  timing: SurfaceTiming,
): SurfacePresence => {
  const [mounted, setMounted] = useState(open);
  // The hold is the window, not the duration: a delayed exit sits out its wait
  // before the tween, so keying the timer to the duration would unmount a box
  // before its journey began — and a changed wait would not re-arm it at all.
  const windowMs = exitWindowMs(timing);

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
 * The pointer rule a surface paints for its current presence.
 *
 * A surface stays painted for its exit tween, so it is still a box with
 * controls in it. The press that dismissed it belongs to whatever now lies
 * underneath, so a leaving surface takes none until its tween ends and it
 * unmounts.
 *
 * `rest` is what the surface is while it is open, and the two answers are not
 * interchangeable. An overlay is a **target**: it blocks the pointer (and the
 * wheel) behind it, which is what `"auto"` buys over the implicit hitbox its
 * fill already inserts. A reveal is a **wrapper**: it paints no surface of its
 * own, so `"auto"` would put a hitbox over the content it wraps — a glyph
 * wrapped by a reveal would swallow the press meant for its control — and it
 * paints nothing at rest.
 */
export const presenceStyle = (
  present: boolean,
  rest: "target" | "wrapper" = "target",
): StyleDesc =>
  present && rest === "wrapper"
    ? {}
    : { pointerEvents: present ? "auto" : "none" };

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
 */
export const PresenceShield = ({ present }: { readonly present: boolean }) =>
  present ? null : (
    <div
      testId="presence-shield"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
