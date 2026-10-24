/**
 * The two labels a theme's values are read through: its mode and its contrast
 * variant.
 *
 * They live in their own module because the readers are called from the table
 * seams (`seriesColors`, `syntaxColors`, `themeContrastOf`) as well as from
 * `theme.ts`, and `theme.ts` imports the type scale: keeping the readers here
 * means the scale, the platform table and the syntax palette no longer have to
 * reach `theme.ts` to read a label. That reach was a runtime cycle —
 * `typography` → `platforms` → `syntax` → `theme` → `typography` — so importing
 * `typography` (or the platform table) before `theme` built the shipped themes
 * from an uninitialised binding: `lightTheme.typography` was `undefined`, and
 * `missingTokens(lightTheme)` refused the library's own theme for a lost group.
 * `theme.ts` re-exports every name below, so the package's surface is unchanged.
 */

import { themeColors, type ColourSource } from "./color.js";
import { pageMode } from "./luminance.js";

/**
 * Theme modes the library ships, in documentation order. `ThemeMode` derives
 * from this list, so a new mode must also gain a value in `themes` and
 * `highContrastThemes`.
 */
export const themeModes = ["light", "dark"] as const;

/** Theme modes the library ships. */
export type ThemeMode = (typeof themeModes)[number];

/**
 * Contrast variants the library ships, in documentation order. `ThemeContrast`
 * derives from this list, so a new variant must also gain a set of floors and a
 * theme per mode.
 */
export const themeContrasts = ["default", "high"] as const;

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = (typeof themeContrasts)[number];

/**
 * Narrow unknown input — a stored preference — to a theme mode. This is not a
 * theme decoder: it checks the axis only, and a consumer iterates
 * {@link themeModes} instead of retyping the modes.
 */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

/**
 * Narrow unknown input to a contrast variant. Not a theme decoder, and a
 * consumer iterates {@link themeContrasts} rather than retyping them.
 */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);

/**
 * The contrast variant a theme's **values** are read as.
 *
 * The variant decides which floors every pair is measured against
 * (`contrastFloorsFor`) and which palette a native host is handed
 * (`syntaxColors`, `seriesColors`), so an unrecognised one is not a cosmetic
 * detail: read as the default it **downgrades an accessibility claim**, because
 * a high-contrast theme stored with an upper-cased `HIGH` was measured against
 * the AA floors, highlighted with the default palette, and `auditTheme(...)
 * .passed` said yes. A value this release does not ship is therefore read as the
 * **strict** variant — a theme that cannot say which floors it was designed for
 * is held to the stronger ones, and its report names the pair that misses — while
 * an absent or `null` variant is the "declares nothing" a hand-built theme is
 * and reads as `default`.
 *
 * Narrow a stored preference with {@link isThemeContrast} where the caller can
 * tell the reader which variant it substituted; this is the read a paint or
 * report seam makes, where there is no one to tell.
 *
 * @example
 * ```ts
 * import { highContrastDarkTheme, lightTheme, themeContrastOf } from "@gpuixui/tokens";
 *
 * themeContrastOf(highContrastDarkTheme); // "high"
 * themeContrastOf({ ...lightTheme, contrast: "HIGH" }); // "high" — the strict variant
 * ```
 */
export const themeContrastOf = (theme: {
  readonly contrast?: unknown;
}): ThemeContrast => {
  const stated = theme.contrast;
  if (stated === undefined || stated === null) {
    return "default";
  }
  return isThemeContrast(stated) ? stated : "high";
};

/**
 * The mode a theme's **values** are read as.
 *
 * The mode decides which categorical and syntax tables a painter is handed
 * (`seriesColors`, `syntaxColors`), the appearance a native text host is given
 * (`nativeTextTheme`), and which of a platform style's two palettes `applyStyle`
 * wears. A theme is documented as storable, so a value this release does not
 * ship reaches those seams — an upper-cased `Dark`, a release's old name, a
 * theme another app wrote. Read as light it handed a dark palette the **light**
 * tables: a code block highlighted for a light canvas, a chart drawn in the
 * light categorical scale, and a platform style that applied its radii and
 * families but not its colours.
 *
 * A value this release does not ship — or none at all — is therefore read from
 * the page the theme carries: a fill closer to white is a light theme's page,
 * because that theme's ink is designed to read on it. That is the one question
 * the palette can answer without trusting the label, and it is the rule
 * {@link paletteMode} already follows for a system palette. A page no colour
 * grammar reads keeps `light`, the mode `getTheme` starts from.
 *
 * Narrow a stored preference with {@link isThemeMode} where the caller can tell
 * the reader which mode it substituted; this is the read a paint or report seam
 * makes, where there is no one to tell.
 *
 * @example
 * ```ts
 * import { darkTheme, lightTheme, themeModeOf } from "@gpuixui/tokens";
 *
 * themeModeOf(darkTheme); // "dark"
 * themeModeOf({ ...darkTheme, mode: "Dark" }); // "dark" — read from its page
 * ```
 */
export const themeModeOf = (
  theme: ColourSource & { readonly mode?: unknown },
): ThemeMode => {
  const stated = theme.mode;
  if (isThemeMode(stated)) {
    return stated;
  }
  return pageMode(themeColors(theme).background) ?? "light";
};
