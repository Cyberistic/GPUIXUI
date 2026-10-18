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
 * parse, a family the runtime cannot resolve as written, a secondary text role
 * that erases itself on the canvas, and a focus ring with no spread.
 */
export const brokenTheme = extendTheme(getTheme("light"), {
  name: "Broken",
  colors: {
    shadow: "black",
    mutedForeground: getTheme("light").colors.background,
  },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});

/** All four checks report through one call, in colour → typeface → contrast → metric order. */
export const brokenFailures = themeFailures(brokenTheme);
