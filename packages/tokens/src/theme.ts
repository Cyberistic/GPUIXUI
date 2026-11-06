import {
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  namesColour,
  themeColors,
  type ThemeColors,
} from "./color.js";
import {
  darkElevation,
  elevationLevels,
  elevationWithTint,
  highContrastDarkElevation,
  highContrastLightElevation,
  lightElevation,
  type BoxShadow,
  type Elevation,
  type ElevationLevel,
} from "./elevation.js";
import { isStepRecord } from "./missing.js";
import {
  isPlatformName,
  platformNames,
  platformStyles,
  type PlatformName,
  type PlatformStyleSource,
} from "./platforms.js";
import {
  materialNames,
  type MaterialFills,
  type WindowBackground,
} from "./materials.js";
import {
  borderWidth,
  controlSizes,
  defaultDensity,
  densityNames,
  densityPresets,
  iconSize,
  iconSizes,
  isDensityName,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
  type BorderWidth,
  type ControlSize,
  type Density,
  type DensityName,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import {
  seriesColors,
  seriesPalette,
  type SeriesColors,
  type StoredSeries,
} from "./series.js";
import {
  syntaxColors,
  syntaxPalette,
  syntaxRoles,
  type StoredSyntax,
  type SyntaxColors,
} from "./syntax.js";
import {
  textRoles,
  typography,
  type TextStyle,
  type Typography,
} from "./typography.js";

import {
  isThemeContrast,
  isThemeMode,
  themeContrastOf,
  themeContrasts,
  themeModeOf,
  themeModes,
  type ThemeContrast,
  type ThemeMode,
} from "./mode.js";

export {
  isThemeContrast,
  isThemeMode,
  themeContrastOf,
  themeContrasts,
  themeModeOf,
  themeModes,
  type ThemeContrast,
  type ThemeMode,
} from "./mode.js";

export interface Theme {
  readonly name: string;

  readonly mode: ThemeMode;

  readonly contrast?: ThemeContrast;

  readonly colors: ThemeColors;

  readonly typography: Typography;

  readonly spacing: Spacing;

  readonly radius: Radius;

  readonly density: Density;

  readonly elevation: Elevation;

  readonly borderWidth: BorderWidth;

  readonly iconSize: IconSize;

  readonly series?: SeriesColors;

  readonly syntax?: SyntaxColors;

  readonly switch?: SwitchColors;

  readonly switchMetrics?: SwitchMetrics;

  readonly materials?: MaterialFills;

  readonly window?: WindowBackground;

  readonly reduceTransparency?: boolean;

  readonly interaction?: Interaction;
}

export type Interaction = "pointer" | "appkit";

export interface SwitchColors {
  readonly on: string;

  readonly off: string;

  readonly knob: string;

  readonly knobOff?: string;

  readonly edge?: string;
}

export interface SwitchMetrics {
  readonly width: number;

  readonly height: number;

  readonly knob: number;

  readonly inset: number;

  readonly border: number;
}

export interface TypographyOverrides {
  readonly sans?: string;
  readonly mono?: string;
  readonly display?: Partial<TextStyle>;
  readonly h1?: Partial<TextStyle>;
  readonly h2?: Partial<TextStyle>;
  readonly h3?: Partial<TextStyle>;
  readonly body?: Partial<TextStyle>;
  readonly bodyStrong?: Partial<TextStyle>;
  readonly label?: Partial<TextStyle>;
  readonly caption?: Partial<TextStyle>;
  readonly code?: Partial<TextStyle>;
  readonly codeBlock?: Partial<TextStyle>;
}

export interface DensityOverrides {
  readonly controlHeight?: Partial<Record<ControlSize, number>>;

  readonly controlPaddingX?: Partial<Record<ControlSize, number>>;

  readonly rowHeight?: number;
}

export interface ThemeOverrides {
  readonly name?: string;

  readonly colors?: Partial<ThemeColors>;

  readonly typography?: TypographyOverrides;

  readonly spacing?: Partial<Spacing>;

  readonly radius?: Partial<Radius>;

  readonly density?: DensityName | Density | DensityOverrides;

  readonly elevation?: Partial<Elevation>;

  readonly borderWidth?: Partial<BorderWidth>;

  readonly iconSize?: Partial<IconSize>;

  readonly series?: SeriesColors;

  readonly syntax?: Partial<SyntaxColors>;

  readonly switch?: SwitchColors;

  readonly switchMetrics?: SwitchMetrics;

  readonly materials?: MaterialFills;

  readonly window?: WindowBackground;

  readonly reduceTransparency?: boolean;

  readonly interaction?: Interaction;
}

export type Stored<T> =
  T extends ReadonlyArray<unknown>
    ? T | null
    : T extends object
      ? { readonly [K in keyof T]?: Stored<T[K]> } | null
      : T | null;

type WholeGroup = "switch" | "switchMetrics" | "materials";

export type ThemeOverridesSource = {
  readonly name?: unknown;
} & {
  readonly [K in Exclude<keyof ThemeOverrides, "name">]?: K extends WholeGroup
    ? ThemeOverrides[K] | null
    : K extends "syntax"
      ? StoredSyntax | null
      : K extends "series"
        ? StoredSeries | null
        : Stored<ThemeOverrides[K]>;
};

type FixedThemeKey = "mode" | "contrast";

type EveryGroupOverridable =
  Exclude<
    Exclude<keyof Theme, FixedThemeKey>,
    keyof ThemeOverrides
  > extends never
    ? true
    : [
        "a theme group has no override",
        Exclude<Exclude<keyof Theme, FixedThemeKey>, keyof ThemeOverrides>,
      ];

const groupsOverridable: EveryGroupOverridable = true;

void groupsOverridable;

export interface ThemeConfig extends ThemeOverrides {
  readonly mode: ThemeMode;

  readonly contrast?: ThemeContrast;
}

const overlay = <T extends object>(
  base: T,
  overrides: Stored<Partial<T>> | null | undefined,
): T => {
  if (overrides === undefined || overrides === null) {
    return base;
  }
  const defined = Object.entries(overrides).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return { ...base, ...Object.fromEntries(defined) };
};

const namedRoles = (
  colors: Stored<Partial<ThemeColors>> | null | undefined,
): Stored<Partial<ThemeColors>> | null | undefined =>
  colors === null || colors === undefined
    ? colors
    : colorRoles.reduce<Partial<ThemeColors>>((named, role) => {
        const value = colors[role];
        return typeof value === "string" && value.trim() !== ""
          ? { ...named, [role]: value }
          : named;
      }, {});

const nameOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const mergeTypography = (
  base: Typography,
  override: Stored<TypographyOverrides> | null | undefined,
): Typography => {
  if (override === undefined || override === null) {
    return base;
  }
  return {
    sans: nameOf(override.sans) ?? base.sans,
    mono: nameOf(override.mono) ?? base.mono,
    display: overlay(base.display, override.display),
    h1: overlay(base.h1, override.h1),
    h2: overlay(base.h2, override.h2),
    h3: overlay(base.h3, override.h3),
    body: overlay(base.body, override.body),
    bodyStrong: overlay(base.bodyStrong, override.bodyStrong),
    label: overlay(base.label, override.label),
    caption: overlay(base.caption, override.caption),
    code: overlay(base.code, override.code),
    codeBlock: overlay(base.codeBlock, override.codeBlock),
  };
};

const isDensityBox = (value: {
  readonly name?: unknown;
  readonly controlHeight?: Partial<Record<ControlSize, unknown>> | null;
  readonly controlPaddingX?: Partial<Record<ControlSize, unknown>> | null;
  readonly rowHeight?: unknown;
}): value is Density =>
  isDensityName(value.name) &&
  typeof value.rowHeight === "number" &&
  controlSizes.every(
    (size) =>
      typeof value.controlHeight?.[size] === "number" &&
      typeof value.controlPaddingX?.[size] === "number",
  );

const mergeDensity = (
  base: Density,
  override: Stored<ThemeOverrides["density"]> | null | undefined,
): Density => {
  if (override === undefined || override === null) {
    return base;
  }
  if (typeof override === "string") {
    if (override.trim() === "") {
      return base;
    }

    if (!isDensityName(override)) {
      throw new Error(
        `\`${override}\` is not a density preset: ${densityNames.join(", ")} are the presets this release ships. A restored or configured choice is narrowed with \`isDensityName\` before it reaches a theme.`,
      );
    }
    return densityPresets[override];
  }

  if (isDensityBox(override)) {
    return override;
  }
  return {
    name: base.name,
    controlHeight: overlay(base.controlHeight, override.controlHeight),
    controlPaddingX: overlay(base.controlPaddingX, override.controlPaddingX),
    rowHeight: override.rowHeight ?? base.rowHeight,
  };
};

export const lightTheme: Theme = {
  name: "Light",
  mode: "light",
  contrast: "default",
  colors: lightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: lightElevation,
  borderWidth,
  iconSize,
};

export const darkTheme: Theme = {
  name: "Dark",
  mode: "dark",
  contrast: "default",
  colors: darkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: darkElevation,
  borderWidth,
  iconSize,
};

export const themes: Readonly<Record<ThemeMode, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};

