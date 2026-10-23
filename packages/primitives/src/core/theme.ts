/**
 * The theme a primitive draws with.
 *
 * The values and the shape are owned by `@gpuixui/tokens`: this
 * module re-exports the names the components import and adds the `ColorRef`
 * resolver type. A second structural copy of the theme would drift silently, so
 * there is exactly one declaration — in the tokens package.
 */

import { isControlSize, type ControlSize } from "@gpuixui/tokens";
import type { Radius, Spacing, Theme } from "@gpuixui/tokens";

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
