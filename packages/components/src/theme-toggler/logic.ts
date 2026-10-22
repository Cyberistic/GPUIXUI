/**
 * What a theme toggler decides: which mode a press requests, which glyph shows
 * that request, and the name the action carries.
 *
 * The control does not own the theme. The application resolves the mode, keeps
 * the preference and re-provides the theme; the toggler only names the next step
 * and reports the press. Keeping the three answers here means the glyph and the
 * name can never disagree with the press — the same rule decides all three.
 */

import { Match } from "effect";
import type { IconName } from "@gpuixui/icons";
import type { Theme } from "../internal/theme.js";

/** The mode the theme resolver reports: the token theme's own discriminant. */
export type ThemeMode = Theme["mode"];

/** The two names a toggler paints, per mode a press would switch to. */
export interface ToggleLabels {
  /** The name while a press would switch to the light theme. */
  readonly light?: string;
  readonly dark?: string;
}

/** The shipped names: each describes the press rather than the current mode. */
export const toggleLabels = {
  light: "Switch to light theme",
  dark: "Switch to dark theme",
} as const;

/** The mode a press requests. */
export const toggledMode = (mode: ThemeMode): ThemeMode =>
  Match.value(mode).pipe(
    Match.when("dark", () => "light" as const),
    Match.when("light", () => "dark" as const),
    Match.exhaustive,
  );

/**
 * The glyph a toggler paints: the mode a press would switch **to**.
 *
 * The icon is the action, not the state — a reader looking at a moon in a dark
 * application has no way to tell whether it describes the theme or the press.
 */
export const toggleIcon = (mode: ThemeMode): IconName =>
  Match.value(toggledMode(mode)).pipe(
    Match.when("dark", () => "moon" as const),
    Match.when("light", () => "sun" as const),
    Match.exhaustive,
  );

/**
 * The name the control carries, which describes what a press does.
 *
 * A caller that ships its own copy passes one or both names; an empty string is
 * a name, not a request for the default, because a caller's translation may
 * legitimately choose silence for one direction.
 */
export const toggleLabel = (
  mode: ThemeMode,
  labels: ToggleLabels = {},
): string =>
  Match.value(toggledMode(mode)).pipe(
    Match.when("light", () => labels.light ?? toggleLabels.light),
    Match.when("dark", () => labels.dark ?? toggleLabels.dark),
    Match.exhaustive,
  );
