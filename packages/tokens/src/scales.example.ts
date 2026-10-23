/**
 * A brand whose scales were computed rather than authored, and therefore order
 * nothing. Executed by `scales.test.ts`, so the call site the catalogue teaches
 * is a real one.
 */

import { invalidScales, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

/**
 * A theme built by spreading a factor over a base: every value is a usable
 * number, and three rungs now repeat or invert. A control asked for at `sm`
 * paints taller than the same control at `lg`; a dialog is squarer than the
 * card beneath it; a second-level heading is smaller than the body text under
 * it.
 */
export const computedBrand: Theme = extendTheme(lightTheme, {
  name: "Acme computed",
  radius: { xl: 6 },
  density: { controlHeight: { sm: 40, md: 28, lg: 36 } },
  typography: { h2: { fontSize: 12 } },
});

/** The steps that put the brand's scale out of order, ready for a release gate. */
export const brandScaleReport = invalidScales(computedBrand);

/**
 * A brand whose elevation was copied one level at a time from a design-tool
 * export, so the menu's shadow reaches further than the dialog's: a surface
 * raised to `lg` sits closer to the page than the `md` one beneath it, while
 * every number is layable and every colour is one the renderer paints.
 */
export const unevenElevationBrand: Theme = extendTheme(lightTheme, {
  name: "Acme uneven elevation",
  elevation: {
    md: [
      {
        offsetX: 0,
        offsetY: 24,
        blurRadius: 56,
        spreadRadius: -12,
        color: "#191D25A6",
      },
    ],
  },
});

/** The elevation ladder the brand inverted, measured by `invalidScales`. */
export const elevationScaleReport = invalidScales(unevenElevationBrand);
