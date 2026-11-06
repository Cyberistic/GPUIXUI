import type { LinearGradientBackground } from "@gpuix/react";
import * as Option from "effect/Option";
import { durationOf, paintable } from "../internal/scatter.js";

export const gradientBaseAngle = 135;

export const gradientBaseShift = 90;

export const gradientLegMs = 6_000;

export const gradientLegFloor = 400;

export const gradientLegCap = 60_000;

export const oneTurn = (degrees: number): number =>
  ((degrees % 360) + 360) % 360;

export const angleOf = (angle: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(angle, (value) => Number.isFinite(value)),
      oneTurn,
    ),
    () => gradientBaseAngle,
  );

export const shiftOf = (shift: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(shift, (value) => Number.isFinite(value)),
      oneTurn,
    ),
    () => gradientBaseShift,
  );

export const breathesAtAll = (shift: number): boolean =>
  Number.isFinite(shift) && oneTurn(shift) !== 0;

export const legOf = (leg: Option.Option<number>): number =>
  durationOf(leg, gradientLegMs, gradientLegFloor, gradientLegCap);

export const radiusOf = (radius: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(radius, (value) => paintable(value) && value <= 10_000),
    () => 0,
  );

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

export const shiftedRampOf = (
  from: string,
  to: string,
  angle: number,
  shift: number,
): LinearGradientBackground => rampOf(from, to, angle + shift);
