import * as Option from "effect/Option";
import { blend } from "@gpuixui/tokens";

export const DISABLED_OPACITY = 0.5;

export const RATING_IDS = {
  probe: "rating-probe",
  readout: "rating-readout",
  empty: "rating-empty",
  full: "rating-full",
  half: "rating-half",
  invalid: "rating-invalid",
  disabled: "rating-disabled",
  interactive: "rating-interactive",
} as const;

export const RATING_STARS = 5;

export const RATING_INITIAL = 0;

export interface RatingState {
  readonly value: number;

  readonly reports: number;

  readonly disabled: number;
}

export const ratingReadout = (state: RatingState): string =>
  `value=${state.value} reports=${state.reports} disabled=${state.disabled}`;

export const valueOf = (readout: string): Option.Option<number> =>
  Option.map(Option.fromNullishOr(/^value=(\S+)/.exec(readout)?.[1]), Number);

export const counterOf = (
  readout: string,
  field: "reports" | "disabled",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

export const RATING_CHECKS = 47;

export const filledInk = (primary: string): string => primary;

export const emptyInk = (mutedForeground: string): string => mutedForeground;

export const invalidInk = (destructive: string): string => destructive;

export const disabledInk = (primary: string, page: string): string =>
  blend(primary, page, DISABLED_OPACITY);

export const STAR_INK_TOLERANCE = 60;

export const rgbOf = (
  hex: string,
): Option.Option<{
  readonly r: number;
  readonly g: number;
  readonly b: number;
}> => {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  return Option.map(Option.fromNullishOr(match), (parsed) => ({
    r: Number.parseInt(parsed[1] ?? "0", 16),
    g: Number.parseInt(parsed[2] ?? "0", 16),
    b: Number.parseInt(parsed[3] ?? "0", 16),
  }));
};

export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);

export const isStarInk = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): boolean => inkDistance(r, g, b, ink) <= STAR_INK_TOLERANCE;

export const halfSplit = (width: number): number => Math.floor(width / 2);
