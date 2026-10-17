import {
  extendTheme,
  platformTheme,
  type PlatformName,
  type Theme,
  type ThemeMode,
  themes,
} from "./index.js";

/**
 * Resolve the built-in theme for a mode and a platform. A native build and the
 * docs platform toggle both call this once per render; `platformTheme` keeps the
 * base theme untouched, so it is safe to call on every render.
 */
export const resolvePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme => platformTheme(themes[mode], platform);

/**
 * A platform style is an ordinary theme, so a consumer that wants platform-sized
 * controls layers that on top instead of asking the library for another API.
 */
export const resolveDensePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme =>
  extendTheme(resolvePlatformTheme(mode, platform), { density: "compact" });
