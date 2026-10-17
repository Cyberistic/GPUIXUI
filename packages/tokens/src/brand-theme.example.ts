import { createTheme, darkTheme } from "./index.js";

/**
 * A complete brand theme built only from overrides. This file is type-checked
 * and asserted in `theme.test.ts`, so the documented extension mechanism is
 * exercised rather than illustrative.
 *
 * The primary family moves together: a brand that changes the fill also sets
 * its foreground, hover, pressed and text steps. Inheriting them would leave the
 * base theme's hue running the states, and the inherited dark foreground
 * measured 4.243:1 on this fill — under the floor the package teaches (plans
 * 082, 097 and 098).
 */
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#7C5CFF",
    primaryForeground: "#000000",
    primaryHover: "#8F73FF",
    primaryActive: "#A28CFF",
    primaryText: "#C9BDFF",
    ring: "#9B8CFF",
  },
  radius: { md: 8 },
  density: "compact",
});

/** The same brand applied to the light theme. */
export const brandLightTheme = createTheme({
  mode: "light",
  name: "Acme Light",
  colors: {
    primary: "#6A45F0",
    primaryForeground: "#FFFFFF",
    primaryHover: "#5A38D8",
    primaryActive: "#4929B8",
    primaryText: "#5330C8",
    ring: "#7C5CFF",
  },
});

/** The dark theme the brand extends, for consumers that need the base. */
export const brandBaseTheme = darkTheme;