export const highContrastLightTheme: Theme = {
  name: "High contrast light",
  mode: "light",
  contrast: "high",
  colors: highContrastLightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: highContrastLightElevation,
  borderWidth,
  iconSize,
};

export const highContrastDarkTheme: Theme = {
  name: "High contrast dark",
  mode: "dark",
  contrast: "high",
  colors: highContrastDarkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: highContrastDarkElevation,
  borderWidth,
  iconSize,
};

export const highContrastThemes: Readonly<Record<ThemeMode, Theme>> = {
  light: highContrastLightTheme,
  dark: highContrastDarkTheme,
};

export function getTheme(
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  if (!isThemeMode(mode)) {
    throw new Error(
      `\`${mode}\` is not a theme mode: ${themeModes.join(", ")} are the modes this release ships. A restored or configured choice is narrowed with \`isThemeMode\` before it reaches a theme.`,
    );
  }
  if (!isThemeContrast(contrast)) {
    throw new Error(
      `\`${contrast}\` is not a contrast variant: ${themeContrasts.join(", ")} are the variants this release ships. A restored or configured choice is narrowed with \`isThemeContrast\` before it reaches a theme.`,
    );
  }
  return contrast === "high" ? highContrastThemes[mode] : themes[mode];
}

export function extendTheme(
  base: Theme,
  overrides: ThemeOverridesSource,
): Theme {
  const identity = getTheme(themeModeOf(base), themeContrastOf(base));
  const colors = overlay(base.colors, namedRoles(overrides.colors));

  const elevation =
    overrides.colors?.shadow === undefined || overrides.colors.shadow === null
      ? base.elevation
      : elevationWithTint(base.elevation, colors.shadow);
  return {
    name: nameOf(overrides.name) ?? nameOf(base.name) ?? "Theme",
    mode: base.mode,
    contrast: base.contrast,
    colors,
    typography: mergeTypography(
      base.typography ?? identity.typography,
      overrides.typography,
    ),
    spacing: overlay(base.spacing, overrides.spacing),
    radius: overlay(base.radius, overrides.radius),
    density: mergeDensity(base.density ?? identity.density, overrides.density),
    elevation: overlay(elevation, overrides.elevation),
    borderWidth: overlay(base.borderWidth, overrides.borderWidth),
    iconSize: overlay(base.iconSize, overrides.iconSize),
    series:
      overrides.series == null
        ? base.series
        : seriesPalette(overrides.series, seriesColors(base)),

    syntax:
      overrides.syntax == null
        ? base.syntax
        : syntaxPalette(overrides.syntax, syntaxColors(base)),

    switch: overrides.switch ?? base.switch,
    switchMetrics: overrides.switchMetrics ?? base.switchMetrics,
    materials: overrides.materials ?? base.materials,
    window: overrides.window ?? base.window,
    reduceTransparency: overrides.reduceTransparency ?? base.reduceTransparency,
    interaction: overrides.interaction ?? base.interaction,
  };
}

