/**
 * A copied platform style that owns **every** part of its look, not only its
 * colours: the six numeric groups travel in `structure`, beside the families in
 * `types`. The values are deliberately modest so the style passes the metric
 * contract on all three density presets — a copied file is still held to
 * `themeFailures`.
 *
 * Copy this shape into `platform-styles/` and apply it with
 * `applyPlatformStyle(getTheme(mode), style)`.
 */

import { systemUiFont, type PlatformStyle } from "./platform-types.js";

/** A fictional "Contoso" desktop style with its own type scale and metrics. */
export const contosoDensityPlatformStyle = {
  types: { label: "Contoso desktop", sans: systemUiFont, mono: "Menlo" },
  structure: {
    // Type roles: families stay in `types`; sizes, leading and weight travel here.
    typography: {
      code: { fontSize: 12, lineHeight: 18 },
    },
    spacing: { md: 10 },
    borderWidth: { strong: 3 },
    iconSize: { md: 18 },
    avatarSize: { sm: 28 },
    dimensions: { overlayWidth: 240 },
  },
  // Colours and elevation are omitted: this style changes shape, not palette.
  colors: { light: {}, dark: {} },
  elevation: { light: {}, dark: {} },
} as const satisfies PlatformStyle;
