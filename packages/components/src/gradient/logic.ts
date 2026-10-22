/**
 * The arithmetic of a two-stop gradient surface that breathes between two ramps.
 *
 * `@gpuix/native@0.11.0` paints exactly one gradient shape — a
 * `LinearGradientBackground`, a CSS angle and **two** stops — and a gradient is a
 * paint value, not a tween target: the runtime interpolates numbers, and a stop
 * is a colour. So a gradient that *moves* is two ramps of the same colours at
 * different angles, crossfaded by the one value the runtime animates natively,
 * `opacity`.
 *
 * This module owns the decisions that arithmetic makes: how an angle wraps into
 * one turn, the exact `LinearGradientBackground` a colour pair paints, whether a
 * shift of a whole turn is a second ramp at all, how long one leg of the breath
 * may run, and which radius a field can paint. The component layers the two
 * ramps and drives the crossfade; nothing here touches the renderer.
 */

import type { LinearGradientBackground } from "@gpuix/react";
import * as Option from "effect/Option";
import { durationOf, paintable } from "../internal/scatter.js";

/** The house angle, in degrees: top-left to bottom-right. */
export const gradientBaseAngle = 135;

/** The house shift between the two ramps: a quarter turn. */
export const gradientBaseShift = 90;

/** The house time for one leg of the breath, in milliseconds. */
export const gradientLegMs = 6_000;

/** The shortest leg worth painting; below it the surface reads as a flicker. */
export const gradientLegFloor = 400;

/** The longest leg, so the surface cannot look frozen. */
export const gradientLegCap = 60_000;

/**
 * An angle wrapped into one turn.
 *
 * CSS angles grow clockwise and a turn is a circle, so `380` and `20` are the
 * same ramp; a caller computing an angle from a pointer or a timer needs the
 * wrap rather than a value the renderer has to normalise itself.
 */
export const oneTurn = (degrees: number): number =>
  ((degrees % 360) + 360) % 360;

/** The base ramp's angle: a finite caller value wrapped, else the house angle. */
export const angleOf = (angle: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(angle, (value) => Number.isFinite(value)),
      oneTurn,
    ),
    () => gradientBaseAngle,
  );

/** The shift between the ramps: a finite caller value wrapped, else a quarter turn. */
export const shiftOf = (shift: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(shift, (value) => Number.isFinite(value)),
      oneTurn,
    ),
    () => gradientBaseShift,
  );

/**
 * Whether a shift paints a second ramp.
 *
 * Zero is the same ramp twice, and a whole turn is the same ramp once more, so
 * neither has anything to crossfade — the field is one still ramp instead of
 * breathing over itself.
 */
export const breathesAtAll = (shift: number): boolean =>
  Number.isFinite(shift) && oneTurn(shift) !== 0;

/** One leg of the breath: a below-floor value falls back to the house leg, the cap clamps. */
export const legOf = (leg: Option.Option<number>): number =>
  durationOf(leg, gradientLegMs, gradientLegFloor, gradientLegCap);

/** A radius the field can paint; a zero, negative or unreadable one is square. */
export const radiusOf = (radius: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(radius, (value) => paintable(value) && value <= 10_000),
    () => 0,
  );

/**
 * The ramp the runtime paints: two stops from `from` at the start to `to` at the
 * end. Two is its whole grammar, so a three-colour ramp is not expressible.
 */
export const rampOf = (
  from: string,
  to: string,
  angle: number,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: oneTurn(angle),
  stops: [
    { color: from, position: 0 },
    { color: to, position: 1 },
  ],
});

/** The same ramp one turn later: the second layer of the breath. */
export const shiftedRampOf = (
  from: string,
  to: string,
  angle: number,
  shift: number,
): LinearGradientBackground => rampOf(from, to, angle + shift);
