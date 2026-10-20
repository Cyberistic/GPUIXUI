import { createTheme, darkTheme } from "./index.js";

/**
 * A complete brand theme built only from overrides. This file is type-checked
 * and asserted in `theme.test.ts`, so the documented extension mechanism is
 * exercised rather than illustrative.
 *
 * The primary family moves together: a brand that changes the fill also sets
 * its foreground, hover, pressed and text steps. Inheriting them would leave the
 * base theme's hue running the states, and the inherited dark foreground
 * measured 4.243:1 on the original fill — under the floor the package teaches
 * (plans 082, 097 and 098). The fill also has to keep the selected option's
 * `primary` check above the mark floor on the `selected` fill it marks: this
 * family clears it at 3.146:1 without repainting `selected`/`selectedActive`
 * (plan 698). A darker brand must move the selection fills, and the `accent`
 * hover that has to stay a step below them, with its primary.
 *
 * The groove moves with it too (plan 347). A progress segment paints `primary`
 * on `track`, so a brand whose fill is still darker than the identity accent
 * needs a groove dark enough to keep the mark at 3:1; the identity groove
 * leaves this fill at 2.97:1. `#20202E` is the brand's own neutral step.
 *
 * The lighter fill needs no custom scrim: a dialog's face measures 1.157:1 over
 * the identity 65% scrim and this brand's primary action, so the example takes
 * the base scrim. A brand whose fill is darker than the base accent deepens it,
 * the way the macOS dark style does (plan 526).
 *
 * The light brand's link ink takes one step inside its own violet family —
 * `#5330C8` → `#4B2AB4` — because a native document paints body text on a 3.5%
 * ink wash, where the old value measured 6.941:1, under the body floor the
 * total check enforces (plan 745).
 */
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#9579FF",
    primaryForeground: "#000000",
    primaryHover: "#A78DFF",
    primaryActive: "#B9A4FF",
    primaryText: "#C9BDFF",
    ring: "#9B8CFF",
    track: "#20202E",
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
    primaryText: "#4B2AB4",
    ring: "#7C5CFF",
  },
});

/** The dark theme the brand extends, for consumers that need the base. */
export const brandBaseTheme = darkTheme;
