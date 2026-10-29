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
import { motionLevels } from "@gpuixui/motion/timing";
import { visibleCopy } from "./a11y.js";
import type { PrimitiveTheme, RadiusStep } from "./theme.js";
import { colorRole, radiusStep, radiusValue, typeOf } from "./theme.js";

/** How many steps a pulse visits before repeating. */
export const PULSE_STEPS = 2;

/** How many steps an indeterminate bar visits before repeating. */
export const SPINNER_SEGMENTS = 8;

/**
 * How many ticks a spinner's ring is drawn from.
 *
 * The runtime cannot rotate (see `docs/gpuix-capabilities.md`), so the ring is
 * static and the **lit part of it** steps: one tick is the head, the ticks
 * behind it fade, and the rest of the ring is empty. The count is the ring's
 * resolution — a dozen ticks read as an arc at `md`, and a size the caller gave
 * in raw pixels is still a ring because the geometry is relative to it.
 */
export const SPINNER_RING_TICKS = 12;

/** How many ticks of the ring are lit at once: the head and its fading tail. */
export const SPINNER_ARC_TICKS = 7;

/**
 * The cadence a step indicator ticks at: the house timing's `step` level.
 *
 * A spinner's lit dot and an indeterminate bar's segment both move by advancing
 * a counter on an interval, so the two have to read as one speed when a busy
 * action sits beside a loading bar. The number is `@gpuixui/motion`'s
 * (`motionLevels.step`) rather than a copy of it: the level exists to be moved,
 * and a primitive that wrote the millisecond count here would keep painting the
 * old cadence after it was.
 */
export const STEP_INTERVAL_MS = motionLevels.step;

/**
 * The cadence a skeleton's pulse alternates at.
 *
 * Deliberately **not** a `motionLevels` entry: those time a transition between
 * two states, while a placeholder alternates for as long as it is on screen. A
 * pulse is therefore slower than a step — it breathes rather than ticks — and
 * the value lives beside the pulse maths as its own design constant. A level
 * that ever names this number fails the loading suite until the skeleton adopts
 * it.
 */
export const PULSE_INTERVAL_MS = 700;

/**
 * The dimmest a lit tick paints, as a share of the accent. A tick outside the
 * arc paints nothing at all; this floor is the tail's far end.
 */
export const SPINNER_FADE_FLOOR = 0.2;

export interface SkeletonSpec {
  readonly width?: number | string;
  readonly height?: number | string;
  /** A corner step. A stored name this release does not carry keeps `sm`. */
  readonly radius?: RadiusStep;
  /** A circle: an avatar placeholder. */
  readonly circle?: boolean;
}

/**
 * A side the runtime can paint: a length string that says something, or a
 * positive finite number.
 *
 * A placeholder's side is often a measurement — a collapsed panel's width, a
 * row's height — and a measurement that never arrived is `NaN`, which the
 * runtime paints as no box at all. A skeleton that paints nothing reads as
 * content that finished loading, so an unusable count takes the side's default.
 * A length string is the caller's own expression ("45%") and is left exactly as
 * written, spacing included; a **blank** one is no expression at all — a record
 * that carried `""` or a run of spaces for a width reached the style as a
 * dimension the runtime cannot parse, which is the same invisible box.
 */
const paintableSide = (
  side: number | string | undefined,
): number | string | undefined =>
  typeof side === "number"
    ? Number.isFinite(side) && side > 0
      ? side
      : undefined
    : visibleCopy(side);

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
  const line = typeOf(theme, "body").lineHeight;
  if (spec.circle !== true) {
    return {
      width: width ?? "100%",
      height: height ?? line,
    };
  }
  if (width !== undefined && height !== undefined) {
    return { width, height };
  }
  const side = width ?? height ?? line;
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
      ? radiusValue(theme, "full")
      : radiusValue(theme, radiusStep(spec.radius) ?? "sm"),
  backgroundColor: colorRole(theme, "skeleton"),
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

/** The accents as a list a stored value can be checked against. */
const ACCENT_NAMES: ReadonlyArray<string> = SPINNER_ACCENTS;

/** Whether a value names a spinner accent. */
export const isSpinnerAccent = (value: unknown): value is SpinnerAccent =>
  typeof value === "string" && Arr.contains(ACCENT_NAMES, value);

/**
 * The accent a spinner paints with: the name, or the documented `primary`.
 *
 * Indexed raw, an unknown name answered no colour class (a loader that painted
 * nothing) and the core resolver called `ACCENT_COLOR[name]` as a function —
 * a `TypeError` where an indicator should be.
 */
export const spinnerAccentOf = (value: unknown): SpinnerAccent =>
  isSpinnerAccent(value) ? value : "primary";

export interface SpinnerSpec {
  readonly size: number;
  readonly accent: SpinnerAccent;
}

