/**
 * The theme a primitive draws with.
 *
 * The values and the shape are owned by `@gpuixui/tokens`: this
 * module re-exports the names the components import and adds the `ColorRef`
 * resolver type. A second structural copy of the theme would drift silently, so
 * there is exactly one declaration — in the tokens package.
 */

import {
  isControlSize,
  isTextRole,
  typography as libraryTypography,
  type ControlSize,
} from "@gpuixui/tokens";
import type {
  Radius,
  Spacing,
  TextRole,
  TextStyle,
  Theme,
} from "@gpuixui/tokens";
import * as P from "effect/Predicate";

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

/** A step on the spacing scale: `theme.spacing[step]`. */
export type SpaceStep = keyof Spacing;

/** A step on the radius scale: `theme.radius[step]`. */
export type RadiusStep = keyof Radius;

/**
 * How a colour is reached from a theme.
 *
 * A function rather than a dot-path string: a misspelled path is a compile
 * error, and a variant can derive a colour instead of only naming one.
 */
export type ColorRef = (theme: Theme) => string;
