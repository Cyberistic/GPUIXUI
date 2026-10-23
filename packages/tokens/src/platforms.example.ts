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
 * selection. `selected` is a step stronger than `accent`, because a chosen row
 * is repainted `accent` when the pointer arrives.
 */
export const resolveHouseTheme = (mode: ThemeMode): Theme =>
  extendTheme(platformTheme(themes[mode], "win32"), {
    name: "House",
    colors: {
      // A primary is also the role a progress fill or spinner dot paints, so a
      // dark theme needs it light enough to be found on the card; that fill can
      // no longer carry white text, so the dark label is the near-black iris.
      primary: mode === "dark" ? "#B49CFF" : "#6A45F0",
      primaryForeground: mode === "dark" ? "#1C1547" : "#FFFFFF",
      // A ring is drawn on the strip behind the control as well as the surface a
      // control can sit inside, and the dark violet sat at 2.96:1 on this
      // theme's own `selected` wash — a focused row whose focus line was the
      // colour of the row. The lighter violet clears the boundary floor on all
      // five surfaces a control can sit inside.
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
            // The chosen row is repainted `accent` under the pointer, so the
            // two must differ: a step deeper keeps the selection readable and
            // the click visible.
            selected: "#D8CDFF",
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

/**
 * Own the platform's toggle as well as its palette. The switch is a value of the
 * theme, not a fixed control: `darwin` declares Apple's green on, grey off and
 * white knob, and a brand that wants its own toggle replaces the three slots
 * together. A half-declared switch paints the slots it lost with nothing, which
 * is why the override is one value rather than a partial.
 */
export const resolveSwitchTheme = (mode: ThemeMode): Theme =>
  extendTheme(platformTheme(themes[mode], "darwin"), {
    switch: {
      on: mode === "dark" ? "#4ADE80" : "#16A34A",
      off: mode === "dark" ? "#3B3B40" : "#DCDCE1",
      knob: "#FFFFFF",
    },
  });
