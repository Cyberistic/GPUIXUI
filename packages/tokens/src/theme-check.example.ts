import { extendTheme, getTheme, themeFailures } from "./index.js";

/**
 * A usable brand theme: one type-size edit, both text roles it affects moved,
 * so every check is empty.
 */
export const brandTheme = extendTheme(getTheme("dark"), {
  name: "Acme",
  typography: {
    body: { fontSize: 15 },
    bodyStrong: { fontSize: 15 },
  },
});

/** The one line a consumer's test adds; an empty array is the guarantee. */
export const brandFailures = themeFailures(brandTheme);

/**
 * A copied theme with one defect from each class: a tint the helpers cannot
 * parse, a secondary text role that erases itself on the canvas, and a focus
 * ring with no spread.
 */
export const brokenTheme = extendTheme(getTheme("light"), {
  name: "Broken",
  colors: {
    shadow: "black",
    mutedForeground: getTheme("light").colors.background,
  },
  borderWidth: { strong: 0 },
});

/** All three checks report through one call, in format → contrast → metric order. */
export const brokenFailures = themeFailures(brokenTheme);
