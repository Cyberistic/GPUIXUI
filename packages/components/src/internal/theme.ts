import type { StyleDesc } from "@gpuix/react";
import * as Schema from "effect/Schema";
import {
  alpha,
  avatarPixels,
  avatarSize,
  brandTextOn,
  controlFocusRing,
  controlHeight,
  controlPaddingX,
  currentPlatform,
  darkTheme,
  disabledAction,
  disabledOpacity,
  elevationShadow,
  filledHover,
  filledPressed,
  findHighlight,
  focusRing,
  keyboardFocusRing,
  lightTheme,
  nativeTextTheme,
  pointerWash,
  selectionOn,
  statusTone,
  syntaxColors,
  targetSize,
  textStyle,
  type BoxShadow,
  type ElevationLevel,
  type FindHighlightSource,
  type NativeTextFill,
  type PlatformName,
  type PointerWashSurface,
  type StatusTone,
  type SyntaxColors,
  type SyntaxRole,
  type TextRole,
  type Theme,
  type ThemeColors,
} from "@gpuixui/tokens";

export {
  alpha,
  avatarPixels,
  avatarSize,
  controlFocusRing,
  controlHeight,
  controlPaddingX,
  currentPlatform,
  darkTheme,
  disabledAction,
  disabledOpacity,
  elevationShadow,
  filledHover,
  filledPressed,
  findHighlight,
  focusRing,
  keyboardFocusRing,
  lightTheme,
  nativeTextTheme,
  statusTone,
  syntaxColors,
  targetSize,
  textStyle,
};
export type {
  BoxShadow,
  ElevationLevel,
  FindHighlightSource,
  NativeTextFill,
  PlatformName,
  StatusTone,
  SyntaxColors,
  SyntaxRole,
  TextRole,
  Theme,
};
export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

export const keyboardRing = (theme: Theme, invalid = false): StyleDesc =>
  controlFocusRing(theme, { invalid }) ?? {};

export interface ControlRingState {
  readonly disabled?: boolean;

  readonly invalid?: boolean;
}

export const controlRing = (
  theme: Theme,
  state: ControlRingState = {},
): StyleDesc => controlFocusRing(theme, state) ?? {};

export const pressWash = (theme: Theme, replaced: PointerWashSurface): string =>
  pointerWash(theme, "active", replaced) ?? theme.colors.active;

export const selectionWash = (theme: Theme): StyleDesc => ({
  selectionColor: theme.colors.selection,
});

export const keepContent: StyleDesc = { keyboardFocusDim: false };

export const disabledFade = (
  disabled: boolean,
): { readonly opacity: number } | undefined =>
  disabled ? { opacity: disabledOpacity } : undefined;

const Tones = Schema.Literals(["info", "success", "warning", "danger"]);

export type Tone = typeof Tones.Type;

export const toneOf = (value: unknown): Tone =>
  Schema.is(Tones)(value) ? value : "info";

export interface ToneStyle {
  readonly fg: string;
  readonly bg: string;
  readonly border: string;
}

const TOKEN_TONE: Readonly<Record<Tone, StatusTone>> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

export const tone = (theme: Theme, value: Tone): ToneStyle => {
  const { background, border, foreground } = statusTone(
    theme,
    TOKEN_TONE[value],
  );
  return { bg: background, border, fg: foreground };
};

const softRoles: Readonly<Record<Tone, keyof ThemeColors>> = {
  info: "infoSoft",
  success: "successSoft",
  warning: "warningSoft",
  danger: "destructiveSoft",
};

export const messageLink = (theme: Theme, value: Tone): string =>
  brandTextOn(theme, softRoles[value]);

export const messageSelection = (theme: Theme, value: Tone): string =>
  selectionOn(theme, softRoles[value]);

export const toneSurface = (theme: Theme, value: Tone): StyleDesc => {
  const { bg, border, fg } = tone(theme, value);
  return {
    backgroundColor: bg,
    color: fg,
    borderWidth: theme.borderWidth.thin,
    borderColor: border,
  };
};
