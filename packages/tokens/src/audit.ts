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
  type ContrastSource,
} from "./contrast.js";
import { decorativeFailures, type DecorativeFailure } from "./decorative.js";
import { disabledFadeFailures, type DisabledFadeFailure } from "./disabled.js";
import {
  invalidShadowColors,
  type InvalidShadowColor,
  type ShadowSource,
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
  type SeriesAuditSource,
  type SeriesReport,
} from "./series.js";
import {
  syntaxFailures,
  type SyntaxAuditSource,
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

export { missingTokens };
export type { MissingToken, MissingTokenKind };

export type ThemeAuditSource = ColourSource &
  ContrastSource &
  SeriesAuditSource &
  SyntaxAuditSource &
  ShadowSource &
  NumberSource &
  ScaleSource &
  SwitchAuditSource;

export interface ThemeAudit {
  readonly invalidRoles: readonly InvalidColorRole[];

  readonly invalidShadows: readonly InvalidShadowColor[];

  readonly invalidNumbers: readonly InvalidNumber[];

  readonly scales: readonly InvalidScale[];

  readonly switch: SwitchReport;

  readonly contrast: readonly ContrastFailure[];

  readonly decorative: readonly DecorativeFailure[];

  readonly series: SeriesReport;

  readonly syntax: readonly SyntaxFailure[];

  readonly selection: readonly SelectionFailure[];

  readonly indicators: readonly IndicatorFailure[];

  readonly highlight: readonly HighlightFailure[];

  readonly disabledFade: readonly DisabledFadeFailure[];

  readonly keyboardDim: readonly KeyboardDimFailure[];

  readonly passed: boolean;
}

export function auditTheme(
  theme: ThemeAuditSource | null | undefined,
  floors?: ContrastFloors,
): ThemeAudit {
  const source: ThemeAuditSource = theme ?? {};
  requireTokens(source);
  const contract = floors ?? contrastFloorsFor(source);
  const invalidRoles = invalidColorRoles(source);
  const invalidShadows = invalidShadowColors(source);
  const numbers = invalidNumbers(source);
  const scales = invalidScales(source);
  const toggle = switchFailures(source);
  const contrast = contrastFailures(source, contract);
  const decorative = decorativeFailures(source);
  const series = seriesFailures(source);
  const syntax = syntaxFailures(source, contract);
  const selection = selectionFailures(source, contract);
  const indicators = indicatorFailures(source, contract);
  const highlight = highlightFailures(source, contract);
  const disabledFade = disabledFadeFailures(source);
  const keyboardDim = keyboardDimFailures(source);
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
