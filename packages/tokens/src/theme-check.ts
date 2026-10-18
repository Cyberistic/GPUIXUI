import {
  themeColorFailures,
  themeContrastFailures,
  type ColorFailure,
  type ContrastFailure,
} from "./contrast.js";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * One defect in an edited theme, tagged with the check that found it. `color`
 * is a role outside the hex form the token maths parses, `contrast` is a
 * documented pair below its floor, and `metric` is a numeric invariant a
 * component relies on.
 */
export type ThemeFailure =
  | (ColorFailure & { readonly kind: "color" })
  | (ContrastFailure & { readonly kind: "contrast" })
  | (MetricFailure & { readonly kind: "metric" });

/**
 * Every defect in an edited theme, from one call.
 *
 * The extension mechanism's guarantee is only whole when the format, contrast
 * and metric checks all run: a theme whose only defect is a `shadow: "black"`
 * tint or a zero focus-ring spread returns `[]` from the contrast check alone.
 * This function composes the three in diagnostic order — format first, so a
 * malformed role is named before the `NaN` ratios it causes, then contrast,
 * then metrics — and tags each failure with the check that found it.
 *
 * `contrast` defaults to the level the theme declares, exactly like
 * {@link themeContrastFailures}, so a high-contrast theme is checked against
 * its own floors without a second argument. An empty array is the library's
 * guarantee for a shipped theme and the target for a consumer's.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeFailures } from "@gpuixui/tokens";
 *
 * const theme = extendTheme(getTheme("dark"), {
 *   colors: { shadow: "black" },
 *   borderWidth: { strong: 0 },
 * });
 *
 * themeFailures(theme); // a `color` and a `metric` failure
 * ```
 */
export function themeFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<ThemeFailure> {
  return [
    ...themeColorFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "color", ...failure }),
    ),
    ...themeContrastFailures(theme, contrast).map(
      (failure): ThemeFailure => ({ kind: "contrast", ...failure }),
    ),
    ...themeMetricFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "metric", ...failure }),
    ),
  ];
}
