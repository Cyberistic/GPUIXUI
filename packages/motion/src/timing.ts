/**
 * House timing for the runtime's declarative motion.
 *
 * GPUix executes a tween — `initial` → `animate`, and `exit` while leaving —
 * over a duration and an easing it is told, in seconds. It does not choose
 * either, and it has no reduced-motion preference of its own (the capability
 * matrix records the detection as unverified). This module is the one place the
 * library's timing is named: four levels shared by every surface, one easing per
 * phase, and the preference policy that collapses a timing to an instant
 * assignment instead of a transition.
 *
 * A reduced run still paints its final frame: the semantic state is unchanged,
 * only the journey is removed (openGpui's `MotionPreference::Reduced`).
 */

/** The durations the library's surfaces share, in milliseconds. */
export const motionLevels = {
  /** A step indicator's tick. */
  step: 120,
  /** A small affordance: a tooltip, an indicator. */
  fast: 160,
  /** A surface arriving: a popover, a menu, an accordion panel, a tab pill. */
  normal: 200,
  /** A surface that owns the window: a dialog, a drawer. */
  slow: 320,
  /** A notice that may be read while it leaves: a toast. */
  notice: 500,
} as const;

/** A named duration from {@link motionLevels}. */
export type MotionLevel = keyof typeof motionLevels;

/** The phases a movement belongs to. */
export type MotionPhase = "enter" | "exit" | "standard";

/** A cubic-bezier easing, in the runtime's order. */
export type MotionCurve = [number, number, number, number];

/** The easings the runtime accepts: five names, or a cubic-bezier tuple. */
export type MotionEasing =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | MotionCurve;

/**
 * The easing each phase uses, by the physics it describes: a surface arrives
 * decelerating and leaves accelerating, and a movement between two resting
 * states eases at both ends.
 */
export const motionEasings: Readonly<Record<MotionPhase, MotionEasing>> = {
  enter: "easeOut",
  exit: "easeIn",
  standard: "easeInOut",
};

/** Who owns the preference: the application, because the runtime exposes none. */
export type MotionPreference = "animated" | "reduced";

/** A tween in the shape the runtime's `transition` prop reads. */
export interface MotionTiming {
  /** Seconds, as the runtime reads it. */
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: MotionEasing;
}

/** What a caller may choose when building a timing. */
export interface MotionTimingOptions {
  /** Default `"standard"`. */
  readonly phase?: MotionPhase;
  /** Default `"animated"`. */
  readonly preference?: MotionPreference;
}

/**
 * A level and phase as the runtime's timing, in seconds.
 *
 * Under the reduced preference the duration is zero and no easing is named:
 * the target is painted without a transition, which is the runtime's instant
 * assignment. The caller keeps the frames (an opacity or an offset) either way,
 * so the resting appearance never depends on the preference.
 */
export const motionTiming = (
  level: MotionLevel,
  options: MotionTimingOptions = {},
): MotionTiming => {
  const phase = options.phase ?? "standard";
  if (options.preference === "reduced") return { duration: 0 };
  return {
    duration: motionLevels[level] / 1000,
    ease: motionEasings[phase],
  };
};
