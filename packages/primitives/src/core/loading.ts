/**
 * Loading feedback: a skeleton, a spinner and an indeterminate bar.
 *
 * The published runtime's `motion` API animates **only** `width`, `height`,
 * `opacity`, `top`, `right`, `bottom`, `left` and `borderRadius` — no rotation,
 * no colour interpolation (plan 020 §1.2) — and `motion` itself is only
 * reachable through the `@gpuix/react` root, which this repository cannot import
 * (plan 020 §3). So every indicator here advances through a **discrete step**
 * driven by a component interval, and the step function — the part that can be
 * wrong — is pure and lives here.
 */

import * as Arr from "effect/Array";
import type { StyleDesc } from "@gpuix/react";
import type { PrimitiveTheme, RadiusStep } from "./theme.js";

/** How many steps a pulse visits before repeating. */
export const PULSE_STEPS = 2;

/** How many steps a spinner or an indeterminate bar visits before repeating. */
export const SPINNER_SEGMENTS = 8;

export interface SkeletonSpec {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly radius?: RadiusStep;
  /** A circle: an avatar placeholder. */
  readonly circle?: boolean;
}

/**
 * A placeholder block.
 *
 * It paints the skeleton role, never the surface it stands in for, so it reads
 * as absence. Height defaults to one line of body text, which is what a
 * one-line placeholder should occupy.
 */
export const skeletonStyle = (
  spec: SkeletonSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: spec.width ?? "100%",
  height: spec.height ?? theme.typography.body.lineHeight,
  flexShrink: 0,
  borderRadius:
    spec.circle === true
      ? theme.radius.full
      : theme.radius[spec.radius ?? "sm"],
  backgroundColor: theme.colors.skeleton,
});

/**
 * The opacity a pulse paints at this step.
 *
 * Two states rather than a sine: the runtime interpolates nothing on its own, so
 * a value between them would only be painted if the component computed it, and
 * the eye reads the alternation as motion.
 */
export const pulseOpacity = (step: number, dim = 0.6, full = 1): number =>
  step % PULSE_STEPS === 0 ? full : dim;

/** How a spinner dot is tinted: the brand, a destructive action, or quiet. */
export const SPINNER_ACCENTS = ["primary", "destructive", "muted"] as const;
export type SpinnerAccent = (typeof SPINNER_ACCENTS)[number];

export interface SpinnerSpec {
  readonly size: number;
  readonly accent: SpinnerAccent;
}

/** One dot of the activity indicator. */
export interface SpinnerDot {
  readonly opacity: number;
  /** Whether this dot is the emphasised one for this step. */
  readonly active: boolean;
}

/**
 * Which dot is lit at a given step, and how the rest fade.
 *
 * The active dot moves one place per step and the trailing dot is brightest, so
 * the row reads as travelling even though nothing rotates.
 */
export const spinnerDots = (
  step: number,
  count = 3,
  segments = SPINNER_SEGMENTS,
): ReadonlyArray<SpinnerDot> => {
  const active = ((step % count) + count) % count;
  return Arr.map(Arr.range(0, count - 1), (index) => ({
    active: index === active,
    opacity: Math.max(0.2, 1 - ((active - index + count) % count) / segments),
  }));
};

const accentColor = (accent: SpinnerAccent, theme: PrimitiveTheme): string =>
  accent === "destructive"
    ? theme.colors.destructive
    : accent === "muted"
      ? theme.colors.mutedForeground
      : theme.colors.primary;

/** One dot of the indicator. The lit dot takes the accent, the rest the muted role. */
export const spinnerDotStyle = (
  spec: SpinnerSpec,
  dot: SpinnerDot,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: spec.size,
  height: spec.size,
  flexShrink: 0,
  borderRadius: theme.radius.full,
  opacity: dot.opacity,
  backgroundColor: dot.active
    ? accentColor(spec.accent, theme)
    : theme.colors.mutedForeground,
});

/**
 * Where the moving segment of an indeterminate bar sits, in pixels.
 *
 * The runtime takes `left`/`right` as **numbers**, not percentages, so the
 * component measures its track with `onLayout` and this function turns the
 * step into an offset inside it. It travels from 0 to `trackWidth - width` and
 * wraps; the phase is the step's position in that cycle.
 *
 * @param step the discrete step the component is on
 * @param trackWidth the measured width of the track, in pixels
 * @param segmentWidth the width of the moving segment, in pixels
 */
export const indeterminateOffset = (
  step: number,
  trackWidth: number,
  segmentWidth: number,
): number => {
  const travel = Math.max(0, trackWidth - segmentWidth);
  const phase =
    ((step % SPINNER_SEGMENTS) + SPINNER_SEGMENTS) % SPINNER_SEGMENTS;
  return Math.round((phase / SPINNER_SEGMENTS) * travel);
};

/** The moving fill of an indeterminate bar, positioned in pixels. */
export const indeterminateFillStyle = (
  offset: number,
  width: number,
  color: string,
  theme: PrimitiveTheme,
): StyleDesc => ({
  position: "absolute",
  left: offset,
  width,
  height: "100%",
  borderRadius: theme.radius.full,
  backgroundColor: color,
});