const borderWidthSteps = [
  "thin",
  "strong",
] as const satisfies readonly (keyof BorderWidth)[];

type EveryBorderWidthStepListed<Listed extends keyof BorderWidth> =
  Exclude<keyof BorderWidth, Listed> extends never
    ? true
    : [
        "a border width step is missing from the list",
        Exclude<keyof BorderWidth, Listed>,
      ];

const borderWidthIndex: EveryBorderWidthStepListed<
  (typeof borderWidthSteps)[number]
> = true;

void borderWidthIndex;

const isEmptyGroup = (group: object): boolean =>
  Object.keys(group).length === 0;

const storedNumber = (group: unknown, key: string): number | undefined => {
  if (!isStepRecord(group)) return undefined;
  const value = group[key];
  return typeof value === "number" ? value : undefined;
};

const stepOverrides = <Step extends string>(
  steps: readonly Step[],
  theme: unknown,
  base: Readonly<Record<Step, number>>,
): Partial<Record<Step, number>> | undefined => {
  const moved = steps.reduce<Partial<Record<Step, number>>>(
    (overrides, step) => {
      const value = storedNumber(theme, step);
      return value === undefined || value === base[step]
        ? overrides
        : { ...overrides, [step]: value };
    },
    {},
  );
  return isEmptyGroup(moved) ? undefined : moved;
};

