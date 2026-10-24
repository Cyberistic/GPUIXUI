/**
 * The one check a theme runs before it ships.
 *
 * A theme fails silently in independent ways: a role the renderer cannot parse
 * paints black, a shadow colour it cannot parse paints no shadow at all, a
 * number it cannot lay out is dropped, a ladder whose steps no longer describe
 * two sizes makes a name lie, a declared switch track that vanishes into its own
 * surface draws a control the reader cannot find, a text pair below its floor is
 * unreadable, a decorative surface close to its background is invisible, a data
 * series is lost on its plot, a code block's syntax token vanishes into the page
 * it is read on, the selection wash hides the text it selects, an indicator mark
 * disappears into the strip it is drawn on, a find wash cannot be seen or hides
 * the result it marks, a disabled control faded by `disabledOpacity` loses its
 * label, and the keyboard dim the runtime paints on every other focusable erases
 * a control's label. Each has its own report, and a
 * consumer who forgets one ships the failure it would have caught — which is
 * what the documented gate did, running two of the three and holding every theme
 * to the default floors even when the theme declares the high-contrast variant.
 */

import {
  invalidColorRoles,
  type ColourSource,
  type InvalidColorRole,
} from "./color.js";
import {
  contrastFailures,
  contrastFloorsFor,
  type ContrastFailure,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFailures, type DecorativeFailure } from "./decorative.js";
import { disabledFadeFailures, type DisabledFadeFailure } from "./disabled.js";
import {
  invalidShadowColors,
  type Elevation,
  type InvalidShadowColor,
} from "./elevation.js";
import { keyboardDimFailures, type KeyboardDimFailure } from "./focus-dim.js";
import { highlightFailures, type HighlightFailure } from "./highlight.js";
import { indicatorFailures, type IndicatorFailure } from "./indicator.js";
import {
  invalidNumbers,
  type InvalidNumber,
  type NumberSource,
} from "./numbers.js";
import {
  invalidScales,
  type InvalidScale,
  type ScaleSource,
} from "./scales.js";
import { selectionFailures, type SelectionFailure } from "./selection.js";
import {
  seriesFailures,
  type SeriesColors,
  type SeriesReport,
} from "./series.js";
import {
  syntaxFailures,
  type SyntaxColors,
  type SyntaxFailure,
} from "./syntax.js";
import {
  switchFailures,
  type SwitchAuditSource,
  type SwitchReport,
} from "./switch.js";
import {
  missingTokens,
  requireTokens,
  type MissingToken,
  type MissingTokenKind,
} from "./missing.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

export { missingTokens };
export type { MissingToken, MissingTokenKind };

/** A theme's contrast variant, when it has declared one. */
type ContrastSource = { readonly contrast?: ThemeContrast };

/** The field the shadow audit reads: the elevation scale a theme paints, if it carries one. */
type ShadowSource = { readonly elevation?: Partial<Elevation> };

/** The fields a series audit reads: the mode, the variant and an authored scale. */
type SeriesSource = {
  readonly mode: ThemeMode;
  readonly series?: SeriesColors;
};

/** The fields a syntax audit reads: the mode and an authored palette. */
type SyntaxSource = {
  readonly mode: ThemeMode;
  readonly syntax?: SyntaxColors;
};

/** Everything a theme must be free of before it ships. */
export interface ThemeAudit {
  /** Roles whose value is not a colour GPUix can paint. */
  readonly invalidRoles: readonly InvalidColorRole[];
  /** Elevation shadows whose colour GPUix cannot paint, by level and position. */
  readonly invalidShadows: readonly InvalidShadowColor[];
  /** Numeric tokens the renderer cannot lay out — a dropped or invisible size. */
  readonly invalidNumbers: readonly InvalidNumber[];
  /** Steps that no longer describe two sizes — an inverted or repeated rung. */
  readonly scales: readonly InvalidScale[];
  /** A declared switch paint the renderer cannot paint or find, or a box it cannot draw. */
  readonly switch: SwitchReport;
  /** Text, icon and boundary pairs that miss their floor, or cannot be measured. */
  readonly contrast: readonly ContrastFailure[];
  /** Dividers, skeleton fills, veils and status edges too close to their surface. */
  readonly decorative: readonly DecorativeFailure[];
  /** Data series too close to a plot surface, to each other, or to one another under a colour-vision deficiency. */
  readonly series: SeriesReport;
  /** Syntax token colours that cannot be read on the fill a code host paints. */
  readonly syntax: readonly SyntaxFailure[];
  /** Selection washes that cannot be seen, or that hide the text inside them. */
  readonly selection: readonly SelectionFailure[];
  /** Indicator marks that cannot be found on the strip they are drawn on. */
  readonly indicators: readonly IndicatorFailure[];
  /** Find washes that cannot be seen, hide their result, or fail to stand apart. */
  readonly highlight: readonly HighlightFailure[];
  /** Disabled controls whose faded label vanishes into the faded fill. */
  readonly disabledFade: readonly DisabledFadeFailure[];
  /** Controls whose label the keyboard dim erases while another control has focus. */
  readonly keyboardDim: readonly KeyboardDimFailure[];
  /** True only when all fourteen reports are empty. */
  readonly passed: boolean;
}

