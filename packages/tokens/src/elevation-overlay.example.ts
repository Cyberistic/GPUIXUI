import { darkTheme, extendTheme, type ElevationShape } from "./index.js";

/**
 * A command palette's shadow. It is the topmost surface a theme can raise, so
 * it feathers further than a dialog's `lg` level (56px in the dark identity).
 */
export const commandPaletteShadow: ElevationShape = {
  offsetX: 0,
  offsetY: 32,
  blurRadius: 72,
  spreadRadius: -16,
  alpha: 0.9,
};

/**
 * A theme that defines the reserved `overlay` level. `themeMetricFailures`
 * holds every defined level to the `elevationLevels` order, so this shadow must
 * feather at least as far as `lg`.
 */
export const commandPaletteTheme = extendTheme(darkTheme, {
  name: "Command palette",
  elevation: { overlay: [commandPaletteShadow] },
});
