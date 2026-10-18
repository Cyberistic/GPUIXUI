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

/** A stray space is not part of an installed name; the runtime matches exactly. */
export const paddedTheme = extendTheme(getTheme("light"), {
  typography: { sans: " Inter" },
});

/** The `trimmed` failure a padded family earns. */
export const paddedFailures = themeTypefaceFailures(paddedTheme);

/** A CSS generic keyword is browser syntax, not a family the runtime holds. */
export const genericTheme = extendTheme(getTheme("light"), {
  typography: { sans: "system-ui" },
});

/** The `css-generic` failure a web habit earns. */
export const genericFailures = themeTypefaceFailures(genericTheme);

/** CSS quotes are part of the family string the runtime looks up. */
export const quotedTheme = extendTheme(getTheme("light"), {
  typography: { sans: '"Helvetica Neue"' },
});

/** The `quoted` failure a copied CSS declaration earns. */
export const quotedFailures = themeTypefaceFailures(quotedTheme);
