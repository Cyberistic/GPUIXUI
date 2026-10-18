import { extendTheme, getTheme, themeTypefaceFailures } from "./index.js";

/** A copied theme with the CSS habit: one string, several families. */
export const stackedTheme = extendTheme(getTheme("light"), {
  typography: { sans: "Inter, system-ui, sans-serif" },
});

/** Both fields are checked; only `sans` carries the stack. */
export const stackedFailures = themeTypefaceFailures(stackedTheme);

/** An installed family with a space in its name is one family, and passes. */
export const installedTheme = extendTheme(getTheme("dark"), {
  typography: { sans: "Helvetica Neue" },
});

/** The empty array a usable brand theme earns. */
export const installedFailures = themeTypefaceFailures(installedTheme);
