/**
 * The one check a theme runs before it ships.
 *
 * A theme fails silently in independent ways: a role the renderer cannot parse
 * paints black, a shadow colour it cannot parse paints no shadow at all, a text
 * pair below its floor is unreadable, a decorative surface close to its
 * background is invisible, a data series is lost on its plot, the selection
 * wash hides the text it selects, and an indicator mark disappears into the
 * strip it is drawn on. Each has its own report, and a consumer who forgets one
 * ships the failure it would have caught — which is what the documented gate
 * did, running two of the three and holding every theme to the default floors
 * even when the theme declares the high-contrast variant.
 */

import {
  invalidColorRoles,
  type InvalidColorRole,
  type ThemeColors,
} from "./color.js";
import {
  contrastFailures,
  contrastFloors,
  highContrastFloors,
  type ContrastFailure,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFailures, type DecorativeFailure } from "./decorative.js";
import {
  invalidShadowColors,
  type Elevation,
  type InvalidShadowColor,
} from "./elevation.js";
import { indicatorFailures, type IndicatorFailure } from "./indicator.js";
import { selectionFailures, type SelectionFailure } from "./selection.js";
import {
  seriesFailures,
  type SeriesColors,
  type SeriesReport,
} from "./series.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

/** A theme, or anything shaped like one, for the checks that only read colours. */
type ColourSource = { readonly colors: ThemeColors };

/** A theme's contrast variant, when it has declared one. */
type ContrastSource = { readonly contrast?: ThemeContrast };

/** The field the shadow audit reads: the elevation scale a theme paints. */
type ShadowSource = { readonly elevation: Elevation };

/** The fields a series audit reads: the mode, the variant and an authored scale. */
type SeriesSource = {
  readonly mode: ThemeMode;
  readonly series?: SeriesColors;
};

/**
 * The floors a theme's own contrast variant is held to.
 *
 * A theme that declares `contrast: "high"` is held to the AAA floors, not to the
 * default ones — the floors follow the declaration rather than the caller's
 * memory. A hand-built theme declares nothing and gets the default floors.
 *
 * @example
 * ```ts
 * contrastFloorsFor(highContrastDarkTheme); // { body: 7, secondary: 7, boundary: 4.5 }
 * ```
 */
export function contrastFloorsFor(theme: ContrastSource): ContrastFloors {
  return theme.contrast === "high" ? highContrastFloors : contrastFloors;
}

/** Everything a theme must be free of before it ships. */
export interface ThemeAudit {
  /** Roles whose value is not a colour GPUix can paint. */
  readonly invalidRoles: readonly InvalidColorRole[];
  /** Elevation shadows whose colour GPUix cannot paint, by level and position. */
  readonly invalidShadows: readonly InvalidShadowColor[];
  /** Text, icon and boundary pairs that miss their floor, or cannot be measured. */
  readonly contrast: readonly ContrastFailure[];
  /** Dividers, skeleton fills, veils and status edges too close to their surface. */
  readonly decorative: readonly DecorativeFailure[];
  /** Data series too close to a plot surface, to each other, or to one another under a colour-vision deficiency. */
  readonly series: SeriesReport;
  /** Selection washes that cannot be seen, or that hide the text inside them. */
  readonly selection: readonly SelectionFailure[];
  /** Indicator marks that cannot be found on the strip they are drawn on. */
  readonly indicators: readonly IndicatorFailure[];
  /** True only when all seven reports are empty. */
  readonly passed: boolean;
}

/**
 * Audit a theme against the seven contracts the library holds itself to.
 *
 * The contrast floors come from the theme's own `contrast` variant, so a
 * high-contrast brand is measured at AAA without the caller naming a floor set;
 * pass `floors` to hold a theme to a different contract. `passed` is the only
 * passing result — a report nobody checked is not a pass.
 *
 * @example
 * ```ts
 * import { auditTheme, extendTheme, lightTheme } from "@gpuixui/tokens";
 *
 * const brand = extendTheme(lightTheme, { colors: { primary: "#6A45F0" } });
 * auditTheme(brand).passed; // true
 * ```
 */
export function auditTheme(
  theme: ColourSource & ContrastSource & SeriesSource & ShadowSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): ThemeAudit {
  const invalidRoles = invalidColorRoles(theme);
  const invalidShadows = invalidShadowColors(theme);
  const contrast = contrastFailures(theme, floors);
  const decorative = decorativeFailures(theme);
  const series = seriesFailures(theme);
  const selection = selectionFailures(theme, floors);
  const indicators = indicatorFailures(theme, floors);
  return {
    invalidRoles,
    invalidShadows,
    contrast,
    decorative,
    series,
    selection,
    indicators,
    passed:
      invalidRoles.length === 0 &&
      invalidShadows.length === 0 &&
      contrast.length === 0 &&
      decorative.length === 0 &&
      series.surfaces.length === 0 &&
      series.distinctness.length === 0 &&
      series.deficiencies.length === 0 &&
      selection.length === 0 &&
      indicators.length === 0,
  };
}
