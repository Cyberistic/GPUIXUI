/**
 * Copy-and-own component dimensions: a drawer, a dialog, the shortest message
 * viewport and the carousel marks are fixed surfaces, so they merge field by
 * field and the rest of the group inherits. This file is type-checked and
 * asserted in `dimensions.test.ts`.
 */
import { extendTheme, lightTheme } from "./index.js";

/**
 * A theme with a narrower default drawer, a wider default dialog and a taller
 * message viewport.
 */
export const narrowDrawerTheme = extendTheme(lightTheme, {
  dimensions: {
    drawerWidthMd: 360,
    dialogWidthMd: 520,
    chatViewportMinHeight: 200,
  },
});

/** The base the example extends, for consumers that need it. */
export const dimensionsBaseTheme = lightTheme;
