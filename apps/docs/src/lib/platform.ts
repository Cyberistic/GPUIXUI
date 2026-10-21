import {
  applyStyle,
  platformTheme,
  platformTypes,
  retroNames,
  retroStyles,
  themes,
  type PlatformName,
  type RetroName,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The platform a preview shows.
 *
 * The platform is a library decision, not a docs style: the switch resolves
 * `platformTheme` from `@gpuixui/tokens`, so a preview reads the families (and,
 * as the token platform styles land, the shape) the library names rather than a
 * style sheet written for the browser.
 */

/** The query parameter that carries the platform on every docs URL. */
export const platformParam = "platform";

/** The platforms the switch offers, in the order it shows them. */
export const platformOrder = [
  "darwin",
  "linux",
  "win32",
  "default",
] as const satisfies readonly PlatformName[];

/** The label the library gives a platform. */
export const platformLabel = (platform: PlatformName): string =>
  platformTypes[platform].label;

/**
 * Parse a raw query value. A value the library does not name is rejected
 * rather than guessed, so a mistyped URL falls back to the remembered or
 * default platform.
 */
export const parsePlatform = (
  raw: string | null | undefined,
): PlatformName | undefined => platformOrder.find((option) => option === raw);

/** Read the platform out of a query string (`?platform=win32`). */
export const platformFromSearch = (search: string): PlatformName | undefined =>
  parsePlatform(new URLSearchParams(search).get(platformParam));

/** The query string a platform produces (`?platform=win32`). */
export const platformSearch = (platform: PlatformName): string =>
  `?${platformParam}=${platform}`;

/**
 * The authored look a preview paints, or `native` for the platform's own style.
 *
 * A look is not a platform: `platformNames` is the persisted key for the
 * operating systems an application runs on, and `luna`/`aero` are styles of the
 * same shape (`retroStyles`). Offering them here is the extension mechanism in
 * practice, not a fifth platform — the mission's toggle stays macOS · Linux ·
 * Windows · Default.
 */
export type LookName = "native" | RetroName;

/** The query parameter that carries a look. */
export const lookParam = "look";

/** The looks the switch offers, in order: the platform's own style first. */
export const lookOrder = [
  "native",
  ...retroNames,
] as const satisfies readonly LookName[];

/** The label a look shows: `Platform` for the native style, the style's own name otherwise. */
export const lookLabel = (look: LookName): string =>
  look === "native" ? "Platform" : retroStyles[look].label;

/** Parse a raw look. A name the library does not ship is rejected, not guessed. */
export const parseLook = (
  raw: string | null | undefined,
): LookName | undefined => lookOrder.find((look) => look === raw);

/** Read a look out of a query string (`?look=luna`). */
export const lookFromSearch = (search: string): LookName | undefined =>
  parseLook(new URLSearchParams(search).get(lookParam));

/** The query value a look writes (`luna`), or nothing for the platform style. */
export const lookSearch = (look: LookName): string => look;

/**
 * The theme a preview shows: the library's platform variant over one of its
 * built-in modes, then the authored look over that when one is chosen.
 *
 * `applyStyle` keeps the base's contrast: a high-contrast base takes a look's
 * families, radii and density but keeps its own palette, so the look cannot
 * undo the floors the base was chosen for.
 */
export const resolvePlatformTheme = (
  platform: PlatformName,
  mode: ThemeMode = "dark",
  look: LookName = "native",
): Theme => {
  const base = platformTheme(themes[mode], platform);
  return look === "native" ? base : applyStyle(base, retroStyles[look]);
};

/**
 * The theme editor's two bases: the selected platform style (and authored look)
 * in each mode. The editor pins only what a reader changes, so a switch of the
 * platform re-bases the preview while the edits stay — the same
 * `extendTheme(platformStyle, edits)` a consumer writes by hand.
 */
export const platformThemes = (
  platform: PlatformName,
  look: LookName = "native",
): Readonly<Record<ThemeMode, Theme>> => ({
  light: resolvePlatformTheme(platform, "light", look),
  dark: resolvePlatformTheme(platform, "dark", look),
});
