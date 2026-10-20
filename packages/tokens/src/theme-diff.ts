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
import {
  extendTheme,
  type Theme,
  type ThemeOverrides,
  type TypographyOverrides,
} from "./theme.js";
import { resolveThemeChoice, type ThemeChoice } from "./theme-choice.js";
import {
  textRoles,
  type TextRole,
  type TextStyle,
  type Typography,
} from "./typography.js";

const isEmpty = (value: object): boolean => Object.keys(value).length === 0;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether two themes declare the same members, at every depth. `extendTheme`
 * merges with a spread, so a brand can widen a scale — `{ ...spacing, "6xl":
 * 96 }` — and the numeric contract accepts the result as a `Theme`. A
 * `ThemeOverrides` names only the declared members, so the diff cannot carry an
 * added step back; refusing the pair is what keeps a returned set able to
 * rebuild the theme it was measured against.
 *
 * An array is a value, not a member map: `extendTheme` replaces an elevation
 * level whole, so a defined `overlay` — a level the identity ships empty and
 * the metric contract governs — travels in the diff instead of being refused.
 * The member boundary is the named members of a record; a level's entries are
 * carried by `changedElevation`.
 */
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (Array.isArray(base) || Array.isArray(theme)) {
    return Array.isArray(base) && Array.isArray(theme);
  }
  if (isRecord(base) && isRecord(theme)) {
    const members = Object.keys(base);
    return (
      members.length === Object.keys(theme).length &&
      members.every(
        (member) => member in theme && sameMembers(base[member], theme[member]),
      )
    );
  }
  return true;
};

/**
 * The entries of a flat numeric scale that differ. The caller passes the
 * package's ordered index, so a new step joins the diff from the one owner a
 * table iterates. A step the base does not declare never reaches this walk:
 * {@link themeOverrides} refuses a pair whose member sets differ.
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
 * an elevation level is replaced whole, matching the documented merge rule.
 *
 * `undefined` means the pair cannot be expressed, and there are two cases: a
 * different `mode`, which `extendTheme` cannot change, and a group whose
 * member set differs from the base's — a brand that widens a scale with an
 * extra step, `{ ...spacing, "6xl": 96 }`, which the checks accept as a `Theme`
 * while a `ThemeOverrides` can only name the declared members. Refusing is what
 * keeps the promise: a returned set always rebuilds the theme it was measured
 * against, and a caller holding an unnamed member keeps its theme object.
 *
 * A level's entries are not members: `extendTheme` replaces an elevation level
 * whole, so a brand that defines the reserved `overlay` — empty in every
 * shipped theme, and governed once defined — stores as
 * `{ elevation: { overlay: [...] } }` like any other level it edits.
 *
 * The overrides are relative to that **exact** base, not merely its mode — a
 * Windows edit replayed on the identity of the same mode paints the identity's
 * radii, edge and type, and `themeFailures` reports neither — so a stored edit
 * is a {@link ThemeEdit}: it records the base's {@link ThemeChoice} and
 * {@link applyThemeEdit} resolves it back.
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
  if (base.mode !== theme.mode || !sameMembers(base, theme)) {
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

/**
 * A stored edit: the shipped base it was made against, named as the choice a
 * settings row or a URL already persists, and the minimal overrides
 * {@link themeOverrides} measured against it.
 *
 * {@link ThemeOverrides} alone is base-relative, so replaying an edit of the
 * Windows variant on the identity of the same mode silently paints the
 * identity's radii, edge and type. Storing the pair is what makes the replay
 * faithful.
 */
export interface ThemeEdit {
  /** The choice {@link applyThemeEdit} resolves to the base. */
  readonly base: ThemeChoice;
  /** The overrides measured against that base. */
  readonly overrides: ThemeOverrides;
}

/**
 * Store an edit of a shipped base as the pair {@link applyThemeEdit} replays.
 *
 * The base is resolved from `choice` before the diff, so the artifact can never
 * name a base it was not measured against. A different `mode` returns
 * `undefined` — the one case `extendTheme` cannot express; every same-mode
 * choice reproduces `edited` through {@link applyThemeEdit}.
 *
 * An edit of a theme a choice cannot name — a brand theme, or any theme built by
 * `extendTheme` — is measured against the resolved choice, so the brand's own
 * differences travel in the overrides and the pair still reproduces it while
 * every group keeps the member set the base declares. Two themes the artifact
 * cannot express return `undefined`: a different `mode`, and one whose scale
 * carries a member the base does not — the extra step a brand spreads into
 * `spacing` is accepted by the checks and cannot travel in `ThemeOverrides`.
 * The caller keeps its theme object in both cases.
 *
 * @example
 * ```ts
 * import {
 *   applyThemeEdit,
 *   extendTheme,
 *   getPlatformTheme,
 *   themeEdit,
 * } from "@gpuixui/tokens";
 *
 * const choice = { mode: "light", platform: "win32" } as const;
 * const base = getPlatformTheme(choice.platform, choice.mode);
 * const edited = extendTheme(base, { radius: { md: 8 } });
 * const stored = themeEdit(choice, edited);
 *
 * const theme = stored === undefined ? base : applyThemeEdit(stored);
 * ```
 */
export function themeEdit(
  choice: ThemeChoice,
  edited: Theme,
): ThemeEdit | undefined {
  const overrides = themeOverrides(resolveThemeChoice(choice), edited);
  return overrides === undefined ? undefined : { base: choice, overrides };
}

/**
 * Rebuild a stored edit: resolve the choice it records, then apply its
 * overrides.
 *
 * `applyThemeEdit(themeEdit(choice, edited))` reproduces `edited` for every
 * same-mode choice naming a shipped base, which is the round trip
 * `theme-edit.test.ts` walks over every platform and recipe set.
 *
 * @example
 * ```ts
 * import { applyThemeEdit, getTheme, themeEdit } from "@gpuixui/tokens";
 *
 * const choice = { mode: "dark" } as const;
 * const stored = themeEdit(choice, getTheme("dark"));
 * const theme = stored === undefined ? undefined : applyThemeEdit(stored);
 * ```
 */
export function applyThemeEdit(edit: ThemeEdit): Theme {
  return extendTheme(resolveThemeChoice(edit.base), edit.overrides);
}
