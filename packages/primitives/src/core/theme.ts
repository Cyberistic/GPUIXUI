/**
 * The theme a primitive draws with.
 *
 * The values and the shape are owned by `@gpuixui/tokens`: this
 * module re-exports the names the components import and adds the `ColorRef`
 * resolver type. A second structural copy of the theme would drift silently, so
 * there is exactly one declaration — in the tokens package.
 */

import {
  borderWidth as libraryBorderWidth,
  defaultDensity as libraryDensity,
  iconSize as libraryIconSize,
  isControlSize,
  isElevationLevel,
  isTextRole,
  radius as libraryRadius,
  spacing as librarySpacing,
  themeColors,
  typography as libraryTypography,
  type ControlSize,
  type ElevationLevel,
  type ThemeColors,
  type ThemeContrast,
} from "@gpuixui/tokens";
import type {
  BorderWidth,
  Density,
  IconSize,
  Radius,
  Spacing,
  TextRole,
  TextStyle,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";

export { isTextRole };

export type {
  BoxShadow as ThemeShadow,
  BorderWidth,
  ControlSize,
  Density,
  DensityName,
  Elevation,
  ElevationLevel,
  FontWeight,
  IconSize as ThemeIconSize,
  Radius,
  Spacing,
  TextStyle,
  TextRole,
  Theme as PrimitiveTheme,
  ThemeColors,
  ThemeMode,
  Typography,
} from "@gpuixui/tokens";

/**
 * A size a control was asked to paint.
 *
 * A control size is one of the choices a consumer stores — `@gpuixui/tokens`
 * publishes `controlSizes` beside `isControlSize` for exactly that read — so a
 * preference a release renamed or dropped arrives as a string the union no
 * longer names. Indexing the scale with it answers `undefined`, which reaches a
 * height, a box side or a `size-icon-*` class as no box at all; an `Icon` given
 * a vanished size name painted a full-width, zero-height SVG for the same
 * reason. A name the scale does not carry is the `md` default every control
 * documents, the answer `iconPixels` gives an icon.
 */
export const controlSize = (size: unknown): ControlSize =>
  isControlSize(size) ? size : "md";

/**
 * The lift a raised surface paints with: the stored level, or absence.
 *
 * An elevation level is a stored choice — a saved workspace records the level it
 * raised a panel to — so a name a release renamed or dropped arrives as a string
 * the union no longer names. `@gpuixui/tokens`' `elevationShadow` reads such a
 * name as `md`, the default lift, and the core resolver paints through it; the
 * recipe behind `Box` indexed its class table raw, so the same box painted
 * **flat** from the shipped painter and raised from the resolver.
 *
 * Absence is its own answer: a box with no level paints no lift at all, so an
 * absent or nullish level stays absent instead of taking the default.
 */
export const elevationLevel = (level: unknown): ElevationLevel | undefined =>
  Option.match(Option.fromNullishOr(level), {
    onNone: () => undefined,
    onSome: (value) => (isElevationLevel(value) ? value : "md"),
  });

/** A step on the spacing scale: `theme.spacing[step]`. */
export type SpaceStep = keyof Spacing;

/** A step on the radius scale: `theme.radius[step]`. */
export type RadiusStep = keyof Radius;

/**
 * A theme's spacing group, or the shape a stored step is measured against.
 *
 * The group may be absent — a theme restored from storage can predate the
 * scale — and a `null` group is the same absence, because JSON has no
 * `undefined`.
 */
export interface SpaceSource {
  readonly spacing?: Spacing | null;
}

/**
 * Whether this theme paints a stored spacing name.
 *
 * A spacing step is a stored choice as often as a literal — a saved panel's
 * inset, a restored toolbar's gap, a layout record's spacer — so a name a
 * release renamed or dropped arrives as a string the union no longer names.
 * The group is the authority: a name the **theme** does not carry is one it
 * cannot paint, whether the token scale dropped it or a hand-built theme never
 * had it.
 */
export const isSpaceStep = (
  theme: SpaceSource,
  step: unknown,
): step is SpaceStep => {
  const scale = theme.spacing;
  if (scale === undefined || scale === null || !P.isString(step)) return false;
  return Arr.some(R.keys(scale), (name) => name === step);
};

/**
 * The spacing step a stored name stands for, or **absence** where the theme
 * paints none.
 *
 * Absence is the answer every layout prop already documents for an omitted
 * step — no inset, no gap, no padding — so a name no release ships paints the
 * same box as one the caller left out, instead of an `undefined` the runtime
 * drops after the paint decided it had a step. `Spacer` is the one caller whose
 * documented default is not "none" (an omitted `size` is a flexible filler), so
 * it reads this absence as that default.
 */
export const spaceStep = (
  theme: SpaceSource,
  step: unknown,
): SpaceStep | undefined => (isSpaceStep(theme, step) ? step : undefined);

/**
 * The number a theme's table paints for a step, or the library's own.
 *
 * Every numeric group a theme carries is a table of numbers read by name — the
 * spacing, radius and icon scales, a density preset's control metrics — and a
 * theme a store gave back may have lost the whole table (`null` where JSON has
 * no `undefined`) or one step in it. The theme's own number wins; otherwise the
 * library's scale answers, which is the rule {@link typeOf} and
 * {@link familyOf} already follow for the type group.
 *
 * A paint seam runs mid-render, so it never throws: reading a lost table
 * directly threw `TypeError: Cannot read properties of null (reading 'md')` and
 * took the tree down from the first layout that asked for a gap, which is the
 * one outcome a control cannot recover from. The gate is the seam that refuses
 * such a theme — `@gpuixui/tokens`' `missingTokens` names the group or the step
 * and the release it must be rebuilt from — while the paint answers the numbers
 * the library would have given it.
 *
 * A step **name** is a different question: {@link spaceStep} asks whether the
 * theme paints a stored name at all, and answers absence when it does not.
 */
export const scaleValue = <Step extends string>(
  scale: Readonly<Partial<Record<Step, number>>> | null | undefined,
  library: Readonly<Record<Step, number>>,
  step: Step,
): number => {
  const value = scale === null || scale === undefined ? undefined : scale[step];
  return P.isNumber(value) && Number.isFinite(value) ? value : library[step];
};

/** The length a spacing step paints: the theme's, or the library's. */
export const spaceValue = (theme: SpaceSource, step: SpaceStep): number =>
  scaleValue(theme.spacing, librarySpacing, step);

/**
 * A theme's radius group, or the shape a stored corner is measured against.
 *
 * The same port the spacing group has: a theme restored from storage can lose
 * the whole group, and JSON writes `null` where it carried none.
 */
export interface RadiusSource {
  readonly radius?: Radius | null;
}

/** The corner a radius step paints: the theme's, or the library's. */
export const radiusValue = (theme: RadiusSource, step: RadiusStep): number =>
  scaleValue(theme.radius, libraryRadius, step);

/** Every corner the library's scale names, for a stored value's membership read. */
const RADIUS_STEPS: ReadonlyArray<string> = R.keys(libraryRadius);

/**
 * Whether a value names a corner step.
 *
 * A corner is a stored choice as often as a literal — a saved panel's radius, a
 * restored placeholder's shape — so a name a release renamed or dropped arrives
 * as a string the union no longer names. The recipe then asks the compiler for
 * `rounded-<name>`, which answers an **unsupported class** nobody reads, and
 * the resolver answers no number.
 */
export const isRadiusStep = (step: unknown): step is RadiusStep =>
  P.isString(step) && Arr.contains(RADIUS_STEPS, step);

/**
 * The corner a stored name stands for, or **absence** where no release paints one.
 *
 * Absence is what each painter documents for a corner it cannot place: a `Box`
 * and a scroll frame paint none, and a `Skeleton` keeps its documented `sm`.
 * Membership is the **library's** scale rather than the theme's, because a
 * theme a store truncated still paints the library's number for a step it lost
 * ({@link radiusValue}), while a name no release carries has no number to paint
 * at all.
 */
export const radiusStep = (step: unknown): RadiusStep | undefined =>
  isRadiusStep(step) ? step : undefined;

/**
 * A theme's border-width group, or the shape a stored edge is measured against.
 *
 * An edge is a numeric group a store can lose like any other; JSON writes `null`
 * where it carried none.
 */
export interface BorderWidthSource {
  readonly borderWidth?: Partial<BorderWidth> | null;
}

/**
 * The edge a control paints: the theme's, or the library's.
 *
 * A border width was the one numeric group the seam did not cover: every rule,
 * box, field and selection control read `theme.borderWidth.thin` directly, so
 * the same truncated theme that lost a scale threw `TypeError: Cannot read
 * properties of null (reading 'thin')` from the first edge it drew. The theme's
 * own number wins, and a lost or nulled step answers the library's — the rule
 * {@link scaleValue} states.
 */
export const borderWidthOf = (
  theme: BorderWidthSource,
  step: keyof BorderWidth,
): number => scaleValue(theme.borderWidth, libraryBorderWidth, step);

/**
 * A theme's density group, or the shape a stored metric is measured against.
 *
 * A density preset carries the control box every interactive part is built at,
 * so a theme that lost it has no height to give a button and no padding to give
 * a field; the library's default preset answers those numbers.
 */
export interface DensitySource {
  readonly density?: Density | null;
}

/** The height a control is built at: the theme's density's, or the library's. */
export const controlHeightOf = (
  theme: DensitySource,
  size: ControlSize,
): number =>
  scaleValue(
    theme.density?.controlHeight,
    libraryDensity.controlHeight,
    controlSize(size),
  );

/**
 * The horizontal padding a control is built at: the theme's, or the library's.
 *
 * The size name is read through {@link controlSize}, so a size a release
 * dropped is the documented `md` step rather than a lookup that answers nothing.
 */
export const controlPaddingOf = (
  theme: DensitySource,
  size: ControlSize,
): number =>
  scaleValue(
    theme.density?.controlPaddingX,
    libraryDensity.controlPaddingX,
    controlSize(size),
  );

/**
 * The height a row is built at: the theme's density's, or the library's.
 *
 * A scroller moves one row per arrow key and a list paints its rows at this
 * height, so a theme that lost the metric answers the library's row rather than
 * handing the key handler a `NaN`.
 */
export const rowHeightOf = (theme: DensitySource): number => {
  const height = theme.density?.rowHeight;
  return P.isNumber(height) && Number.isFinite(height)
    ? height
    : libraryDensity.rowHeight;
};

/** A theme's icon-size group, or the shape a stored side is measured against. */
export interface IconSizeSource {
  readonly iconSize?: IconSize | null;
}

/**
 * The side an icon paints at a control size: the theme's, or the library's.
 *
 * The size name is read through {@link controlSize}, so a stored size a release
 * dropped is the `md` step rather than a lookup that answers nothing.
 */
export const iconSideOf = (theme: IconSizeSource, size: ControlSize): number =>
  scaleValue(theme.iconSize, libraryIconSize, controlSize(size));

/** Every icon step the library's scale names, for a stored value's membership read. */
const ICON_STEPS: ReadonlyArray<string> = R.keys(libraryIconSize);

/**
 * Whether a value names an icon step.
 *
 * An icon step is stored as often as a control size — a saved toolbar's glyph
 * size, a restored chart's legend — so a name a release renamed or dropped
 * arrives as a string the union no longer names.
 */
export const isIconStep = (step: unknown): step is keyof IconSize =>
  P.isString(step) && Arr.contains(ICON_STEPS, step);

/**
 * The side an **icon step** paints at: the theme's, or the library's.
 *
 * {@link iconSideOf} answers a *control* size (`sm`/`md`/`lg`), whose derived
 * sides are not the icon scale's: a 12px glyph is `xs` on this scale while a
 * `sm` control is 14px. A painter that means a glyph — a chart's legend dot, a
 * mark beside a caption — names the icon step and reads it here, so the theme's
 * own `iconSize` reaches it and a stored name the scale does not carry reads as
 * `md`, the rule `iconPixels` follows.
 */
export const iconStepValue = (theme: IconSizeSource, step: unknown): number =>
  scaleValue(
    theme.iconSize,
    libraryIconSize,
    isIconStep(step) ? step : "md",
  );

/**
 * A theme, or anything shaped like one, as the type scale reads it.
 *
 * The group may be absent, because a store can lose it: a theme restored from
 * storage that predates a release, a hand-built literal that omitted it. A role
 * inside it may be `null`, because JSON has no `undefined` — a store writes the
 * roles it has and `null` for the ones it does not. The colours have the same
 * port in `@gpuixui/tokens` (`ColourSource`), and the type group needed one for
 * the same reason.
 */
export interface TypeSource {
  readonly typography?: {
    readonly sans?: string | null;
    readonly mono?: string | null;
  } & Partial<Record<TextRole, TextStyle | null>>;
}

/**
 * Whether a value is a type role: the size, the leading and the weight.
 *
 * A store can write `null` where a role belongs, and a hand-edited literal can
 * carry a number where the role is — so a role is read only when it carries all
 * three numbers, the rule `themeColors` applies to the colour group.
 */
const isTextStyle = (value: unknown): value is TextStyle =>
  typeof value === "object" &&
  value !== null &&
  "fontSize" in value &&
  "lineHeight" in value &&
  "fontWeight" in value &&
  P.isNumber(value.fontSize) &&
  P.isNumber(value.lineHeight) &&
  P.isNumber(value.fontWeight);

/**
 * The type role a theme paints with.
 *
 * A theme restored from storage can lack a role — the scale grew one after the
 * store was written — and every painter read `theme.typography[role]` directly,
 * so the first lookup threw `TypeError: Cannot read properties of undefined
 * (reading 'fontSize')` and took the tree down with it: one lost role emptied
 * every text, every control and every skeleton on the screen.
 *
 * The colour group has had a total reader since the tokens package published
 * `themeColors` — a role it does not carry is `undefined` rather than a throw.
 * The type group answers the same way, and the fallback is the **library's own
 * scale**: every shipped theme paints the library's roles unless it overrode
 * them, so a role a theme does not carry is the one it would have painted
 * anyway, and a brand that overrode it and lost it still paints readable type.
 *
 * A role name the scale does not carry is the theme's `body` default, the same
 * rule {@link controlSize} follows for a size name the scale dropped: a brand
 * that resized its scale keeps its own type, and only a theme that lost the
 * `body` role itself falls back to the library's.
 */
export const typeOf = (theme: TypeSource, role: unknown): TextStyle => {
  const name = isTextRole(role) ? role : "body";
  const style: unknown = theme.typography?.[name];
  return isTextStyle(style) ? style : libraryTypography[name];
};

/**
 * The font family a theme paints with, or the library's own.
 *
 * The two families are the other half of the type group: a platform style
 * overrides them (`applyStyle`), so a theme that lost the group loses the
 * platform's face too — and the library's own face is what it falls back to.
 */
export const familyOf = (
  theme: TypeSource,
  family: "sans" | "mono",
): string => {
  const name: unknown = theme.typography?.[family];
  return P.isString(name) && name !== "" ? name : libraryTypography[family];
};

/**
 * A theme's colour group, or the shape a store gave back.
 *
 * A role is additive: the tokens package **reports** a group a theme lost
 * (`invalidColorRoles`) rather than refusing the theme, and JSON writes `null`
 * where a stored theme carried none — the absence `themeColors` already models
 * for the same reason. A paint seam reads through {@link colorsOf} rather than
 * the group, so a truncated theme paints nothing instead of throwing.
 */
export interface ColorSource {
  readonly colors?: Partial<ThemeColors>;
}

/**
 * A theme as a colour reference sees it: the roles, and the contrast mode a
 * derivation reads.
 *
 * The shape `@gpuixui/tokens`' `BrandSource` uses, so a token helper can be a
 * {@link ColorRef} without a wrapper.
 */
export type PaintSource = ColorSource & {
  readonly contrast?: ThemeContrast;
};

/**
 * The colour roles a theme still carries.
 *
 * A paint seam runs mid-render, so it never throws. Reading the group directly
 * threw `TypeError: Cannot read properties of null (reading 'primary')` from the
 * first control that asked for its fill, and one truncated theme emptied the
 * window; the token contract answers `{}` for the same theme instead, so a
 * paint answers `undefined` and leaves the surface its recipe already painted.
 *
 * The gate is still the tokens package's — `missingTokens` names the group and
 * `invalidColorRoles` names every role it cannot read — because a role is
 * additive, unlike a scale a layout needs to measure.
 */
export const colorsOf = (theme: ColorSource): Partial<ThemeColors> =>
  themeColors(theme);

/**
 * One semantic role a theme still carries, or `undefined` when it lost it.
 *
 * The role name is a key of `ThemeColors`, so a misspelled role is a compile
 * error rather than a lookup that answers nothing, and the answer is the
 * absence every paint seam already models for a role the theme does not ship.
 */
export const colorRole = (
  theme: ColorSource,
  role: keyof ThemeColors,
): string | undefined => colorsOf(theme)[role];

/**
 * How a colour is reached from a theme.
 *
 * A function rather than a dot-path string: a misspelled path is a compile
 * error, and a variant can derive a colour instead of only naming one. The
 * answer may be absent — a role a stored theme lost — so every painter reads
 * it as no paint rather than handing the runtime a `null`.
 */
export type ColorRef = (theme: PaintSource) => string | undefined;
