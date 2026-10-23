/**
 * The house presence: the frames a surface enters and leaves with, the timing
 * each phase runs on, and the window a leaving box stays mounted for.
 *
 * This module is renderer-neutral on purpose. A frames table, a timing and a
 * hold window are numbers; both a component package and a primitive package
 * need the same ones, and neither may depend on the other, so the rule lives in
 * the package that already owns the timing and the reduced-motion policy.
 *
 * GPUix has no `transform` style key, so a surface never scales, rotates or
 * slides; it fades and travels a few pixels on `top` or `left`. A reduced run
 * keeps every frame and loses only the journey, which is why the frames carry
 * no preference and the timing does.
 */

import {
  motionTiming,
  type MotionEasing,
  type MotionLevel,
  type MotionPreference,
} from "./timing.js";

/** The side of a trigger or window edge a surface arrives from. */
export type PresenceSide = "top" | "right" | "bottom" | "left";

/** The numeric fields a presence frame travels on. */
export interface PresenceFrame {
  readonly opacity?: number;
  readonly height?: number;
  readonly top?: number;
  readonly left?: number;
}

/** A surface's three frames: its first paint, its resting frame and its exit. */
export interface PresenceFrames {
  readonly initial: PresenceFrame;
  readonly animate: PresenceFrame;
  readonly exit: PresenceFrame;
}

/** A tween in the shape a surface paints, with every field optional. */
export interface PresenceTransition {
  /** Seconds, as the runtime reads it. */
  readonly duration?: number;
  /** Seconds the runtime holds the first frame for before it runs. */
  readonly delay?: number;
  readonly ease?: MotionEasing;
}

/** The enter and exit timing a surface at one level moves with. */
export interface PresenceTiming {
  readonly enter: PresenceTransition;
  readonly exit: PresenceTransition;
}

/** The pointer rule a surface paints: only a resting surface is a target. */
export interface PresenceHitRule {
  readonly pointerEvents?: "auto" | "none";
}

/**
 * A fade that travels `offset` pixels along one axis.
 *
 * A positive `top` starts the surface low and rises it into place; a negative
 * one starts high.
 */
export const fadeFrom = (
  axis: "top" | "left",
  offset: number,
): PresenceFrames =>
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
export const fadeOnly: PresenceFrames = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * A fade that travels in from a window edge.
 *
 * A panel anchored to the right starts further right and moves in, so the
 * surface reads as arriving from outside the window. This is the reverse of
 * {@link fadeFromAnchor}.
 */
export const fadeFromSide = (
  side: PresenceSide,
  offset: number,
): PresenceFrames =>
  side === "top"
    ? fadeFrom("top", -offset)
    : side === "bottom"
      ? fadeFrom("top", offset)
      : side === "left"
        ? fadeFrom("left", -offset)
        : fadeFrom("left", offset);

/**
 * A fade that travels out from the control a surface is anchored to.
 *
 * A surface below its trigger starts above its resting place and moves down
 * while it fades, so the movement points away from the edge it hangs on.
 */
export const fadeFromAnchor = (
  side: PresenceSide,
  offset: number,
): PresenceFrames =>
  side === "top"
    ? fadeFrom("top", offset)
    : side === "bottom"
      ? fadeFrom("top", -offset)
      : side === "left"
        ? fadeFrom("left", offset)
        : fadeFrom("left", -offset);

/**
 * The timings a surface at `level` moves with, under a preference.
 *
 * The enter decelerates and the exit accelerates, so the two are separate
 * transitions rather than one shared curve: a surface that speeds up as it
 * leaves reads as being pulled away.
 */
export const presenceTiming = (
  level: MotionLevel,
  preference: MotionPreference = "animated",
): PresenceTiming => ({
  enter: motionTiming(level, { phase: "enter", preference }),
  exit: motionTiming(level, { phase: "exit", preference }),
});

/** A timing field in milliseconds, with a value that cannot be read as none. */
const milliseconds = (seconds: number | undefined): number =>
  seconds !== undefined && Number.isFinite(seconds) ? seconds * 1000 : 0;

/**
 * The window a run occupies, in whole milliseconds.
 *
 * The wait a delayed run sits out first is part of its window — the runtime
 * holds the first frame for it — so a window that counted only the duration
 * would unmount a feedback layer before its journey began. A run with no
 * duration and no wait is no window at all.
 */
export const transitionWindowMs = (timing: PresenceTransition): number =>
  Math.round(milliseconds(timing.duration) + milliseconds(timing.delay));

/**
 * The mount window a leaving surface occupies, in whole milliseconds.
 *
 * The seam and the toast stack both keep a leaving box painted for exactly the
 * length of its exit tween, so the conversion lives in one place and a
 * preference change rescales both.
 */
export const exitWindowMs = (timing: PresenceTiming): number =>
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
 */
export const delayedTiming = (
  timing: PresenceTransition,
  delayMs: number,
): PresenceTransition =>
  timing.duration === 0 || !Number.isFinite(delayMs) || delayMs <= 0
    ? timing
    : { ...timing, delay: delayMs / 1000 };

/** The `motion` prop a surface paints for its current presence. */
export const presenceMotion = <Frames extends PresenceFrames>(
  frames: Frames,
  present: boolean,
  timing: PresenceTiming,
): {
  readonly initial: Frames["initial"];
  readonly animate: Frames["animate"] | Frames["exit"];
  readonly transition: PresenceTransition;
} => ({
  initial: frames.initial,
  animate: present ? frames.animate : frames.exit,
  transition: present ? timing.enter : timing.exit,
});

/**
 * The pointer rule a surface paints for its current presence.
 *
 * A surface that stays painted for its exit is still a box with controls in it,
 * so a leaving one takes no presses until its tween ends and it unmounts.
 *
 * `rest` is what the surface is while it is open, and the two answers are not
 * interchangeable. An overlay is a **target**: it blocks the pointer behind it,
 * which is what `"auto"` buys over the implicit hitbox its fill already inserts.
 * A reveal is a **wrapper**: it paints no surface of its own, so `"auto"` would
 * put a hitbox over the content it wraps, and it paints nothing at rest.
 */
export const presenceStyle = (
  present: boolean,
  rest: "target" | "wrapper" = "target",
): PresenceHitRule =>
  present && rest === "wrapper"
    ? {}
    : { pointerEvents: present ? "auto" : "none" };
