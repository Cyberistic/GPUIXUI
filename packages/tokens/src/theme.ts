import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  darkElevation,
  elevationWithTint,
  highContrastDarkElevation,
  highContrastLightElevation,
  lightElevation,
  type Elevation,
} from "./elevation.js";
import {
  isPlatformName,
  platformNames,
  platformStyles,
  type PlatformName,
  type PlatformStyle,
} from "./platforms.js";
import { pageMode } from "./luminance.js";
import {
  borderWidth,
  defaultDensity,
  densityNames,
  densityPresets,
  iconSize,
  isDensityName,
  radius,
  spacing,
  type BorderWidth,
  type ControlSize,
  type Density,
  type DensityName,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import type { SeriesColors } from "./series.js";
import type { SyntaxColors } from "./syntax.js";
import { typography, type TextStyle, type Typography } from "./typography.js";

/**
 * Theme modes the library ships, in documentation order. `ThemeMode` derives
 * from this list, so a new mode must also gain a value in `themes` and
 * `highContrastThemes`.
 */
export const themeModes = ["light", "dark"] as const;

/** Theme modes the library ships. */
export type ThemeMode = (typeof themeModes)[number];

/**
 * Contrast variants the library ships, in documentation order. `ThemeContrast`
 * derives from this list, so a new variant must also gain a set of floors and a
 * theme per mode.
 */
export const themeContrasts = ["default", "high"] as const;

/** Contrast variants the library ships, independent of light/dark mode. */
export type ThemeContrast = (typeof themeContrasts)[number];

/**
 * Narrow unknown input — a stored preference — to a theme mode. This is not a
 * theme decoder: it checks the axis only, and a consumer iterates
 * {@link themeModes} instead of retyping the modes.
 */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((mode) => mode === value);

/**
 * Narrow unknown input to a contrast variant. Not a theme decoder, and a
 * consumer iterates {@link themeContrasts} rather than retyping them.
 */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  themeContrasts.some((contrast) => contrast === value);

/**
 * The contrast variant a theme's **values** are read as.
 *
 * The variant decides which floors every pair is measured against
 * (`contrastFloorsFor`) and which palette a native host is handed
 * (`syntaxColors`, `seriesColors`), so an unrecognised one is not a cosmetic
 * detail: read as the default it **downgrades an accessibility claim**, because
 * a high-contrast theme stored with an upper-cased `HIGH` was measured against
 * the AA floors, highlighted with the default palette, and `auditTheme(...)
 * .passed` said yes. A value this release does not ship is therefore read as the
 * **strict** variant — a theme that cannot say which floors it was designed for
 * is held to the stronger ones, and its report names the pair that misses — while
 * an absent or `null` variant is the "declares nothing" a hand-built theme is
 * and reads as `default`.
 *
 * Narrow a stored preference with {@link isThemeContrast} where the caller can
 * tell the reader which variant it substituted; this is the read a paint or
 * report seam makes, where there is no one to tell.
 *
 * @example
 * ```ts
 * import { highContrastDarkTheme, lightTheme, themeContrastOf } from "@gpuixui/tokens";
 *
 * themeContrastOf(highContrastDarkTheme); // "high"
 * themeContrastOf({ ...lightTheme, contrast: "HIGH" }); // "high" — the strict variant
 * ```
 */
export const themeContrastOf = (theme: {
  readonly contrast?: unknown;
}): ThemeContrast => {
  const stated = theme.contrast;
  if (stated === undefined || stated === null) {
    return "default";
  }
  return isThemeContrast(stated) ? stated : "high";
};

/**
 * The mode a theme's **values** are read as.
 *
 * The mode decides which categorical and syntax tables a painter is handed
 * (`seriesColors`, `syntaxColors`), the appearance a native text host is given
 * (`nativeTextTheme`), and which of a platform style's two palettes `applyStyle`
 * wears. A theme is documented as storable, so a value this release does not
 * ship reaches those seams — an upper-cased `Dark`, a release's old name, a
 * theme another app wrote. Read as light it handed a dark palette the **light**
 * tables: a code block highlighted for a light canvas, a chart drawn in the
 * light categorical scale, and a platform style that applied its radii and
 * families but not its colours.
 *
 * A value this release does not ship — or none at all — is therefore read from
 * the page the theme carries: a fill closer to white is a light theme's page,
 * because that theme's ink is designed to read on it. That is the one question
 * the palette can answer without trusting the label, and it is the rule
 * {@link paletteMode} already follows for a system palette. A page no colour
 * grammar reads keeps `light`, the mode `getTheme` starts from.
 *
 * Narrow a stored preference with {@link isThemeMode} where the caller can tell
 * the reader which mode it substituted; this is the read a paint or report seam
 * makes, where there is no one to tell.
 *
 * @example
 * ```ts
 * import { darkTheme, lightTheme, themeModeOf } from "@gpuixui/tokens";
 *
 * themeModeOf(darkTheme); // "dark"
 * themeModeOf({ ...darkTheme, mode: "Dark" }); // "dark" — read from its page
 * ```
 */
export const themeModeOf = (
  theme: ColourSource & { readonly mode?: unknown },
): ThemeMode => {
  const stated = theme.mode;
  if (isThemeMode(stated)) {
    return stated;
  }
  return pageMode(themeColors(theme).background) ?? "light";
};

/**
 * A complete, resolved design theme. Every field is plain data, so a theme can
 * be passed through React context, stored, or built at startup.
 */
export interface Theme {
  /** Human-readable theme name, used by previews and diagnostics. */
  readonly name: string;
  /**
   * The mode this theme was built for. Never changed by an override. A value a
   * store wrote that this release does not ship is read through
   * {@link themeModeOf}, which reads the mode the theme's page implies.
   */
  readonly mode: ThemeMode;
  /**
   * The contrast variant this theme carries. Absent on a hand-built theme, so
   * a caller can tell a high-contrast theme from an ordinary one — which is how
   * {@link platformTheme} knows to keep its colours.
   */
  readonly contrast?: ThemeContrast;
  /** Semantic colour roles. */
  readonly colors: ThemeColors;
  /** Font families and type roles. */
  readonly typography: Typography;
  /** Spacing scale. */
  readonly spacing: Spacing;
  /** Corner radii. */
  readonly radius: Radius;
  /** Control metrics for the active density. */
  readonly density: Density;
  /** Shadow levels. */
  readonly elevation: Elevation;
  /** Border thicknesses. */
  readonly borderWidth: BorderWidth;
  /** Icon sizes. */
  readonly iconSize: IconSize;
  /**
   * The categorical scale data marks are painted in. Absent on every shipped
   * theme, which resolves the scale for its mode and contrast variant; a brand
   * that carries one replaces the five-colour table whole.
   */
  readonly series?: SeriesColors;
  /**
   * The palette a native `<code>` host highlights with. Absent on every shipped
   * theme, which resolves the table for its mode and contrast variant; a theme
   * that carries one replaces the table whole.
   */
  readonly syntax?: SyntaxColors;
  /**
   * The paint a platform's own switch declares. Absent on every base theme,
   * which paints a switch from the accent family; a style that carries one
   * hands the component the native control's own colours — Apple's green on,
   * grey off and white knob — which are not roles the accent can derive.
   *
   * It is a value of the theme like any other: an application that starts from a
   * platform style and wants its own toggle replaces it through
   * {@link ThemeOverrides.switch}, and a theme that carries none keeps the
   * accent switch.
   */
  readonly switch?: SwitchColors;
  /**
   * The box a platform's own switch paints: its track, knob and inset. Absent
   * on every base theme, which derives the box from the icon step; a style that
   * declares a switch also owns the box the platform ships it in.
   */
  readonly switchMetrics?: SwitchMetrics;
}

/** The colours a platform's own switch paints, in one mode. */
export interface SwitchColors {
  /** The track of an on switch. */
  readonly on: string;
  /** The track of an off switch. */
  readonly off: string;
  /** The knob that slides between the two tracks. */
  readonly knob: string;
  /**
   * The outline an off track draws when its fill is not the silhouette —
   * Windows' transparent track, whose 1px border is the control's edge. An on
   * track always takes its own fill as the edge.
   */
  readonly edge?: string;
}

/** The fixed box a platform's own switch paints, in pixels. */
export interface SwitchMetrics {
  /** Track width. */
  readonly width: number;
  /** Track height. */
  readonly height: number;
  /** The knob's side. */
  readonly knob: number;
  /** The gap between the knob and the track's edge. */
  readonly inset: number;
  /** The track's edge thickness. */
  readonly border: number;
}

/**
 * Partial typography overrides. Text roles merge field by field, so changing a
 * body size keeps the base leading and weight.
 */
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

/**
 * Density metrics a brand may override. Every control size is optional and the
 * sizes an override does not name inherit from the base preset, so raising one
 * size cannot drop the steps the audit gate requires.
 */
export interface DensityOverrides {
  /** Control and input height per size; an omitted size inherits. */
  readonly controlHeight?: Partial<Record<ControlSize, number>>;
  /** Horizontal control padding per size; an omitted size inherits. */
  readonly controlPaddingX?: Partial<Record<ControlSize, number>>;
  /** A row's height — a dense list, tree or log row, or a scroller's line. */
  readonly rowHeight?: number;
}

/**
 * A partial theme. Every group a theme carries is overridable except its `mode`
 * and `contrast` variant — those two are what the numbers mean, so a caller that
 * wants the other one asks `getTheme` for it — and a group added to {@link Theme}
 * without an override fails the package's type check. Omitted groups inherit
 * from the base theme. Elevation arrays replace rather than concatenate.
 */
export interface ThemeOverrides {
  /** Override the theme name. */
  readonly name?: string;
  /** Override individual semantic colour roles. */
  readonly colors?: Partial<ThemeColors>;
  /** Override font families or text roles. */
  readonly typography?: TypographyOverrides;
  /** Override individual spacing steps. */
  readonly spacing?: Partial<Spacing>;
  /** Override individual radii. */
  readonly radius?: Partial<Radius>;
  /**
   * Use a density preset, or override density metrics. A partial override
   * keeps the base preset's name and merges each control size, so a brand that
   * raises one size inherits the others.
   */
  readonly density?: DensityName | DensityOverrides;
  /** Replace individual elevation levels. */
  readonly elevation?: Partial<Elevation>;
  /** Override border thicknesses. */
  readonly borderWidth?: Partial<BorderWidth>;
  /** Override icon sizes. */
  readonly iconSize?: Partial<IconSize>;
  /**
   * Replace the categorical data scale whole. A partial array is not a merge:
   * the five positions are an order a chart and its legend both read.
   */
  readonly series?: SeriesColors;
  /**
   * Replace the syntax palette whole. A palette is complete — every token type
   * the runtime reads — so a brand that recolors one keyword spreads the resolved
   * table it wants to keep: `syntax: { ...syntaxColors(theme), keyword: … }`.
   */
  readonly syntax?: SyntaxColors;
  /**
   * Replace the platform switch paint whole, or declare one on a theme that
   * carries none. A style declares one when its platform's toggle is not the
   * accent family (`PlatformStyle.switch`); an application that starts from that
   * style and wants its own toggle names all three slots here, because a slot
   * the renderer cannot read paints nothing — `switchFailures` names the slot a
   * paint lost. A theme that carries none keeps the accent switch, and an
   * override written as `undefined` inherits the base's paint rather than
   * erasing it.
   */
  readonly switch?: SwitchColors;
  /** Replace the platform switch box whole, or declare one on a theme. */
  readonly switchMetrics?: SwitchMetrics;
}

/**
 * The theme keys an override cannot change.
 *
 * A mode and a contrast variant are what its numbers mean: every floor and
 * every contract is read through them, so a caller that wants another variant
 * asks `getTheme` for it rather than repainting a dark theme's roles and
 * calling it light.
 */
type FixedThemeKey = "mode" | "contrast";

/**
 * A theme group the extension mechanism does not reach, as a build error.
 *
 * The library's promise is that a consumer starts from a shipped style and
 * edits any of its values, so every group a `Theme` carries is a
 * {@link ThemeOverrides} key. A group added without one would be a group a
 * brand receives and can never change — and, because the optional groups are
 * copied one by one in {@link extendTheme}, one it could silently lose. The
 * assignment below fails the package's type check with the missing group named.
 */
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
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void groupsOverridable;

/** Input to {@link createTheme}: a mode, a contrast variant and overrides. */
export interface ThemeConfig extends ThemeOverrides {
  readonly mode: ThemeMode;
  /** Contrast variant to start from; the default palette when absent. */
  readonly contrast?: ThemeContrast;
}

/**
 * Overlay a group's defined overrides on a base group. A key present with
 * `undefined` — an optional value a caller forwarded unchanged — inherits
 * instead of erasing, because a theme's groups are complete and an erased role
 * paints nothing.
 */
const overlay = <T extends object>(
  base: T,
  overrides: Partial<T> | undefined,
): T => {
  if (overrides === undefined) {
    return base;
  }
  const defined = Object.entries(overrides).filter(
    ([, value]) => value !== undefined,
  );
  return { ...base, ...Object.fromEntries(defined) };
};

const mergeTypography = (
  base: Typography,
  override: TypographyOverrides | undefined,
): Typography => {
  if (override === undefined) {
    return base;
  }
  return {
    sans: override.sans ?? base.sans,
    mono: override.mono ?? base.mono,
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

const mergeDensity = (
  base: Density,
  override: DensityName | DensityOverrides | undefined,
): Density => {
  if (override === undefined) {
    return base;
  }
  if (typeof override === "string") {
    // A preset name is a stored preference as often as a literal, so the type
    // cannot vouch for it. The lookup it used to be answered `undefined` and
    // returned a theme with no density group: the first control beside it read
    // `Cannot read properties of undefined (reading 'controlHeight')`, and the
    // gate blamed a stored theme rather than the name.
    if (!isDensityName(override)) {
      throw new Error(
        `\`${override}\` is not a density preset: ${densityNames.join(", ")} are the presets this release ships. A restored or configured choice is narrowed with \`isDensityName\` before it reaches a theme.`,
      );
    }
    return densityPresets[override];
  }
  return {
    name: base.name,
    controlHeight: overlay(base.controlHeight, override.controlHeight),
    controlPaddingX: overlay(base.controlPaddingX, override.controlPaddingX),
    rowHeight: override.rowHeight ?? base.rowHeight,
  };
};

/** The default light theme. */
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

/** The default dark theme. */
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

/** Themes by mode, for application mode switches. */
export const themes: Readonly<Record<ThemeMode, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
};

/** The high-contrast light theme. */
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

/** The high-contrast dark theme. */
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

/** High-contrast themes by mode. */
export const highContrastThemes: Readonly<Record<ThemeMode, Theme>> = {
  light: highContrastLightTheme,
  dark: highContrastDarkTheme,
};

/**
 * Return a built-in theme for a mode and contrast level. The default contrast
 * keeps the existing behaviour, so `getTheme("dark")` is unchanged.
 *
 * A mode and a contrast variant are stored preferences as often as literals, so
 * a value this release does not ship is refused rather than resolved: the lookup
 * answered `undefined` for a mode a release dropped, and painted the **default**
 * palette for a contrast it did not recognise — a quiet accessibility regression
 * for anyone restoring `HIGH`. Narrow a restored value with {@link isThemeMode}
 * and {@link isThemeContrast} first.
 *
 * @example
 * ```ts
 * const accessible = getTheme("dark", "high");
 * ```
 */
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

/**
 * Derive a theme from a base theme without mutating it.
 *
 * @example
 * ```ts
 * const brand = extendTheme(darkTheme, {
 *   name: "Acme",
 *   colors: { primary: "#B49CFF", primaryForeground: "#1C1547" },
 * });
 * ```
 */
export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme {
  const colors = overlay(base.colors, overrides.colors);
  // A level's strength is its share of the shadow role, so a brand that retints
  // the role retints every shadow it inherits. A level passed in `elevation`
  // replaces the whole array, colours and all.
  const elevation =
    overrides.colors?.shadow === undefined
      ? base.elevation
      : elevationWithTint(base.elevation, colors.shadow);
  return {
    name: overrides.name ?? base.name,
    mode: base.mode,
    contrast: base.contrast,
    colors,
    typography: mergeTypography(base.typography, overrides.typography),
    spacing: overlay(base.spacing, overrides.spacing),
    radius: overlay(base.radius, overrides.radius),
    density: mergeDensity(base.density, overrides.density),
    elevation: overlay(elevation, overrides.elevation),
    borderWidth: overlay(base.borderWidth, overrides.borderWidth),
    iconSize: overlay(base.iconSize, overrides.iconSize),
    series: overrides.series ?? base.series,
    // A complete palette, like a series: twenty-four token types are the set the
    // runtime reads, so a partial one would leave a token on the runtime's own
    // colour. A brand edits one token by spreading the table it keeps.
    syntax: overrides.syntax ?? base.syntax,
    // A switch is one control's paint in three slots; a half-declared one paints
    // the slots it lost with nothing, so an override replaces the set whole. An
    // override that names none keeps the base's declaration — the accent switch
    // when the base carries none.
    switch: overrides.switch ?? base.switch,
    switchMetrics: overrides.switchMetrics ?? base.switchMetrics,
  };
}

/**
 * Build a theme for a mode, starting from the built-in theme of the requested
 * contrast variant.
 *
 * @example
 * ```ts
 * const brand = createTheme({
 *   mode: "dark",
 *   contrast: "high",
 *   name: "Acme",
 *   colors: { primary: "#CBC2FF", primaryForeground: "#1C1547" },
 *   density: "compact",
 * });
 * ```
 */
export function createTheme(config: ThemeConfig): Theme {
  const { mode, contrast = "default", ...overrides } = config;
  return extendTheme(getTheme(mode, contrast), overrides);
}

/**
 * A theme wearing one style: the base theme's mode and elevation, with the
 * style's families, radii, density and chrome colours. A high-contrast base
 * keeps its own colours — accessibility outranks the look — and takes only the
 * families, radii and density.
 *
 * This is the whole mechanism behind {@link platformTheme}. A consumer who
 * authored a style of their own in the {@link PlatformStyle} shape applies it
 * the same way; no registry is involved.
 *
 * `extendTheme` does the merge, so the base is never mutated. The result is an
 * ordinary theme: layer `extendTheme` on top to keep the look but change a
 * value.
 *
 * A style is a look over a base, not a layer over a look. Every palette here is
 * partial and designed against its own base, so two styles stacked mix their
 * colours and the gate rejects the result (`compose.test.ts` holds the measured
 * pairs). The order is base, style, brand.
 *
 * @example
 * ```tsx
 * import { applyStyle, platformStyles, themes } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={applyStyle(themes.dark, platformStyles.darwin)} />
 * ```
 */
export function applyStyle(base: Theme, style: PlatformStyle): Theme {
  const contrast = themeContrastOf(base);
  // A palette — and the scale its plots are drawn in — is designed against the
  // floors of one contrast variant; a base that needs more keeps its own.
  const applies = contrast === style.contrast;
  const mode = themeModeOf(base);
  const themed = extendTheme(base, {
    name: `${base.name} · ${style.label}`,
    typography: { sans: style.sans, mono: style.mono },
    radius: style.radius,
    density: style.density,
    colors: applies ? style.colors[mode] : undefined,
    series: applies ? style.series?.[mode] : undefined,
    syntax: applies ? style.syntax?.[mode] : undefined,
  });
  // A switch paint belongs to the look, not to the base: an authored look
  // declares none, so applying it over a platform's theme clears the platform's
  // toggle instead of leaving a green Apple switch in Luna's chrome.
  return {
    ...themed,
    switch: applies ? style.switch?.[mode] : base.switch,
    switchMetrics: applies ? style.switchMetrics : base.switchMetrics,
  };
}

/**
 * A theme for one platform, by name — `applyStyle` over
 * {@link platformStyles}.
 *
 * A platform name is a stored preference as often as a literal, so a name this
 * release does not style is refused rather than looked up: `applyStyle` read the
 * absent style's `contrast` and threw `Cannot read properties of undefined
 * (reading 'contrast')`. Narrow a restored value with {@link isPlatformName}
 * first.
 *
 * @example
 * ```tsx
 * import { platformTheme, themes } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={platformTheme(themes.dark, "win32")} />
 * ```
 */
export function platformTheme(base: Theme, platform: PlatformName): Theme {
  if (!isPlatformName(platform)) {
    throw new Error(
      `\`${platform}\` is not a platform style: ${platformNames.join(", ")} are the styles this release ships. A restored or configured choice is narrowed with \`isPlatformName\` before it reaches a theme.`,
    );
  }
  return applyStyle(base, platformStyles[platform]);
}