const textFields = (
  role: unknown,
  base: TextStyle,
): Partial<TextStyle> | undefined => {
  const size = storedNumber(role, "fontSize");
  const leading = storedNumber(role, "lineHeight");
  const weight = storedNumber(role, "fontWeight");
  const moved: Partial<TextStyle> = {
    ...(size === undefined || size === base.fontSize ? {} : { fontSize: size }),
    ...(leading === undefined || leading === base.lineHeight
      ? {}
      : { lineHeight: leading }),
    ...(weight === undefined || weight === base.fontWeight
      ? {}
      : { fontWeight: weight }),
  };
  return isEmptyGroup(moved) ? undefined : moved;
};

const typographyOverrides = (
  theme: unknown,
  base: Typography,
): TypographyOverrides | undefined => {
  const source = isStepRecord(theme) ? theme : {};
  const sans = nameOf(source.sans);
  const mono = nameOf(source.mono);
  const roles = textRoles.reduce<TypographyOverrides>(
    (overrides, role) => {
      const moved = textFields(source[role], base[role]);
      return moved === undefined ? overrides : { ...overrides, [role]: moved };
    },
    {
      ...(sans === undefined || sans === base.sans ? {} : { sans }),
      ...(mono === undefined || mono === base.mono ? {} : { mono }),
    },
  );
  return isEmptyGroup(roles) ? undefined : roles;
};

const isBoxShadow = (value: unknown): value is BoxShadow =>
  isStepRecord(value) &&
  typeof value.offsetX === "number" &&
  typeof value.offsetY === "number" &&
  typeof value.blurRadius === "number" &&
  typeof value.spreadRadius === "number" &&
  typeof value.color === "string";

const shadowsAt = (
  elevation: unknown,
  level: ElevationLevel,
): readonly BoxShadow[] | undefined => {
  if (!isStepRecord(elevation)) return undefined;
  const value = elevation[level];
  if (!Array.isArray(value)) return undefined;
  const shadows = value.filter(isBoxShadow);
  return shadows.length === value.length ? shadows : undefined;
};

const sameShadows = (
  left: readonly BoxShadow[],
  right: readonly BoxShadow[],
): boolean =>
  left.length === right.length &&
  left.every((shadow, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      shadow.offsetX === other.offsetX &&
      shadow.offsetY === other.offsetY &&
      shadow.blurRadius === other.blurRadius &&
      shadow.spreadRadius === other.spreadRadius &&
      shadow.color === other.color
    );
  });

const densityOverrides = (
  density: unknown,
  base: Density,
): ThemeOverrides["density"] | undefined => {
  if (typeof density === "string") {
    return isDensityName(density) && density !== base.name
      ? density
      : undefined;
  }
  if (!isStepRecord(density)) {
    return undefined;
  }

  if (isDensityBox(density) && density.name !== base.name) {
    return density;
  }
  const controlHeight = stepOverrides(
    controlSizes,
    density.controlHeight,
    base.controlHeight,
  );
  const controlPaddingX = stepOverrides(
    controlSizes,
    density.controlPaddingX,
    base.controlPaddingX,
  );
  const rowHeight = storedNumber(density, "rowHeight");
  const moved: DensityOverrides = {
    ...(controlHeight === undefined ? {} : { controlHeight }),
    ...(controlPaddingX === undefined ? {} : { controlPaddingX }),
    ...(rowHeight === undefined || rowHeight === base.rowHeight
      ? {}
      : { rowHeight }),
  };
  return isEmptyGroup(moved) ? undefined : moved;
};

