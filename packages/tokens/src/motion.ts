/**
 * Motion timings and easings.
 *
 * GPUix animates only through `motion` props — there is no `transition` or
 * `animation` style, and `MotionStyle` reaches eight properties (`width`,
 * `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`). The
 * runtime's `MotionTransition` takes **seconds**; the step indicators that drive
 * a spinner or a skeleton interval take **milliseconds**, so the tokens store
 * milliseconds and {@link motionTransition} converts.
 */

import type { Theme } from "./theme.js";

/** An easing the runtime accepts, as the runtime names it. */
export type MotionEasing =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | [number, number, number, number];

/** Easings by phase. */
export interface MotionEasings {
  /** Symmetric: size and opacity changes at rest. */
  readonly standard: MotionEasing;
  /** Decelerating: a surface arriving. */
  readonly enter: MotionEasing;
  /** Accelerating: a surface leaving. */
  readonly exit: MotionEasing;
  /** Constant: an indeterminate loop. */
  readonly linear: MotionEasing;
}

/** The easing phases the library ships, in documentation order. */
export const motionPhases = ["standard", "enter", "exit", "linear"] as const;

/** An easing phase. */
export type MotionPhase = (typeof motionPhases)[number];

/** Motion timings in milliseconds, and the easings they run on. */
export interface Motion {
  /** `0` — a theme that removes motion. */
  readonly none: number;
  /** `120` — one frame of a step indicator (spinner, indeterminate bar). */
  readonly step: number;
  /** `160` — a small surface: tooltip, badge. */
  readonly fast: number;
  /** `200` — menus, dropdowns and combobox lists. */
  readonly normal: number;
  /** `320` — dialogs, panel expansion, accordions. */
  readonly slow: number;
  /** `700` — a skeleton's half cycle. */
  readonly pulse: number;
  /** Easings by phase. */
  readonly ease: MotionEasings;
}

/**
 * Partial motion overrides: any timing, or the easings inside `ease`. Timings
 * merge level by level and easings merge phase by phase, so one curve can move
 * without retyping the other three.
 */
export type MotionOverrides = Partial<Omit<Motion, "ease">> & {
  readonly ease?: Partial<MotionEasings>;
};

/** The motion timings the library ships, in documentation order. */
export const motionLevels = [
  "none",
  "step",
  "fast",
  "normal",
  "slow",
  "pulse",
] as const;

/** A duration level. `ease` is not a duration. */
export type MotionLevel = (typeof motionLevels)[number];

/** Default motion. */
export const motion: Motion = {
  none: 0,
  step: 120,
  fast: 160,
  normal: 200,
  slow: 320,
  pulse: 700,
  ease: {
    standard: "easeInOut",
    enter: "easeOut",
    exit: "easeIn",
    linear: "linear",
  },
};

/**
 * The opacity the dim frame of a pulse paints at — a skeleton's second step.
 *
 * `Skeleton` alternates between the role and this fraction of it, so the role is
 * painted through an alpha for half of every cycle. The contrast contract
 * composites it at this value (`skeletonPulsePairs`), and the primitive reads
 * the same constant, so the number has one owner. It is a runtime constant, not
 * a theme token: every theme pulses the same way.
 */
export const skeletonPulseOpacity = 0.6;

/** A transition for the runtime's `MotionProps.transition`. */
export interface MotionTransition {
  /** Seconds, the unit the runtime takes. */
  readonly duration: number;
  /** The phase's easing. */
  readonly ease: MotionEasing;
}

/**
 * Resolve a motion level and phase to the runtime's transition shape. The
 * duration is converted from the token's milliseconds to the runtime's seconds.
 *
 * @example
 * ```tsx
 * import { getTheme, motionTransition } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 *
 * motionTransition(theme, "normal", "enter"); // { duration: 0.2, ease: "easeOut" }
 * ```
 */
export function motionTransition(
  theme: Theme,
  level: MotionLevel,
  phase: MotionPhase = "standard",
): MotionTransition {
  return {
    duration: theme.motion[level] / 1000,
    ease: theme.motion.ease[phase],
  };
}
