import { colorRoles, type ThemeColors } from "./color.js";
import {
  elevationLevels,
  type Elevation,
  type ElevationShape,
} from "./elevation.js";
import {
  motionLevels,
  motionPhases,
  type Motion,
  type MotionEasing,
  type MotionEasings,
  type MotionLevel,
  type MotionOverrides,
} from "./motion.js";
import {
  avatarSizeSteps,
  borderWidthSteps,
  controlSizes,
  densityPresets,
  dimensionNames,
  iconSizeSteps,
  radiusSteps,
  spacingSteps,
  type Density,
  type DensityOverrides,
  type DensityName,
} from "./scale.js";
import type { Theme, ThemeOverrides, TypographyOverrides } from "./theme.js";
import {
  textRoles,
  type TextRole,
  type TextStyle,
  type Typography,
} from "./typography.js";

const isEmpty = (value: object): boolean => Object.keys(value).length === 0;

/**
 * The entries of a flat numeric scale that differ. The caller passes the
 * package's ordered index, so a new step joins the diff from the one owner a
 * table iterates.
 */
const changedSteps = <K extends string>(
  keys: ReadonlyArray<K>,
  base: Readonly<Record<K, number>>,
  theme: Readonly<Record<K, number>>,
): Partial<Record<K, number>> =>
  keys.reduce<Partial<Record<K, number>>>(
    (changed, key) =>
      base[key] === theme[key] ? changed : { ...changed, [key]: theme[key] },
    {},
  );

const changedColors = (
  base: ThemeColors,
  theme: ThemeColors,
): Partial<ThemeColors> =>
  colorRoles.reduce<Partial<ThemeColors>>(
    (changed, role) =>
      base[role] === theme[role]
        ? changed
        : { ...changed, [role]: theme[role] },
    {},
  );

const changedTextStyle = (
  base: TextStyle,
  theme: TextStyle,
): Partial<TextStyle> => ({
  ...(base.fontSize === theme.fontSize ? {} : { fontSize: theme.fontSize }),
  ...(base.lineHeight === theme.lineHeight
    ? {}
    : { lineHeight: theme.lineHeight }),
  ...(base.fontWeight === theme.fontWeight
    ? {}
    : { fontWeight: theme.fontWeight }),
});

const changedTypography = (
  base: Typography,
  theme: Typography,
): TypographyOverrides => {
  const roles = textRoles.reduce<Partial<Record<TextRole, Partial<TextStyle>>>>(
    (changed, role) => {
      const roleOverrides = changedTextStyle(base[role], theme[role]);
      return isEmpty(roleOverrides)
        ? changed
        : { ...changed, [role]: roleOverrides };
    },
    {},
  );
  return {
    ...(base.sans === theme.sans ? {} : { sans: theme.sans }),
    ...(base.mono === theme.mono ? {} : { mono: theme.mono }),
    ...roles,
  };
};

const densityEquals = (base: Density, theme: Density): boolean =>
  base.name === theme.name &&
  base.rowHeight === theme.rowHeight &&
  controlSizes.every(
    (size) =>
      base.controlHeight[size] === theme.controlHeight[size] &&
      base.controlPaddingX[size] === theme.controlPaddingX[size],
  );

/**
 * The density overrides a target needs. A tuned preset is expressed against the
 * preset it names — never against the base — because `mergeDensity` starts from
 * `densityPresets[preset]` when one is named, so the result does not depend on
 * the base's own metrics.
 */
const changedDensity = (
  base: Density,
  theme: Density,
): DensityName | DensityOverrides | undefined => {
  if (densityEquals(base, theme)) {
    return undefined;
  }
  const preset = densityPresets[theme.name];
  const controlHeight = changedSteps(
    controlSizes,
    preset.controlHeight,
    theme.controlHeight,
  );
  const controlPaddingX = changedSteps(
    controlSizes,
    preset.controlPaddingX,
    theme.controlPaddingX,
  );
  const rowChanged = preset.rowHeight !== theme.rowHeight;
  if (!rowChanged && isEmpty(controlHeight) && isEmpty(controlPaddingX)) {
    return theme.name;
  }
  return {
    preset: theme.name,
    ...(isEmpty(controlHeight) ? {} : { controlHeight }),
    ...(isEmpty(controlPaddingX) ? {} : { controlPaddingX }),
    ...(rowChanged ? { rowHeight: theme.rowHeight } : {}),
  };
};

const shapeEquals = (left: ElevationShape, right: ElevationShape): boolean =>
  left.offsetX === right.offsetX &&
  left.offsetY === right.offsetY &&
  left.blurRadius === right.blurRadius &&
  left.spreadRadius === right.spreadRadius &&
  left.alpha === right.alpha;