const syntaxOverrides = (
  theme: StoredTheme,
  base: Theme,
): Partial<SyntaxColors> | undefined => {
  const carried = theme.syntax;
  if (!isStepRecord(carried)) {
    return undefined;
  }

  const table = syntaxColors(base);
  const moved = syntaxRoles.reduce<Partial<SyntaxColors>>((tokens, role) => {
    const value = carried[role];
    return namesColour(value) && value !== table[role]
      ? { ...tokens, [role]: value }
      : tokens;
  }, {});
  return isEmptyGroup(moved) ? undefined : moved;
};

const sameSeries = (
  left: StoredSeries,
  right: SeriesColors | undefined,
): boolean =>
  right !== undefined && right.every((colour, index) => left[index] === colour);

const sameSwitch = (
  left: SwitchColors,
  right: SwitchColors | undefined,
): boolean =>
  right !== undefined &&
  left.on === right.on &&
  left.off === right.off &&
  left.knob === right.knob &&
  left.knobOff === right.knobOff &&
  left.edge === right.edge;

const sameMetrics = (
  left: SwitchMetrics,
  right: SwitchMetrics | undefined,
): boolean =>
  right !== undefined &&
  left.width === right.width &&
  left.height === right.height &&
  left.knob === right.knob &&
  left.inset === right.inset &&
  left.border === right.border;

export function themeOverrides(
  theme: StoredTheme,
  base: Theme,
): ThemeOverrides {
  const mode = themeModeOf(theme);
  const contrast = themeContrastOf(theme);
  if (mode !== themeModeOf(base) || contrast !== themeContrastOf(base)) {
    throw new Error(
      `\`${mode} · ${contrast}\` is not an edit of \`${themeModeOf(base)} · ${themeContrastOf(base)}\`: a mode and a contrast variant are what a theme's numbers mean, so no override can move them. Start from the theme of the same mode with \`getTheme\`, or rebuild a stored theme from its own labels with \`restoreTheme\`.`,
    );
  }

  const colours = themeColors(theme);
  const colors = colorRoles.reduce<Partial<ThemeColors>>((overrides, role) => {
    const value = colours[role];
    return value === undefined || value === base.colors[role]
      ? overrides
      : { ...overrides, [role]: value };
  }, {});

  const shadowMoved =
    colours.shadow !== undefined && colours.shadow !== base.colors.shadow;
  const elevation = elevationLevels.reduce<Partial<Elevation>>(
    (overrides, level) => {
      const shadows = shadowsAt(theme.elevation, level);
      return shadows === undefined ||
        (!shadowMoved && sameShadows(shadows, base.elevation[level]))
        ? overrides
        : { ...overrides, [level]: shadows };
    },
    {},
  );
  const spacing = stepOverrides(spacingSteps, theme.spacing, base.spacing);
  const radius = stepOverrides(radiusSteps, theme.radius, base.radius);
  const borderWidth = stepOverrides(
    borderWidthSteps,
    theme.borderWidth,
    base.borderWidth,
  );
  const iconSize = stepOverrides(iconSizes, theme.iconSize, base.iconSize);
  const authoredName = nameOf(theme.name);
  const name =
    authoredName === undefined || authoredName === base.name
      ? undefined
      : authoredName;
  const typography = typographyOverrides(theme.typography, base.typography);
  const density = densityOverrides(theme.density, base.density);
  const syntax = syntaxOverrides(theme, base);
  const baseSeries = seriesColors(base);
  const carried =
    theme.series == null ? undefined : seriesPalette(theme.series, baseSeries);
  const series =
    carried === undefined || sameSeries(carried, baseSeries)
      ? undefined
      : carried;
  const toggle =
    theme.switch == null || sameSwitch(theme.switch, base.switch)
      ? undefined
      : theme.switch;
  const metrics =
    theme.switchMetrics == null ||
    sameMetrics(theme.switchMetrics, base.switchMetrics)
      ? undefined
      : theme.switchMetrics;
  const materials =
    theme.materials == null ||
    materialNames.every(
      (material) => theme.materials?.[material] === base.materials?.[material],
    )
      ? undefined
      : theme.materials;
  const window =
    theme.window == null || theme.window === base.window
      ? undefined
      : theme.window;
  const reduceTransparency =
    theme.reduceTransparency == null ||
    theme.reduceTransparency === base.reduceTransparency
      ? undefined
      : theme.reduceTransparency;
  const interaction =
    theme.interaction == null || theme.interaction === base.interaction
      ? undefined
      : theme.interaction;
  const diff = {
    ...(name === undefined ? {} : { name }),
    ...(isEmptyGroup(colors) ? {} : { colors }),
    ...(typography === undefined ? {} : { typography }),
    ...(spacing === undefined ? {} : { spacing }),
    ...(radius === undefined ? {} : { radius }),
    ...(density === undefined ? {} : { density }),
    ...(isEmptyGroup(elevation) ? {} : { elevation }),
    ...(borderWidth === undefined ? {} : { borderWidth }),
    ...(iconSize === undefined ? {} : { iconSize }),
    ...(series === undefined ? {} : { series }),
    ...(syntax === undefined ? {} : { syntax }),
    ...(toggle === undefined ? {} : { switch: toggle }),
    ...(metrics === undefined ? {} : { switchMetrics: metrics }),
    ...(materials === undefined ? {} : { materials }),
    ...(window === undefined ? {} : { window }),
    ...(reduceTransparency === undefined ? {} : { reduceTransparency }),
    ...(interaction === undefined ? {} : { interaction }),
  };

  const named: EveryDiffGroupListed<keyof typeof diff> = true;
  void named;
  return diff;
}

