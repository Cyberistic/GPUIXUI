import {
  extendTheme,
  platformStyles,
  platformTheme,
  type PlatformName,
  type Theme,
  type ThemeMode,
  themes,
} from "./index.js";

export const resolvePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme => platformTheme(themes[mode], platform);

export const resolveDensePlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme =>
  extendTheme(resolvePlatformTheme(mode, platform), { density: "compact" });

export const resolveHouseTheme = (mode: ThemeMode): Theme =>
  extendTheme(platformTheme(themes[mode], "win32"), {
    name: "House",
    colors: {
      primary: mode === "dark" ? "#B49CFF" : "#6A45F0",
      primaryForeground: mode === "dark" ? "#1C1547" : "#FFFFFF",

      ring: mode === "dark" ? "#9B8CFF" : "#6A45F0",
      ...(mode === "dark"
        ? {
            accent: "#382C72",
            accentForeground: "#D5CBFF",
            selected: "#3E317E",
            selectedForeground: "#DDD3FF",
            selection: "#8A6EFF3D",
          }
        : {
            accent: "#E5DDFF",
            accentForeground: "#3E2E9E",

            selected: "#D8CDFF",
            selectedForeground: "#372680",
            selection: "#6A45F03D",
          }),
    },

    radius: { md: 6, lg: 10, xl: 12 },
  });

export const platformAccent = (
  platform: PlatformName,
  mode: ThemeMode,
): string =>
  platformStyles[platform].colors[mode].primary ?? themes[mode].colors.primary;

export const resolveSwitchTheme = (mode: ThemeMode): Theme =>
  extendTheme(platformTheme(themes[mode], "darwin"), {
    switch: {
      on: mode === "dark" ? "#4ADE80" : "#16A34A",
      off: mode === "dark" ? "#3B3B40" : "#DCDCE1",
      knob: "#FFFFFF",
    },
  });
