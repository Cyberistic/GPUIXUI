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
 *
 * The preference is read through {@link preferenceOf}, the same rule every
 * timing entry point sits on, because this is the function a composing package
 * reuses with **its** settings row: a stored value that is present and not a
 * name is the reduced policy here too, rather than the animated answer a direct
 * `=== "reduced"` comparison gave it.
 */
export const reducedMotionOf = (
  override: boolean | undefined,
  preference: unknown,
): boolean => override ?? preferenceOf(preference) === "reduced";

/** A tween in the shape the runtime's `transition` prop reads. */
export interface MotionTiming {
  /** Seconds, as the runtime reads it. */
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: MotionEasing;
}

/** What a caller may choose when building a timing. */
export interface MotionTimingOptions {
  /**
   * Default `"standard"`. A phase the table does not name is `"standard"`, the
   * curve between two resting states ({@link phaseOf}), so the field takes the
   * value a decoded config has rather than the union this package carries.
   */
  readonly phase?: unknown;
  /**
   * Default `"animated"`. A stored value the union does not name is read as
   * `"reduced"` ({@link preferenceOf}).
   *
   * The field takes what the application has rather than the union this package
   * carries — a settings row read back from a store is a `string` the type does
   * not name — so a decoded value reaches the reader here instead of being
   * refused at the call site and asserted into a `MotionPreference`.
   */
  readonly preference?: unknown;
  /**
   * The curve this run eases with, in place of its phase's. Default: the
   * phase's own ({@link motionEasings}).
   *
   * A surface with its own feel names its curve the way it names its duration —
   * a swipe's return leaves fast and settles, where the `standard` phase eases
   * at both ends. Read through {@link isMotionEasing}, because the value arrives
   * from a persisted setting as often as from a literal: one the renderer cannot
   * read is the phase's curve, not a description it refuses whole (which paints
   * no frame at all). The reduced preference still wins, so a curve never
   * resurrects a journey the reader removed.
   *
   * The curve is a shape, not a spring: the renderer clamps a tween to its
   * target, so a cubic-bezier whose `y` controls exceed one still stops at the
   * value — an overshoot cannot paint.
   */
  readonly ease?: unknown;
}

/**
 * Whether the level table names this value.
 *
 * A level is a persisted choice as often as a literal — a saved dashboard's
 * per-widget speed, a settings row a release renamed — so the test takes the
 * value a decoder wrote. It reads the table's **own** keys: `key in table` also
 * answers true for every name `Object.prototype` carries (`toString`,
 * `constructor`, `__proto__`), so such a name would pass the guard and the
 * lookup would hand the runtime a method where a number belongs.
 */
export const isMotionLevel = (value: unknown): value is MotionLevel =>
  typeof value === "string" && Object.hasOwn(motionLevels, value);

/** Whether the easing table itself names a phase. */
const namesPhase = (phase: string): phase is MotionPhase =>
  Object.hasOwn(motionEasings, phase);

/**
 * The level a value names, or the house surface arrival.
 *
 * This is the read a caller makes for a motion level at its own boundary — a
 * component's `level`, a saved dashboard's per-widget speed — and it answers the
 * levels this table names. A prop that widens that vocabulary with a value of
 * its own (`@gpuixui/components`' `level="none"`, which means "paint at rest")
 * reads that value before this: `none` names no duration, so a stored one
 * answers `normal` here.
 *
 * A name this release does not carry must not reach the runtime as
 * `undefined / 1000` — a `NaN` duration the renderer drops, which leaves the
 * surface on its own timing while the caller believes it asked for the saved
 * one. A name the table does not carry, a value that is not even a string, and a
 * name inherited from `Object.prototype` all answer `normal` (the surface
 * arrival), so the value decodes without an assertion at the call site.
 */
export const motionLevelOf = (value: unknown): MotionLevel =>
  isMotionLevel(value) ? value : "normal";

/**
 * The phase a timing eases with. A phase the table does not carry takes
 * `standard`, the curve between two resting states, rather than handing the
 * runtime an absent `ease` — including a value a store wrote that is not even a
 * string, which the table cannot name either.
 */
const phaseOf = (phase: unknown): MotionPhase =>
  typeof phase === "string" && namesPhase(phase) ? phase : "standard";

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
 *
 * `ease` names the run's own curve, read through {@link isMotionEasing}: a value
 * the renderer cannot read is the phase's curve rather than a description it
 * refuses whole, and the reduced branch above returns before it, so a curve can
 * never outlive the journey the reader removed.
 */
export const motionTimingOf = (
  durationMs: number,
  options: MotionTimingOptions | null = {},
): MotionTiming => {
  const phase = options?.phase ?? "standard";
  if (preferenceOf(options?.preference) === "reduced") return { duration: 0 };
  const named = options?.ease;
  return {
    duration: runnableMs(durationMs) / 1000,
    ease: isMotionEasing(named) ? named : motionEasings[phaseOf(phase)],
  };
};

/**
 * A level and phase as the runtime's timing, in seconds.
 *
 * The level is read through {@link motionLevelOf}, so a value a consumer
 * restored from storage and this type does not carry still moves on the house
 * surface arrival instead of a `NaN` duration. Under the reduced preference the
 * duration is zero and no easing is named: the target is painted without a
 * transition, which is the runtime's instant assignment. The caller keeps the
 * frames (an opacity or an offset) either way, so the resting appearance never
 * depends on the preference.
 */
export const motionTiming = (
  level: MotionLevel,
  options: MotionTimingOptions | null = {},
): MotionTiming => motionTimingOf(motionLevels[motionLevelOf(level)], options);