const levelEquals = (
  left: ReadonlyArray<ElevationShape>,
  right: ReadonlyArray<ElevationShape>,
): boolean =>
  left.length === right.length &&
  left.every((shape, index) => {
    const other = right[index];
    return other !== undefined && shapeEquals(shape, other);
  });

const changedElevation = (
  base: Elevation,
  theme: Elevation,
): Partial<Elevation> =>
  elevationLevels.reduce<Partial<Elevation>>(
    (changed, level) =>
      levelEquals(base[level], theme[level])
        ? changed
        : { ...changed, [level]: theme[level] },
    {},
  );

const easingEquals = (left: MotionEasing, right: MotionEasing): boolean => {
  const leftIsCurve = Array.isArray(left);
  const rightIsCurve = Array.isArray(right);
  if (!leftIsCurve || !rightIsCurve) {
    return left === right;
  }
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

const changedMotion = (
  base: Motion,
  theme: Motion,
): MotionOverrides | undefined => {
  const timings = motionLevels.reduce<Partial<Record<MotionLevel, number>>>(
    (changed, level) =>
      base[level] === theme[level]
        ? changed
        : { ...changed, [level]: theme[level] },
    {},
  );
  const easings = motionPhases.reduce<Partial<MotionEasings>>(
    (changed, phase) =>
      easingEquals(base.ease[phase], theme.ease[phase])
        ? changed
        : { ...changed, [phase]: theme.ease[phase] },
    {},
  );
  if (isEmpty(timings) && isEmpty(easings)) {
    return undefined;
  }
  return { ...timings, ...(isEmpty(easings) ? {} : { ease: easings }) };
};

/**
 * Express an edited theme as the minimal overrides that reproduce it.
 *
 * `extendTheme` is one-way: a runtime editor, a settings screen or a "copy
 * theme" action holds a complete {@link Theme} and needs the small
 * {@link ThemeOverrides} set that produced it, so the same look can be stored,
 * compared or emitted as a copyable module. This is that inverse — every group
 * is compared field by field and a group with no change is omitted, so
 * `themeOverrides(base, base)` is `{}`.
 *
 * A tuned density is expressed against the preset it names, because
 * `mergeDensity` starts from that preset rather than from the base's metrics;
 * an elevation level is replaced whole, matching the documented merge rule. A
 * different `mode` returns `undefined`: `extendTheme` cannot change the mode, so
 * the caller must choose a base of the theme's mode, and the absence is not a
 * silently wrong diff.
 *
 * The function is pure and total over the typed `Theme`; every shipped theme
 * round-trips — `<platform>` over the identity of its mode, a platform over
 * another platform, and a high-contrast base to an explicit default target.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeOverrides } from "@gpuixui/tokens";
 *
 * const base = getTheme("dark");
 * const edited = extendTheme(base, { radius: { md: 8 }, density: "compact" });
 *
 * themeOverrides(base, edited); // { radius: { md: 8 }, density: "compact" }
 * ```
 */
export function themeOverrides(
  base: Theme,
  theme: Theme,
): ThemeOverrides | undefined {
  if (base.mode !== theme.mode) {
    return undefined;
  }

  const colors = changedColors(base.colors, theme.colors);
  const typography = changedTypography(base.typography, theme.typography);
  const spacing = changedSteps(spacingSteps, base.spacing, theme.spacing);
  const radius = changedSteps(radiusSteps, base.radius, theme.radius);
  const dimensions = changedSteps(
    dimensionNames,
    base.dimensions,
    theme.dimensions,
  );
  const borderWidth = changedSteps(
    borderWidthSteps,
    base.borderWidth,
    theme.borderWidth,
  );
  const iconSize = changedSteps(iconSizeSteps, base.iconSize, theme.iconSize);
  const avatarSize = changedSteps(
    avatarSizeSteps,
    base.avatarSize,
    theme.avatarSize,
  );
  const density = changedDensity(base.density, theme.density);
  const elevation = changedElevation(base.elevation, theme.elevation);
  const motion = changedMotion(base.motion, theme.motion);

  return {
    ...(base.name === theme.name ? {} : { name: theme.name }),
    ...(base.contrast === theme.contrast ? {} : { contrast: theme.contrast }),
    ...(isEmpty(colors) ? {} : { colors }),
    ...(isEmpty(typography) ? {} : { typography }),
    ...(isEmpty(spacing) ? {} : { spacing }),
    ...(isEmpty(radius) ? {} : { radius }),
    ...(density === undefined ? {} : { density }),
    ...(isEmpty(dimensions) ? {} : { dimensions }),
    ...(isEmpty(elevation) ? {} : { elevation }),
    ...(motion === undefined ? {} : { motion }),
    ...(isEmpty(borderWidth) ? {} : { borderWidth }),
    ...(isEmpty(iconSize) ? {} : { iconSize }),
    ...(isEmpty(avatarSize) ? {} : { avatarSize }),
  };
}
