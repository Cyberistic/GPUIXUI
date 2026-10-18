import {
  themeColorFailures,
  themeContrastFailures,
  themeTextTierFailures,
  type ColorFailure,
  type ContrastFailure,
  type TextTierFailure,
} from "./contrast.js";
import { themeDirectionFailures, type DirectionFailure } from "./direction.js";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { themeOpacityFailures, type OpacityFailure } from "./opacity.js";
import type { Theme, ThemeContrast } from "./theme.js";
import { themeTypefaceFailures, type TypefaceFailure } from "./typeface.js";

/**
 * The checks {@link themeFailures} composes, in diagnostic order.
 *
 * A report, a settings screen or a CI summary can iterate this index instead of
 * retyping the kinds, and {@link ThemeFailureKind} is the union it derives. The
 * list owns the count: a check is added here and composed below, and a kind
 * without a payload does not type-check.
 */
export const themeChecks = [
  "color",
  "opacity",
  "typeface",
  "contrast",
  "hierarchy",
  "direction",
  "metric",
] as const;

/** The check that found a failure — one member of {@link themeChecks}. */
export type ThemeFailureKind = (typeof themeChecks)[number];

/** The failure each check returns, keyed by the kind that tags it. */
type FailurePayload = {
  readonly color: ColorFailure;
  readonly opacity: OpacityFailure;
  readonly typeface: TypefaceFailure;
  readonly contrast: ContrastFailure;
  readonly hierarchy: TextTierFailure;
  readonly direction: DirectionFailure;
  readonly metric: MetricFailure;
};

/**
 * One defect in an edited theme, tagged with the check that found it. `color`
 * is a role outside the hex form the token maths parses, `opacity` is an alpha
 * channel the role is not painted with, `typeface` is a family name the runtime
 * cannot resolve as written, `contrast` is a documented pair
 * below its floor, `hierarchy` is a text tier that is not a perceivable step
 * below the tier above it, `direction` is a pointer ladder that steps toward the
 * canvas instead of away from it, and `metric` is a numeric invariant a
 * component relies on.
 */
export type ThemeFailure = {
  readonly [Kind in ThemeFailureKind]: FailurePayload[Kind] & {
    readonly kind: Kind;
  };
}[ThemeFailureKind];

/**
 * Every defect in an edited theme, from one call.
 *
 * The extension mechanism's guarantee is only whole when the colour-format,
 * opacity, typeface, contrast, text-hierarchy, direction and metric checks all
 * run: a theme whose only defect is a `shadow: "black"` tint, a translucent
 * elevation tint the paint discards, a solid modal scrim, a zero focus-ring
 * spread, a CSS family stack, a disabled label raised to body strength or a
 * light pointer ladder whose hover and press lighten returns `[]` from the
 * contrast check alone. This function composes them all in diagnostic order —
 * the order {@link themeChecks} owns — the three format checks first, so a
 * malformed role is named before the `NaN` ratios it causes, an alpha channel
 * before the tint it repaints and a malformed family before the type scale
 * painted with it, then contrast, then the text hierarchy, then the interaction
 * direction, then metrics — and tags each failure with the check that found it.
 *
 * `contrast` defaults to the level the theme declares, exactly like
 * {@link themeContrastFailures}, so a high-contrast theme is checked against
 * its own floors without a second argument. The opacity and metric halves are
 * level-independent: a shape does not change at AAA. An empty array is the
 * library's guarantee for a shipped theme and the target for a consumer's.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeFailures } from "@gpuixui/tokens";
 *
 * const theme = extendTheme(getTheme("dark"), {
 *   colors: { shadow: "#00000080" },
 *   typography: { sans: "Inter, system-ui, sans-serif" },
 *   borderWidth: { strong: 0 },
 * });
 *
 * themeFailures(theme); // an `opacity`, a `typeface` and a `metric` failure
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
    ...themeOpacityFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "opacity", ...failure }),
    ),
    ...themeTypefaceFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "typeface", ...failure }),
    ),
    ...themeContrastFailures(theme, contrast).map(
      (failure): ThemeFailure => ({ kind: "contrast", ...failure }),
    ),
    ...themeTextTierFailures(theme, contrast).map(
      (failure): ThemeFailure => ({ kind: "hierarchy", ...failure }),
    ),
    ...themeDirectionFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "direction", ...failure }),
    ),
    ...themeMetricFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "metric", ...failure }),
    ),
  ];
}
