import { createTheme, darkTheme } from "./index.js";

/**
 * A complete brand theme built only from overrides. This file is type-checked
 * and asserted in `theme.test.ts`, so the documented extension mechanism is
 * exercised rather than illustrative.
 */
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#7C5CFF",
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
    ring: "#7C5CFF",
  },
});

/** The dark theme the brand extends, for consumers that need the base. */
export const brandBaseTheme = darkTheme;