/**
 * Audit a theme against the fourteen contracts the library holds itself to.
 *
 * The contrast floors come from the theme's own `contrast` variant, so a
 * high-contrast brand is measured at AAA without the caller naming a floor set;
 * pass `floors` to hold a theme to a different contract. Three reports do not
 * take them: `disabledFadeFailures` measures a mechanism rather than a
 * readability claim, and holds every variant to the same
 * `contrastFloors.disabled` — the fade cannot reach a high-contrast variant's
 * 3:1, which is why that variant paints the role pair instead;
 * `keyboardDimFailures` holds every variant to `decorativeFloor` (1.05:1),
 * because the dim is a where-can-Tab-go cue rather than a reading mode; and
 * `switchFailures` holds a declared switch to that same perceptibility floor,
 * because a platform's own toggle is a *look* reproduced rather than one of the
 * library's roles.
 *
 * The two reports that measure the theme's own structure sit beside the colour
 * ones because they are the two ways a theme can be structurally wrong rather
 * than unreadable: `scales` names the rung that no longer exceeds the one
 * before it (a `size` prop that lies, a dialog as square as a card), and
 * `switch` names a declared switch value the renderer ignores, a track that
 * vanishes into the surface it stands on, or a box whose knob no longer fits the
 * track it slides in. Both were public functions *beside* the gate, so a
 * consumer running the gate alone shipped a theme they failed.
 *
 * An incomplete theme does not crash the gate. A theme restored from storage can
 * predate a colour role, an elevation level or the whole elevation scale the
 * library has added since, so `invalidRoles` and `invalidShadows` name the
 * absence and the contracts that measure a pair report it unmeasurable; `passed`
 * is false either way. The same answer is one group up: a store that truncated
 * past the whole `colors` group is read through `themeColors`, so `invalidRoles`
 * names all 47 roles rather than the first lookup throwing. A
 * **numeric step** is the one absence the reports cannot describe — the
 * components read every step, and `invalidNumbers` walks the steps a theme
 * carries, so it says nothing about one that is not there while the first paint
 * that asks for it throws — so a theme missing a group, or a step inside one, is
 * refused with an error naming the path. A font family is refused the same way:
 * it is present but **blank**, so no report can measure it, while every text
 * role paints the renderer's fallback instead of the face the theme names. Such
 * a theme must be rebuilt from a shipped one: a step is a breaking change rather
 * than an additive one. All three lists are readable **before** the refusal with
 * {@link missingTokens}, so a caller deciding whether to restore a stored theme
 * reads the absence as data instead of catching this function's error.
 *
 * `passed` is the only passing result — a report nobody checked is not a pass.
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
  theme: ColourSource &
    ContrastSource &
    SeriesSource &
    SyntaxSource &
    ShadowSource &
    NumberSource &
    ScaleSource &
    SwitchAuditSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): ThemeAudit {
  requireTokens(theme);
  const invalidRoles = invalidColorRoles(theme);
  const invalidShadows = invalidShadowColors(theme);
  const numbers = invalidNumbers(theme);
  const scales = invalidScales(theme);
  const toggle = switchFailures(theme);
  const contrast = contrastFailures(theme, floors);
  const decorative = decorativeFailures(theme);
  const series = seriesFailures(theme);
  const syntax = syntaxFailures(theme, floors);
  const selection = selectionFailures(theme, floors);
  const indicators = indicatorFailures(theme, floors);
  const highlight = highlightFailures(theme, floors);
  const disabledFade = disabledFadeFailures(theme);
  const keyboardDim = keyboardDimFailures(theme);
  return {
    invalidRoles,
    invalidShadows,
    invalidNumbers: numbers,
    scales,
    switch: toggle,
    contrast,
    decorative,
    series,
    syntax,
    selection,
    indicators,
    highlight,
    disabledFade,
    keyboardDim,
    passed:
      invalidRoles.length === 0 &&
      invalidShadows.length === 0 &&
      numbers.length === 0 &&
      scales.length === 0 &&
      toggle.paint.length === 0 &&
      toggle.placements.length === 0 &&
      toggle.metrics.length === 0 &&
      contrast.length === 0 &&
      decorative.length === 0 &&
      series.surfaces.length === 0 &&
      series.distinctness.length === 0 &&
      series.deficiencies.length === 0 &&
      syntax.length === 0 &&
      selection.length === 0 &&
      indicators.length === 0 &&
      highlight.length === 0 &&
      disabledFade.length === 0 &&
      keyboardDim.length === 0,
  };
}
