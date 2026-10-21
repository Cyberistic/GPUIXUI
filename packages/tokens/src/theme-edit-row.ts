/**
 * The boundary of the stored theme edit.
 *
 * `themeEdit` writes the `{ base, overrides }` pair the documents tell a
 * consumer to persist, and `applyThemeEdit` replays it — but a stored pair comes
 * back as `unknown`, and `extendTheme` spreads only what it is given: an
 * override group it cannot merge is dropped without a word, and the ten checks
 * cannot see the hole (`numericMembers` reports numbers, so a string spacing is
 * not a metric). {@link themeEditFromRow} is the decoder that keeps that from
 * being a cast.
 */

import { colorRoles } from "./color.js";
import { elevationLevels, elevationShapeFields } from "./elevation.js";
import { isMotionEasingName, motionLevels, motionPhases } from "./motion.js";
import {
  avatarSizeSteps,
  borderWidthSteps,
  controlSizes,
  dimensionNames,
  iconSizeSteps,
  isDensityName,
  radiusSteps,
  spacingSteps,
  type DensityOverrides,
} from "./scale.js";
import { isThemeContrast, type ThemeOverrides } from "./theme.js";
import { themeChoiceFromRow } from "./theme-choice.js";
import type { ThemeEdit } from "./theme-diff.js";
import { textRoles, type TextStyle } from "./typography.js";

/** One kind test a stored override member is held to. */
type MemberGuard = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber: MemberGuard = (value) => typeof value === "number";
const isString: MemberGuard = (value) => typeof value === "string";

const named = <Key extends string>(
  index: ReadonlyArray<Key>,
  key: string,
): key is Key => index.some((member) => member === key);

/**
 * A record over an ordered index whose every value is a number. An unknown
 * member is refused: `extendTheme` would spread it into the scale, where the
 * numeric contract walks the theme's own members — a step the index does not
 * name is not a step the library reads.
 */
const isNumberRecord = (
  index: ReadonlyArray<string>,
  value: unknown,
): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, entry]) => named(index, key) && isNumber(entry),
  );

/** The three fields one type role carries. */
const textStyleFields = [
  "fontSize",
  "lineHeight",
  "fontWeight",
] as const satisfies ReadonlyArray<keyof TextStyle>;

const isTextStyle: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([field, entry]) => named(textStyleFields, field) && isNumber(entry),
  );

/**
 * Whether every entry of a record is a member whose guard accepts its value.
 * The guard table is keyed by the interface's members, so a group the override
 * type gains joins the decoder or the table stops compiling.
 */
const isRecordOf = (
  guards: Readonly<Record<string, MemberGuard>>,
  value: unknown,
): boolean =>
  isRecord(value) &&
  Object.entries(value).every(([key, entry]) => {
    const guard = guards[key];
    return guard !== undefined && guard(entry);
  });

const isColors: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([role, ink]) => named(colorRoles, role) && isString(ink),
  );

const isTypography: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(([role, style]) =>
    role === "sans" || role === "mono"
      ? isString(style)
      : named(textRoles, role) && isTextStyle(style),
  );

const isEasing: MemberGuard = (value) =>
  isMotionEasingName(value) ||
  (Array.isArray(value) && value.length === 4 && value.every(isNumber));

const isEasings: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([phase, easing]) => named(motionPhases, phase) && isEasing(easing),
  );

/** A timing by level, and the four easings inside `ease`. */
const isMotion: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(([member, entry]) =>
    member === "ease"
      ? isEasings(entry)
      : named(motionLevels, member) && isNumber(entry),
  );

/** One entry of an elevation level: all five fields, and nothing else. */
const isElevationShape: MemberGuard = (value) =>
  isRecord(value) &&
  Object.keys(value).length === elevationShapeFields.length &&
  elevationShapeFields.every((field) => isNumber(value[field]));

const isElevation: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([level, shapes]) =>
      named(elevationLevels, level) &&
      Array.isArray(shapes) &&
      shapes.every(isElevationShape),
  );

/** A preset name, or metrics that merge size by size over the preset. */
const densityGuards = {
  preset: isDensityName,
  controlHeight: (value: unknown) => isNumberRecord(controlSizes, value),
  controlPaddingX: (value: unknown) => isNumberRecord(controlSizes, value),
  rowHeight: isNumber,
} as const satisfies Readonly<Record<keyof DensityOverrides, MemberGuard>>;

const isDensity: MemberGuard = (value) =>
  isDensityName(value) || isRecordOf(densityGuards, value);

/**
 * The guard each override group owns. `satisfies` is the completeness check: a
 * group added to {@link ThemeOverrides} does not compile until it has one, so
 * the decoder cannot fall behind the type it decodes.
 */
const overrideGuards = {
  name: isString,
  contrast: isThemeContrast,
  colors: isColors,
  typography: isTypography,
  spacing: (value: unknown) => isNumberRecord(spacingSteps, value),
  radius: (value: unknown) => isNumberRecord(radiusSteps, value),
  density: isDensity,
  dimensions: (value: unknown) => isNumberRecord(dimensionNames, value),
  elevation: isElevation,
  motion: isMotion,
  borderWidth: (value: unknown) => isNumberRecord(borderWidthSteps, value),
  iconSize: (value: unknown) => isNumberRecord(iconSizeSteps, value),
  avatarSize: (value: unknown) => isNumberRecord(avatarSizeSteps, value),
} as const satisfies Readonly<Record<keyof ThemeOverrides, MemberGuard>>;

const isOverrides = (value: unknown): value is ThemeOverrides =>
  isRecordOf(overrideGuards, value);

/**
 * Decode a stored edit — the `{ base, overrides }` pair {@link themeEdit} wrote
 * — without trusting its shape.
 *
 * The base goes through {@link themeChoiceFromRow}, so a missing or unknown axis
 * resolves to the identity exactly as it does for a stored choice. Every
 * override group and member is held to the kind {@link ThemeOverrides} declares
 * and to the ordered index that owns it, because `extendTheme` spreads only what
 * it is given: a group it cannot merge — a typo'd `colour`, a stringified
 * `spacing` — is silently dropped, and `themeFailures` cannot see the result
 * (the numeric walk reports numbers, and a string is not a metric). Such an
 * artifact is refused with `undefined`, so a settings screen keeps the theme it
 * has instead of restoring one that lost the edit.
 *
 * Values stay the checks' job: an override that is well formed but misses a
 * floor — `borderWidth: { strong: 0 }`, `colors: { primary: "#12345" }` —
 * decodes, and `themeFailures(applyThemeEdit(edit))` names it. A key beside
 * `base` and `overrides` is ignored, so a newer artifact still opens; a value
 * that is not a row at all is `undefined`.
 *
 * @example
 * ```ts
 * import {
 *   applyThemeEdit,
 *   getTheme,
 *   themeEdit,
 *   themeEditFromRow,
 * } from "@gpuixui/tokens";
 *
 * const stored = themeEdit({ mode: "dark" }, getTheme("dark"));
 * const loaded = themeEditFromRow(stored);
 * const theme = loaded === undefined ? getTheme("dark") : applyThemeEdit(loaded);
 * ```
 */
export function themeEditFromRow(value: unknown): ThemeEdit | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const overrides = value.overrides === undefined ? {} : value.overrides;
  return isOverrides(overrides)
    ? { base: themeChoiceFromRow(value.base), overrides }
    : undefined;
}
