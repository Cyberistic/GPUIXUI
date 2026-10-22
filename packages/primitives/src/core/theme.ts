/**
 * The theme a primitive draws with.
 *
 * The values and the shape are owned by `@gpuixui/tokens`: this
 * module re-exports the names the components import and adds the `ColorRef`
 * resolver type. A second structural copy of the theme would drift silently, so
 * there is exactly one declaration — in the tokens package.
 */

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
