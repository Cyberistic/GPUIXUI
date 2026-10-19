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
 * parse, a scrim painted solid, a family the runtime cannot resolve as written,
 * a secondary text role that erases itself on the canvas, a foreground whose
 * two-tone ring guarantee collapses over a swatch, a primary family whose
 * hover and press move lighter in a light theme, and a focus ring with no
 * spread.
 */
export const brokenTheme = extendTheme(getTheme("light"), {
  name: "Broken",
  colors: {
    shadow: "black",
    overlay: "#000000",
    mutedForeground: getTheme("light").colors.background,
    foreground: "#777777",
    primary: "#1E1060",
    primaryHover: "#2A1A7A",
    primaryActive: "#372394",
  },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});

/** Every check reports through one call, in diagnostic order. */
export const brokenFailures = themeFailures(brokenTheme);
