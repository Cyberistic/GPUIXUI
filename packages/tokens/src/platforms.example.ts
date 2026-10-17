import {
  extendTheme,
  getPlatformTheme,
  type PlatformName,
  type Theme,
  type ThemeMode,
} from "./index.js";

/**
 * Resolve the shipped theme for a mode and a platform style. A native build and
 * the docs platform toggle both call this once per render; the identity base is
 * never mutated, so it is safe to call on every render.
 */
export const resolvePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme => getPlatformTheme(platform, mode);

/**
 * A platform style is an ordinary theme, so a consumer that wants denser
 * controls layers that on top instead of asking the library for another API.
 */
export const resolveDensePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme =>
  extendTheme(resolvePlatformTheme(mode, platform), { density: "compact" });