/** One tick of the ring: where it sits and how bright it is this frame. */
export interface SpinnerTick {
  readonly index: number;
  /** The head of the arc: the one tick that is fully lit this frame. */
  readonly active: boolean;
  readonly opacity: number;
  /** The tick's painted offset from the ring's top-left corner. */
  readonly x: number;
  readonly y: number;
  /** The tick's side, shared by the whole ring. */
  readonly side: number;
}

/**
 * The ring at a given step.
 *
 * Each tick is placed on a circle by its own angle — no `transform`, which the
 * runtime does not publish — and the lit head advances one tick per step. The
 * angular distance from the head decides the tick's brightness: the head is
 * opaque, the {@link SPINNER_ARC_TICKS} behind it fade to
 * {@link SPINNER_FADE_FLOOR}, and the rest of the ring is empty. That gap is
 * what makes a static ring read as a turning arc.
 *
 * A size that cannot be painted (zero, negative, `NaN`) falls back to one icon
 * step, because a ring that paints nothing reads as a finished operation. The
 * tick count and arc length are clamped the same way, so a caller cannot ask
 * for an empty ring.
 */
export const spinnerTicks = (
  step: number,
  size: number,
  count = SPINNER_RING_TICKS,
  arc = SPINNER_ARC_TICKS,
): ReadonlyArray<SpinnerTick> => {
  const ring = Math.max(
    2,
    Math.trunc(Number.isFinite(count) ? count : SPINNER_RING_TICKS),
  );
  const lit = Math.min(
    ring,
    Math.max(1, Math.trunc(Number.isFinite(arc) ? arc : SPINNER_ARC_TICKS)),
  );
  const side = Number.isFinite(size) && size > 0 ? size : 16;
  const tick = Math.max(1.5, side / 6);
  const radius = (side - tick) / 2;
  const head = ((Math.trunc(step) % ring) + ring) % ring;
  return Arr.map(Arr.range(0, ring - 1), (index) => {
    const distance = (head - index + ring) % ring;
    const angle = -Math.PI / 2 + (index / ring) * Math.PI * 2;
    const centre = side / 2;
    // Clamp the two tangents: the top and left ticks sit exactly on the box
    // edge, and floating point puts them a fraction of a pixel outside it.
    const edge = side - tick;
    const x = Math.min(
      edge,
      Math.max(0, centre + radius * Math.cos(angle) - tick / 2),
    );
    const y = Math.min(
      edge,
      Math.max(0, centre + radius * Math.sin(angle) - tick / 2),
    );
    const opacity =
      distance >= lit
        ? 0
        : distance === lit - 1
          ? SPINNER_FADE_FLOOR
          : 1 - (distance / Math.max(1, lit - 1)) * (1 - SPINNER_FADE_FLOOR);
    return {
      index,
      active: distance === 0,
      opacity,
      side: tick,
      x,
      y,
    };
  });
};

/** The role each accent paints, one entry per accent. */
const ACCENT_COLOR: Readonly<
  Record<SpinnerAccent, (theme: PrimitiveTheme) => string | undefined>
> = {
  primary: (theme) => colorRole(theme, "primary"),
  destructive: (theme) => colorRole(theme, "destructive"),
  muted: (theme) => colorRole(theme, "mutedForeground"),
  "on-primary": (theme) => colorRole(theme, "primaryForeground"),
  "on-secondary": (theme) => colorRole(theme, "secondaryForeground"),
  "on-destructive": (theme) => colorRole(theme, "destructiveForeground"),
  "on-accent": (theme) => colorRole(theme, "accentForeground"),
  "on-disabled": (theme) => colorRole(theme, "disabledForeground"),
};

const accentColor = (
  accent: SpinnerAccent,
  theme: PrimitiveTheme,
): string | undefined => ACCENT_COLOR[spinnerAccentOf(accent)](theme);

/**
 * One tick of the ring.
 *
 * Every tick paints the accent; the tail fades through **opacity** rather than
 * turning grey, so a spinner inside a filled control keeps the fill's on-colour
 * on its whole arc instead of painting a muted tick on a brand fill. The box is
 * placed by `left`/`top` from the ring's own arithmetic — the runtime has no
 * `transform` to rotate a single tick into place.
 */
export const spinnerTickStyle = (
  spec: SpinnerSpec,
  tick: SpinnerTick,
  theme: PrimitiveTheme,
): StyleDesc => ({
  position: "absolute",
  left: tick.x,
  top: tick.y,
  width: tick.side,
  height: tick.side,
  flexShrink: 0,
  borderRadius: radiusValue(theme, "full"),
  opacity: tick.opacity,
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
  borderRadius: radiusValue(theme, "full"),
  backgroundColor: color,
});

/** The empty spacer that pushes the segment to its offset. */
export const indeterminateLeadStyle = (offset: number): StyleDesc => ({
  width: `${offset}%`,
  flexShrink: 0,
});
