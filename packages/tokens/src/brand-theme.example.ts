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
 *
 * The groove moves with it too (plan 347). A progress segment paints `primary`
 * on `track`, so a brand that lightens its primary in dark mode needs a groove
 * dark enough to keep the mark at 3:1 and to clear the washes and status tints
 * the rail is painted on; the identity groove leaves this fill at 2.23:1.
 * `#20202E` is the brand's own neutral step.
 *
 * The scrim moves with the brand as well (plan 526). A dialog's face is measured
 * on the scrim over every surface a window shows, and this fill is darker than
 * the identity accent, so the inherited 65% scrim left the floating face at
 * 1.038:1 over the brand's own primary action. At 85% the face clears the floor
 * over every content fill. A brand with a lighter accent can keep the base
 * scrim; a darker one deepens it, like the macOS dark style does.
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
    track: "#20202E",
    overlay: "#000000D9",
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