type EveryDiffGroupListed<Built extends keyof ThemeOverrides> =
  Exclude<keyof ThemeOverrides, Built> extends never
    ? true
    : [
        "a theme group is missing from the diff",
        Exclude<keyof ThemeOverrides, Built>,
      ];

export type StoredTheme = ThemeOverridesSource & {
  readonly mode?: unknown;

  readonly contrast?: unknown;
};

export function restoreTheme(stored: StoredTheme | null | undefined): Theme {
  if (stored === null || stored === undefined) {
    return lightTheme;
  }
  return extendTheme(
    getTheme(themeModeOf(stored), themeContrastOf(stored)),
    stored,
  );
}

export function createTheme(config: ThemeConfig): Theme {
  const { mode, contrast = "default", ...overrides } = config;
  return extendTheme(getTheme(mode, contrast), overrides);
}

const styleContrastOf = (style: {
  readonly contrast?: unknown;
}): ThemeContrast =>
  isThemeContrast(style.contrast) ? style.contrast : "default";

const styleName = (
  base: Theme,
  style: { readonly label?: unknown },
): string => {
  const own = nameOf(base.name) ?? "Theme";
  const label = nameOf(style.label) ?? "";
  return label === "" ? own : `${own} · ${label}`;
};

const modeOf = <T>(
  group: Partial<Record<ThemeMode, T>> | null | undefined,
  mode: ThemeMode,
): T | undefined => group?.[mode] ?? undefined;

export interface PlatformStyleOptions {
  readonly keepPalette?: boolean;
}

export function applyStyle(
  base: Theme,
  style: PlatformStyleSource,
  options: PlatformStyleOptions = {},
): Theme {
  const contrast = themeContrastOf(base);

  const applies = contrast === styleContrastOf(style);
  const painted = applies && options.keepPalette !== true;
  const mode = themeModeOf(base);
  const themed = extendTheme(base, {
    name: styleName(base, style),
    typography: {
      ...style.type,
      sans: nameOf(style.sans),
      mono: nameOf(style.mono),
    },
    radius: style.radius ?? undefined,
    density: style.density ?? undefined,
    colors: painted ? modeOf(style.colors, mode) : undefined,
    series: painted ? modeOf(style.series, mode) : undefined,
    syntax: painted ? modeOf(style.syntax, mode) : undefined,
  });

  return {
    ...themed,
    switch: painted ? (modeOf(style.switch, mode) ?? undefined) : base.switch,
    switchMetrics: painted
      ? (style.switchMetrics ?? undefined)
      : base.switchMetrics,

    materials: painted ? modeOf(style.materials, mode) : base.materials,
    window: painted
      ? style.window === "blurred"
        ? "blurred"
        : undefined
      : base.window,
    interaction: applies
      ? style.interaction === "appkit"
        ? "appkit"
        : undefined
      : base.interaction,
  };
}

export function platformTheme(
  base: Theme,
  platform: PlatformName,
  options: PlatformStyleOptions = {},
): Theme {
  if (!isPlatformName(platform)) {
    throw new Error(
      `\`${platform}\` is not a platform style: ${platformNames.join(", ")} are the styles this release ships. A restored or configured choice is narrowed with \`isPlatformName\` before it reaches a theme.`,
    );
  }
  return applyStyle(base, platformStyles[platform], options);
}
