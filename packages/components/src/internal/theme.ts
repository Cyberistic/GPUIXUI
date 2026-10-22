/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every component reads its colour, spacing, type and elevation roles from
 * here, so a token change lands in one file and no component repeats a raw
 * field lookup. No other file in this package may import `@gpuixui/tokens`
 * (plan 110 §6).
 *
 * The seam is deliberately thin: `alpha`, `focusRing`, `elevationShadow`,
 * `statusTone`, `disabledAction` and `nativeTextTheme` are the token package's
 * own helpers (plans 014, 017, 018 and the native-host mapping in
 * `docs/tokens.md`).
 * The only knowledge kept here is the component-level `danger` name, which the
 * token palette calls `destructive`.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  alpha,
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
  focusRing,
  keyboardFocusRing,
  lightTheme,
  nativeTextTheme,
  statusTone,
  targetSize,
  textStyle,
  type BoxShadow,
  type ElevationLevel,
  type NativeTextFill,
  type PlatformName,
  type StatusTone,
  type TextRole,
  type Theme,
  type ThemeColors,
} from "@gpuixui/tokens";

export {
  alpha,
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
  focusRing,
  keyboardFocusRing,
  lightTheme,
  nativeTextTheme,
  statusTone,
  targetSize,
  textStyle,
};
export type {
  BoxShadow,
  ElevationLevel,
  NativeTextFill,
  PlatformName,
  StatusTone,
  TextRole,
  Theme,
};
export { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

/**
 * The focus ring every interactive part declares **at rest**.
 *
 * `@gpuix/native@0.11.0` paints a `focusVisible` outline only for keyboard
 * focus, so a part no longer tracks focus to draw a ring: it states the ring as
 * a resting style and the runtime decides whether a press or a Tab shows it. The
 * outline takes no layout space, so measured geometry does not change while a
 * control holds focus. `invalid` swaps the line to `destructive`; the rule
 * itself is `@gpuixui/tokens`' `controlFocusRing`.
 */
export const keyboardRing = (theme: Theme, invalid = false): StyleDesc =>
  controlFocusRing(theme, { invalid }) ?? {};

/** What a control's focus cue depends on besides the theme. */
export interface ControlRingState {
  /** The control cannot act: disabling it does not move the runtime's focus. */
  readonly disabled?: boolean;
  /** The control's edge and cue take the destructive role. */
  readonly invalid?: boolean;
}

/**
 * The ring a focusable control declares: none while it cannot act.
 *
 * A control disabled while it holds focus keeps that focus — the runtime has no
 * "blur on disable" — so a ring declared unconditionally would stay painted on
 * a control that refuses every key. The rule is `@gpuixui/tokens`'
 * `controlFocusRing`; this wrapper is the components' `StyleDesc` spelling of
 * it, so a call site never branches on the state.
 */
export const controlRing = (
  theme: Theme,
  state: ControlRingState = {},
): StyleDesc => controlFocusRing(theme, state) ?? {};

/**
 * The wash behind text a reader selects.
 *
 * `@gpuix/native@0.11.0` defaults `selectionColor` to the theme's accent at 35%,
 * a colour no token contract measures. Every selectable host states the theme's
 * own `selection` role instead — the one `selectionFailures` holds to a
 * visibility and a legibility floor. The property inherits, so one declaration
 * covers the host's subtree.
 */
export const selectionWash = (theme: Theme): StyleDesc => ({
  selectionColor: theme.colors.selection,
});

/**
 * A text-entry host keeps its own value readable while another control holds
 * keyboard focus.
 *
 * The runtime dims every other focusable element to
 * `keyboardFocusDimOpacity` (40%) as a "where can Tab go" cue. On a field that
 * composites the value and the placeholder into the field's own fill, so the
 * reader's own text fades while they read it. Every field host declares
 * `keyboardFocusDim: false` at rest, matching `@gpuixui/primitives`' rule; a
 * caller's `style` merges last and can put the cue back. The measurement is
 * `keyboardDimFailures` in `@gpuixui/tokens`.
 */
export const keepContent: StyleDesc = { keyboardFocusDim: false };

/**
 * The fade a control with no fill of its own wears while it is disabled.
 *
 * `@gpuixui/tokens`' `disabledOpacity` is a design constant rather than a theme
 * group, because every shipped recipe paints this one share and a brand that
 * lowered it would make the library's own disabled state disappear. It is the
 * share `disabledFadeFailures` composites, so a part that copies `0.5` here
 * drifts from the measurement the moment the token moves — and one part fades by
 * a share no contract ever named (`TagInputChip` painted 0.6 inside a root that
 * already faded). Every disabled part states its fade through this helper, and
 * `src/disabled-fade.test.ts` holds the sources to it.
 *
 * A control that owns a fill paints the measured `disabled`/`disabledForeground`
 * pair instead ({@link disabledAction}); a fade is the mechanism for a control
 * with no fill to collapse into.
 */
export const disabledFade = (
  disabled: boolean,
): { readonly opacity: number } | undefined =>
  disabled ? { opacity: disabledOpacity } : undefined;

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

/** The soft surface each component tone paints, as a token role name. */
const softRoles: Readonly<Record<Tone, keyof ThemeColors>> = {
  info: "infoSoft",
  success: "successSoft",
  warning: "warningSoft",
  danger: "destructiveSoft",
};

/**
 * The colour brand-coloured text paints on one message's own tint.
 *
 * A message's fill is its tone's soft role, which is **not** one of the surfaces
 * the shared `brandText` answers for: measured, that colour is under the text
 * floor on 29 of the 64 tint placements across the shipped styles (macOS dark's
 * brand on `warningSoft` reads 3.43:1). The surface is known here, so the
 * derivation is held to it and the run keeps as much of the brand as the tint
 * allows — the same 2% step toward `foreground`, the theme's own floor.
 */
export const messageLink = (theme: Theme, value: Tone): string =>
  brandTextOn(theme, softRoles[value]);

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
