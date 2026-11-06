import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import { motionLevels } from "@gpuixui/motion/timing";
import { visibleCopy } from "./a11y.js";
import type { PrimitiveTheme, RadiusStep } from "./theme.js";
import { colorRole, radiusStep, radiusValue, typeOf } from "./theme.js";

export const PULSE_STEPS = 2;

export const SPINNER_SEGMENTS = 8;

export const SPINNER_RING_TICKS = 12;

export const SPINNER_ARC_TICKS = 7;

export const STEP_INTERVAL_MS = motionLevels.step;

export const PULSE_INTERVAL_MS = 700;

export const SPINNER_FADE_FLOOR = 0.2;

export interface SkeletonSpec {
  readonly width?: number | string;
  readonly height?: number | string;

  readonly radius?: RadiusStep;

  readonly circle?: boolean;
}

const paintableSide = (
  side: number | string | undefined,
): number | string | undefined =>
  typeof side === "number"
    ? Number.isFinite(side) && side > 0
      ? side
      : undefined
    : visibleCopy(side);

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

export const pulseOpacity = (step: number, dim = 0.6, full = 1): number =>
  step % PULSE_STEPS === 0 ? full : dim;

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

const ACCENT_NAMES: ReadonlyArray<string> = SPINNER_ACCENTS;

export const isSpinnerAccent = (value: unknown): value is SpinnerAccent =>
  typeof value === "string" && Arr.contains(ACCENT_NAMES, value);

export const spinnerAccentOf = (value: unknown): SpinnerAccent =>
  isSpinnerAccent(value) ? value : "primary";

export interface SpinnerSpec {
  readonly size: number;
  readonly accent: SpinnerAccent;
}

export interface SpinnerTick {
  readonly index: number;

  readonly active: boolean;
  readonly opacity: number;

  readonly x: number;
  readonly y: number;

  readonly side: number;
}

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

export const indeterminateOffset = (step: number, segment = 40): number => {
  const travel = Math.max(0, 100 - segment);
  const phase =
    ((step % SPINNER_SEGMENTS) + SPINNER_SEGMENTS) % SPINNER_SEGMENTS;
  return (phase / SPINNER_SEGMENTS) * travel;
};

export const progressAnimates = (value: Option.Option<number>): boolean =>
  Option.isNone(value);

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

export const indeterminateLeadStyle = (offset: number): StyleDesc => ({
  width: `${offset}%`,
  flexShrink: 0,
});
