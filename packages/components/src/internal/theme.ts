/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every component reads its colour, spacing, type and elevation roles from
 * here, so a token change lands in one file and no component repeats a raw
 * field lookup. No other file in this package may import `@gpuixui/tokens`
 * (plan 110 §6).
 */

import type { StyleDesc } from "@gpuix/react";
import type { BoxShadow, Elevation, Theme } from "@gpuixui/tokens";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export {
  controlHeight,
  controlPaddingX,
  darkTheme,
  lightTheme,
  textStyle,
} from "@gpuixui/tokens";
export type { Theme } from "@gpuixui/tokens";
export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

/**
 * One elevation level as GPUix's single shadow. `StyleDesc.boxShadow` holds one
 * `BoxShadow`, not a list, so a level that carries several paints its innermost.
 * `undefined` when the level is empty, which leaves the surface flat.
 */
export const elevation = (
  theme: Theme,
  level: keyof Elevation,
): BoxShadow | undefined =>
  Option.getOrUndefined(Arr.head(theme.elevation[level]));

/**
 * The keyboard-focus ring. GPUix has no `outline`, so the ring is a zero-blur
 * shadow spread by the theme's `ring` role and painted outside the border box.
 */
export const focusRing = (theme: Theme): StyleDesc => ({
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 2,
    color: theme.colors.ring,
  },
});

/** An 8-bit alpha suffix, as the two hex digits appended to a colour. */
export type Alpha = "12" | "30" | "4D" | "80";

const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i;

/**
 * Append an alpha channel to a `#RRGGBB` colour. A value the parser does not
 * recognise is returned unchanged, so a token that is not six-digit hex renders
 * solid rather than transparent. Tokens owns an `alpha` helper eventually; this
 * is the package's stand-in until it lands (plan 110 §6).
 */
export const withAlpha = (color: string, alpha: Alpha): string =>
  SIX_DIGIT_HEX.test(color) ? `${color}${alpha}` : color;

/** The four status tones Alert, Badge and Toast share. */
export type Tone = "info" | "success" | "warning" | "danger";

/** The soft fill, readable text and border for one status tone. */
export interface ToneStyle {
  readonly fg: string;
  readonly bg: string;
  readonly border: string;
}

const soft = (color: string): ToneStyle => ({
  bg: withAlpha(color, "12"),
  border: withAlpha(color, "4D"),
  fg: color,
});

/**
 * The soft-fill palette for one tone. `info` borrows the accent pair because
 * tokens ships no `info` role; `warning` uses its darker foreground in light
 * mode, where the light `warning` shade cannot reach readable contrast on the
 * tint (plan 110 §6).
 */
export const tone = (theme: Theme, value: Tone): ToneStyle =>
  Match.value(value).pipe(
    Match.when("info", () => ({
      bg: theme.colors.accent,
      border: withAlpha(theme.colors.accentForeground, "4D"),
      fg: theme.colors.accentForeground,
    })),
    Match.when("success", () => soft(theme.colors.success)),
    Match.when("danger", () => soft(theme.colors.destructive)),
    Match.when("warning", () =>
      soft(
        theme.mode === "light"
          ? theme.colors.warningForeground
          : theme.colors.warning,
      ),
    ),
    Match.exhaustive,
  );
