/**
 * House timing for the runtime's declarative motion.
 *
 * GPUix executes a tween — `initial` → `animate`, and `exit` while leaving —
 * over a duration and an easing it is told, in seconds. It does not choose
 * either, and it has no reduced-motion preference of its own (the capability
 * record marks the detection `not supported`). This module is the one place the
 * library's timing is named: five levels shared by every surface, one easing per
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
 * Whether the table itself names a level.
 *
 * The tables are looked up by their **own** keys. `key in table` also answers
 * true for every name `Object.prototype` carries (`toString`, `constructor`,
 * `__proto__`), so a persisted name would pass the guard and the lookup would
 * hand the runtime a method where a number or a curve belongs.
 */
const namesLevel = (level: string): level is MotionLevel =>
  Object.hasOwn(motionLevels, level);

/** Whether the easing table itself names a phase. */
const namesPhase = (phase: string): phase is MotionPhase =>
  Object.hasOwn(motionEasings, phase);

/**
 * The milliseconds a level names.
 *
 * The level may be a persisted choice an application reads back — a string the
 * library did not type-check — so a key the table does not carry must not reach
 * the runtime as `undefined / 1000`. It takes the house **surface arrival**
 * (`normal`), the timing a component that asked for nothing would move with.
 */
const levelMs = (level: MotionLevel): number =>
  namesLevel(level) && Number.isFinite(motionLevels[level])
    ? motionLevels[level]
    : motionLevels.normal;

/**
 * The phase a timing eases with. A phase the table does not carry takes
 * `standard`, the curve between two resting states, rather than handing the
 * runtime an absent `ease`.
 */
const phaseOf = (phase: MotionPhase): MotionPhase =>
  namesPhase(phase) ? phase : "standard";

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
    duration: levelMs(level) / 1000,
    ease: motionEasings[phaseOf(phase)],
  };
};
