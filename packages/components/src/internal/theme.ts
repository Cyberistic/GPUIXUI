/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every component reads its colour, spacing, type and elevation roles from
 * here, so a token change lands in one file and no component repeats a raw
 * field lookup. No other file in this package may import `@gpuixui/tokens`
 * (plan 110 §6).
 *
 * The seam is deliberately thin: `alpha`, `focusRing`, `elevationShadow` and
 * `statusTone` are the token package's own helpers (plans 014, 017 and 018).
 * The only knowledge kept here is the component-level `danger` name, which the
 * token palette calls `destructive`.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  alpha,
  controlHeight,
  controlPaddingX,
  darkTheme,
  elevationShadow,
  focusRing,
  lightTheme,
  statusTone,
  textStyle,
  type StatusTone,
  type Theme,
} from "@gpuixui/tokens";

export {
  alpha,
  controlHeight,
  controlPaddingX,
  darkTheme,
  elevationShadow,
  focusRing,
  lightTheme,
  statusTone,
  textStyle,
};
export type { StatusTone, Theme };
export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

/** The four status tones Alert, Badge and Toast expose. */
export type Tone = "info" | "success" | "warning" | "danger";

/** The soft fill, readable text and border for one status tone. */
export interface ToneStyle {
  readonly fg: string;
  readonly bg: string;
  readonly border: string;
}

/** The component tone's name for the token palette's `destructive` role. */
const TOKEN_TONE: Readonly<Record<Tone, StatusTone>> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

/** One tone's soft-fill palette, read from the token roles. */
export const tone = (theme: Theme, value: Tone): ToneStyle => {
  const { background, border, foreground } = statusTone(
    theme,
    TOKEN_TONE[value],
  );
  return { bg: background, border, fg: foreground };
};

/**
 * One tone as a whole surface: soft fill, tone text and a tinted border. Badge
 * and Alert share it so the two agree on what "warning" looks like.
 */
export const toneSurface = (theme: Theme, value: Tone): StyleDesc => {
  const { bg, border, fg } = tone(theme, value);
  return {
    backgroundColor: bg,
    color: fg,
    borderWidth: theme.borderWidth.thin,
    borderColor: border,
  };
};
