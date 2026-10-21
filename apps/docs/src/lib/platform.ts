import {
  platformTheme,
  platformTypes,
  themes,
  type PlatformName,
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
 * The theme a platform shows: the library's own platform variant over one of
 * its built-in modes. Today `platformTheme` swaps the type families and names
 * the platform; the colours, scales and density are the base theme's, so the
 * preview follows the library the moment those variants widen.
 */
export const resolvePlatformTheme = (
  platform: PlatformName,
  mode: ThemeMode = "dark",
): Theme => platformTheme(themes[mode], platform);
