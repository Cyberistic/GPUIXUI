/**
 * House timing for the runtime's declarative motion.
 *
 * GPUix executes a tween — `initial` → `animate`, and `exit` while leaving —
 * over a duration and an easing it is told, in seconds. It does not choose
 * either, and it has no reduced-motion preference of its own (the capability
 * record marks the detection `not supported`). This module is the one place the
 * library's timing is named: five levels shared by every surface, one easing per
 * phase, and the preference policy that collapses a timing to an instant
 * assignment instead of a transition — including the rule that reads a
 * preference an application stored, which is the policy's only input it does not
 * type.
 *
 * A reduced run still paints its final frame: the semantic state is unchanged,
 * only the journey is removed (openGpui's `MotionPreference::Reduced`).
 */

import { schedulableSeconds } from "./duration.js";

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

/**
 * The easing names the runtime accepts, in its own order.
 *
 * The union below is derived from this list rather than restating it, so the
 * grammar has one home: a name this release stops shipping is removed here and
 * every table, guard and reader moves with it.
 */
export const motionEasingNames = [
  "linear",
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
] as const;

/** A named easing the runtime accepts. */
export type MotionEasingName = (typeof motionEasingNames)[number];

/** The easings the runtime accepts: five names, or a cubic-bezier tuple. */
export type MotionEasing = MotionEasingName | MotionCurve;

/** Whether a value is one of the five easing names the runtime accepts. */
export const isMotionEasingName = (value: unknown): value is MotionEasingName =>
  motionEasingNames.some((name) => name === value);

/** A value a curve can read: a finite number. */
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** A cubic-bezier control in the range the renderer interpolates over. */
const isUnitControl = (value: unknown): boolean =>
  isFiniteNumber(value) && value >= 0 && value <= 1;

/**
 * Whether the runtime accepts an easing.
 *
 * The grammar is the renderer's, not this package's, and a motion description
 * whose transition names an easing it cannot read is **rejected whole** — the
 * surface paints no motion frame at all. A stored timing is therefore read
 * through this before it is handed over: one of the five names, or a
 * cubic-bezier whose four values are finite and whose two `x` controls lie in
 * `[0, 1]` (the renderer solves the curve in time, so `y` may overshoot).
 */
export const isMotionEasing = (value: unknown): value is MotionEasing => {
  if (typeof value === "string") return isMotionEasingName(value);
  const curve: ReadonlyArray<unknown> = Array.isArray(value) ? value : [];
  if (curve.length !== 4) return false;
  const [x1, y1, x2, y2] = curve;
  return (
    isUnitControl(x1) &&
    isFiniteNumber(y1) &&
    isUnitControl(x2) &&
    isFiniteNumber(y2)
  );
};

/**
 * The easing each phase uses, by the physics it describes: a surface arrives
 * decelerating and leaves accelerating, and a movement between two resting
 * states eases at both ends.
 *
 * Each name is a curve the package also samples: `easing.ts`'s `motionCurve`
 * hands the same name the control points the runtime resolves it to, so a
 * movement sampled in JavaScript eases exactly as the runtime tween beside it.
 */
export const motionEasings: Readonly<Record<MotionPhase, MotionEasingName>> = {
  enter: "easeOut",
  exit: "easeIn",
  standard: "easeInOut",
};

/** Who owns the preference: the application, because the runtime exposes none. */
export type MotionPreference = "animated" | "reduced";

/**
 * The preference the library moves with, read from a value an application stored.
 *
 * The preference is a persisted choice — an application reads its motion setting
 * back from storage and hands it to `MotionProvider` — so the library is handed
 * values the union never described: a database column that is `NULL`, or a
 * release that renamed the setting and left the old string behind. Only the two
 * names the table carries are read as themselves. An **absent** value (nullish,
 * the rule `Option.fromNullishOr` keeps at every boundary) is the house
 * `"animated"`, which is what a tree that states no preference has always moved
 * with. A value that is **present and not a name** takes `"reduced"`, because
 * the two mistakes are not equal: animating a reader who asked for less motion
 * is the failure this policy exists to prevent, while removing a journey the
 * application can see it lost is one a developer fixes.
 */
export const preferenceOf = (value: unknown): MotionPreference =>
  value === "reduced" || value === "animated"
    ? value
    : value === null || value === undefined
      ? "animated"
      : "reduced";

/**
 * Whether a run removes its motion, read from a caller's override and the
 * reader's preference.
 *
 * The application states the preference **once**, through `MotionProvider`, so
 * a surface below it moves as its reader asked without repeating the flag at
 * every call. A caller's own `reducedMotion` is the per-run override — it wins
 * in both directions, so a decorative animation can be silenced beside a
 * functional one, and a caller that must move keeps moving in a reduced tree —
 * and a tree that states neither keeps its motion, the provider's `"animated"`
 * default.
 */
export const reducedMotionOf = (
  override: boolean | undefined,
  preference: MotionPreference,
): boolean => override ?? preference === "reduced";

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
  /**
   * Default `"animated"`. A stored value the union does not name is read as
   * `"reduced"` ({@link preferenceOf}).
   */
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
 * The milliseconds a timing can run.
 *
 * A duration is caller arithmetic — a stored preference, a stagger's pace — so
 * one the renderer's clock cannot schedule is not a long journey: the runtime
 * converts the seconds into a `Duration` and refuses the **whole** description,
 * which paints no frame at all ({@link schedulableSeconds}). It takes the house
 * surface arrival, the answer an unreadable duration already gets.
 */
const runnableMs = (durationMs: number): number =>
  schedulableSeconds(durationMs / 1000) === undefined
    ? motionLevels.normal
    : durationMs;

/**
 * A named millisecond duration and phase as the runtime's timing, in seconds.
 *
 * This is the one place a timing is built from a duration, so a surface that
 * moves on a duration outside {@link motionLevels} still keeps the shared
 * reduced rule here instead of re-implementing it: under the reduced preference
 * the duration is zero and no easing is named, so the target is painted without
 * a transition. A duration that is not positive and finite — or one past the
 * clock the renderer schedules — reads as the house surface arrival
 * ({@link motionLevels.normal}), the timing a surface that asked for nothing
 * moves with, rather than a description the runtime refuses whole.
 *
 * The options are a caller's config as often as a literal, so an **absent
 * object** — JSON has no `undefined`, so a settings row this never carried reads
 * back as `null` — is the house timing a caller who states nothing gets, and an
 * option it does not name falls back the same way. Reading `.phase` off the
 * absent object threw out of the render that built the surface's timing.
 */
export const motionTimingOf = (
  durationMs: number,
  options: MotionTimingOptions | null = {},
): MotionTiming => {
  const phase = options?.phase ?? "standard";
  if (preferenceOf(options?.preference) === "reduced") return { duration: 0 };
  return {
    duration: runnableMs(durationMs) / 1000,
    ease: motionEasings[phaseOf(phase)],
  };
};

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
  options: MotionTimingOptions | null = {},
): MotionTiming => motionTimingOf(levelMs(level), options);
