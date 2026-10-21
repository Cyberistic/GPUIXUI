import {
  extendTheme,
  platformStyles,
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

/**
 * Take one platform's look and make it your own: read the table, override the
 * values you want to own, and ship the result. Nothing here is opaque — the
 * accent, the corner radius and the control density are the same roles every
 * component reads. A brand that changes a fill owns its on-colour too, or the
 * base theme's foreground was designed for a fill the brand no longer paints —
 * and it owns the accent **family**, because `accent`, `selected` and
 * `selection` are surfaces derived from the accent: leaving them on the
 * platform's blue paints a violet button inside a blue popover and a blue-tinted
 * selection.
 */
export const resolveHouseTheme = (mode: ThemeMode): Theme =>
  extendTheme(platformTheme(themes[mode], "win32"), {
    name: "House",
    colors: {
      primary: "#6A45F0",
      primaryForeground: "#FFFFFF",
      ring: mode === "dark" ? "#8A6EFF" : "#6A45F0",
      ...(mode === "dark"
        ? {
            accent: "#241C4D",
            accentForeground: "#D5CBFF",
            selected: "#2E2366",
            selectedForeground: "#DDD3FF",
            selection: "#8A6EFF3D",
          }
        : {
            accent: "#F2EEFF",
            accentForeground: "#3E2E9E",
            selected: "#ECE6FF",
            selectedForeground: "#372680",
            selection: "#6A45F03D",
          }),
    },
    radius: { md: 6, lg: 10 },
  });

/** The accent each platform style paints a primary action with. */
export const platformAccent = (
  platform: PlatformName,
  mode: ThemeMode,
): string =>
  platformStyles[platform].colors[mode].primary ?? themes[mode].colors.primary;
