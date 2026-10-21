import { createTheme, darkTheme } from "./index.js";

/**
 * A complete brand theme built only from overrides. This file is type-checked
 * and asserted in `theme.test.ts`, including the audit a shipped theme must
 * pass, so the documented extension mechanism is exercised rather than
 * illustrative.
 *
 * The brand owns the **on-colour** as well as the fill, and it owns them **per
 * mode** — the two constraints meet in a narrow window. A primary is also the
 * role a progress fill and a spinner dot paint, so in a dark theme it must be
 * light enough to be found on the card (3:1, `indicatorFailures`); a fill that
 * light cannot carry white text, so the dark brand's label is the near-black
 * iris. The light brand keeps the saturated violet and brings a white label,
 * because there the fill is dark enough for both jobs.
 */
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#B49CFF",
    primaryForeground: "#1C1547",
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
    ring: "#7C5CFF",
  },
});

/** The dark theme the brand extends, for consumers that need the base. */
export const brandBaseTheme = darkTheme;
