/**
 * Loading feedback: a skeleton, a spinner and an indeterminate bar.
 *
 * The published runtime's `motion` API animates **only** `width`, `height`,
 * `opacity`, `top`, `right`, `bottom`, `left` and `borderRadius` — no rotation,
 * no colour interpolation (see `docs/gpuix-capabilities.md`) — and `motion` itself is only
 * reachable through the `@gpuix/react` root, which this repository cannot import
 * (see `docs/gpuix-capabilities.md`). So every indicator here advances through a **discrete step**
 * driven by a component interval, and the step function — the part that can be
 * wrong — is pure and lives here.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import type { PrimitiveTheme, RadiusStep } from "./theme.js";

/** How many steps a pulse visits before repeating. */
export const PULSE_STEPS = 2;

/** How many steps an indeterminate bar visits before repeating. */
export const SPINNER_SEGMENTS = 8;

/** How many dots a spinner paints, and therefore the steps it visits before repeating. */
export const SPINNER_DOTS = 3;

/** The dimmest a trail dot paints, as a share of the accent. */
export const SPINNER_FADE_FLOOR = 0.2;

export interface SkeletonSpec {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly radius?: RadiusStep;
  /** A circle: an avatar placeholder. */
  readonly circle?: boolean;
}

/**
 * A side the runtime can paint: any length string, or a positive finite number.
 *
 * A placeholder's side is often a measurement — a collapsed panel's width, a
 * row's height — and a measurement that never arrived is `NaN`, which the
 * runtime paints as no box at all. A skeleton that paints nothing reads as
 * content that finished loading, so an unusable count takes the side's default.
 * A length string is the caller's own expression ("45%") and is left alone.
 */
const paintableSide = (
  side: number | string | undefined,
): number | string | undefined =>
  typeof side === "number" && !(Number.isFinite(side) && side > 0)
    ? undefined
    : side;

/**
 * A skeleton's box.
 *
 * A block defaults to full width and one line of body text. A circle mirrors
 * whichever side was given, so `circle` with only a `width` paints a circle and
 * never an ellipse; with neither side it is one line tall. Two explicit sides
 * are left as the caller wrote them.
 */
export const skeletonSize = (
  spec: SkeletonSpec,
  theme: PrimitiveTheme,
): { readonly width: number | string; readonly height: number | string } => {
  const width = paintableSide(spec.width);
  const height = paintableSide(spec.height);
  if (spec.circle !== true) {
    return {
      width: width ?? "100%",
      height: height ?? theme.typography.body.lineHeight,
    };
  }
  if (width !== undefined && height !== undefined) {
    return { width, height };
  }
  const side = width ?? height ?? theme.typography.body.lineHeight;
  return { width: side, height: side };
};

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
  ...skeletonSize(spec, theme),
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

/**
 * How a spinner dot is tinted: the brand, a destructive action, quiet — or, on
 * a filled control, the colour that sits on that fill.
 *
 * The `on-*` accents exist because an indicator drawn **inside** a filled
 * button must paint that fill's on-colour: a brand spinner on a brand button is
 * 1.00:1, which is the one place a busy indicator would disappear. A disabled
 * filled action paints the neutral pair instead of its fill, so its spinner
 * takes `on-disabled` — `disabledForeground` — for the same reason.
 */
export const SPINNER_ACCENTS = [
  "primary",
  "destructive",
  "muted",
  "on-primary",
  "on-secondary",
  "on-destructive",
  "on-accent",
  "on-disabled",
] as const;
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
 * The active dot moves one place per step and the trail fades toward
 * {@link SPINNER_FADE_FLOOR} at the farthest dot, so the row reads as travelling
 * even though nothing rotates. The fade spans the row (`count - 1` places)
 * rather than a fixed step budget: with three dots, dividing by the bar's eight
 * segments left every trail dot brighter than 0.7 and the lit index stepping
 * backwards once per timer cycle.
 */
export const spinnerDots = (
  step: number,
  count = SPINNER_DOTS,
): ReadonlyArray<SpinnerDot> => {
  const dots = Math.max(
    1,
    Math.trunc(Number.isFinite(count) ? count : SPINNER_DOTS),
  );
  const active = ((step % dots) + dots) % dots;
  const span = Math.max(1, dots - 1);
  return Arr.map(Arr.range(0, dots - 1), (index) => ({
    active: index === active,
    opacity: Math.max(
      SPINNER_FADE_FLOOR,
      1 - ((active - index + dots) % dots) / span,
    ),
  }));
};

/** The role each accent paints, one entry per accent. */
const ACCENT_COLOR: Readonly<
  Record<SpinnerAccent, (theme: PrimitiveTheme) => string>
> = {
  primary: (theme) => theme.colors.primary,
  destructive: (theme) => theme.colors.destructive,
  muted: (theme) => theme.colors.mutedForeground,
  "on-primary": (theme) => theme.colors.primaryForeground,
  "on-secondary": (theme) => theme.colors.secondaryForeground,
  "on-destructive": (theme) => theme.colors.destructiveForeground,
  "on-accent": (theme) => theme.colors.accentForeground,
  "on-disabled": (theme) => theme.colors.disabledForeground,
};

const accentColor = (accent: SpinnerAccent, theme: PrimitiveTheme): string =>
  ACCENT_COLOR[accent](theme);

/**
 * One dot of the indicator.
 *
 * Every dot paints the accent; the trail fades through **opacity** rather than
 * turning grey, so a spinner inside a filled control keeps the fill's on-colour
 * on its whole row instead of painting a muted dot on a brand fill.
 */
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
  backgroundColor: accentColor(spec.accent, theme),
});

/**
 * Where the moving segment of an indeterminate bar starts, as a percentage of
 * the track.
 *
 * This resolver never measures the track, so its width is unknown; a
 * percentage `width` is a length the runtime accepts. The bar is a row
 * whose first child is an empty spacer of this width and whose second is the
 * segment, so varying the spacer moves the segment without measuring anything.
 *
 * @param step the discrete step the component is on
 * @param segment the segment's width as a percentage of the track
 */
export const indeterminateOffset = (step: number, segment = 40): number => {
  const travel = Math.max(0, 100 - segment);
  const phase =
    ((step % SPINNER_SEGMENTS) + SPINNER_SEGMENTS) % SPINNER_SEGMENTS;
  return (phase / SPINNER_SEGMENTS) * travel;
};

/**
 * Whether a progress bar animates.
 *
 * A bar with a value draws a fixed fill, so the timer behind the moving
 * segment would wake the tree every interval for a segment it never paints.
 * Only a bar without a value — an indeterminate one — has something to move.
 */
export const progressAnimates = (value: Option.Option<number>): boolean =>
  Option.isNone(value);

/** The moving segment of an indeterminate bar: a percentage-width fill. */
export const indeterminateFillStyle = (
  segment: number,
  color: string,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: `${segment}%`,
  height: "100%",
  borderRadius: theme.radius.full,
  backgroundColor: color,
});

/** The empty spacer that pushes the segment to its offset. */
export const indeterminateLeadStyle = (offset: number): StyleDesc => ({
  width: `${offset}%`,
  flexShrink: 0,
});
