import {
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
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
  type PlatformStyleSource,
} from "./platforms.js";
import {
  borderWidth,
  controlSizes,
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
   * Use a density preset, replace the box with a whole one, or override its
   * metrics. A preset name and a **complete box** — the shape a stored theme
   * writes, its own `name` and every metric — replace the base's box, so the
   * preset a theme reports is the one it paints. A partial override keeps the
   * base preset's name and merges each control size, so a brand that raises one
   * size inherits the others.
   */
  readonly density?: DensityName | Density | DensityOverrides;
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
 * A shape as a store hands it back: every value may also be absent or `null`.
 *
 * JSON has no `undefined`, so a store writes `null` for a group, a role or a
 * table it never carried. An array is a value here rather than a shape to widen
 * (an elevation level, a series), so it keeps its own type beside `null`.
 *
 * Exported because the reports that measure a stored theme take their group as
 * this shape — `invalidNumbers` reads a `Stored<Spacing>`, `seriesColors` a
 * `Stored<SeriesColors>` — so a consumer's own decoder can type the value it
 * hands them without a cast.
 *
 * @example
 * ```ts
 * import type { Stored, Spacing } from "@gpuixui/tokens";
 *
 * const spacing: Stored<Spacing> = JSON.parse(row).spacing; // a step may be null
 * ```
 */
export type Stored<T> =
  T extends ReadonlyArray<unknown>
    ? T | null
    : T extends object
      ? { readonly [K in keyof T]?: Stored<T[K]> } | null
      : T | null;

/** The groups an override replaces whole, so a stored one is not merged. */
type WholeGroup = "series" | "syntax" | "switch" | "switchMetrics";

/**
 * A partial theme as a store hands it back.
 *
 * A theme is documented as storable, so the value a consumer rebuilds one from
 * is often `JSON.parse` of what it saved — and a shape typed as
 * {@link ThemeOverrides} cannot name the `null` JSON keeps. `null` is read as
 * "inherit the base's value", the rule {@link themeColors} and every report
 * already follow for the absence JSON writes.
 */
export type ThemeOverridesSource = {
  /**
   * The name a store wrote, as it wrote it.
   *
   * A theme's name is content — a picker's row, the header a preview prints —
   * and it arrives from a decoder as readily as from a literal: JSON keeps the
   * `null` of a name never carried, a cleared brand-editor field writes `""`,
   * and an export can write a number. The merge reads it as a name, so the port
   * takes the value the store wrote rather than one the boundary must assert.
   * It is not `Stored<string>` for that reason: `Stored` describes the value a
   * typed theme carries, and the name is the one field whose type a decoder can
   * falsify without changing what the theme means.
   */
  readonly name?: unknown;
} & {
  readonly [K in Exclude<keyof ThemeOverrides, "name">]?: K extends WholeGroup
    ? ThemeOverrides[K] | null
    : Stored<ThemeOverrides[K]>;
};

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
 * paints nothing. `null` is the same absence: it is what a store writes for a
 * role it never carried, and a merge that kept it handed the renderer a role
 * the `Theme` type promises is a colour.
 */
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

/**
 * The colour roles an override actually names.
 *
 * A role written as `null` inherits, and so does one written **blank**: `""` is
 * what a brand editor's cleared field writes, and it names no colour. Read as an
 * override it would erase the base's role and hand every paint seam a value the
 * renderer paints black; read as the absence it is, a cleared field returns the
 * theme to the base's own role — the rule `nameOf` already follows for a family
 * and a theme's name.
 */
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

/**
 * A name a theme can print or paint, or `undefined` when a store wrote none.
 *
 * Two fields are names: a font family and the theme's own name. Neither is a
 * label to interpolate — a decoder that writes a number, a boolean, a blank
 * string or whitespace has named nothing. A family read that way painted the
 * library's face while the theme's data claimed one; a **theme** name read that
 * way reached `styleName`'s `base.name.trim()`, which threw
 * `TypeError: base.name.trim is not a function` from the first style a window
 * applied. A value that names nothing leaves the base's own.
 */
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

/**
 * Whether an override is a **whole density box** rather than a partial one.
 *
 * A theme is serialised with the box it painted, so a store hands back the
 * preset's `name` and every metric; a brand edits the sizes it cares about and
 * leaves the name to the base. The name alone does not tell them apart — an
 * override may edit a preset's metrics and keep its name — so a box is whole
 * only when it carries a shipped name **and** every metric, which is the shape
 * nothing would have to inherit. A box that names a preset this release does not
 * ship is read as a partial override: its metrics still land, and the base
 * preset's name is the only one the theme can truthfully report.
 */
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
  // A whole box replaces the base's, so a stored theme reports the preset it
  // painted rather than the base's name over the stored metrics — a row reading
  // `density.name` highlighted the wrong preset for a restored platform style.
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
 * A group or a role written as `undefined` **or `null`** inherits the base's
 * value: `null` is what a store writes for the absence JSON has no `undefined`
 * for, so `extendTheme(lightTheme, JSON.parse(saved))` reads the shape the store
 * handed back instead of erasing a role or throwing on a nulled group
 * ({@link ThemeOverridesSource}).
 *
 * A **colour role written blank** is that same absence: `""` — or whitespace —
 * is what a brand editor's cleared field and an empty swatch in a theme file
 * write, and it names no colour, so the base's role is kept rather than replaced
 * by a value the renderer paints black.
 *
 * A **name** is read as a name. It is content — a picker's row, the header a
 * preview prints — and a decoder writes a number, a blank string or whitespace
 * as readily as a word, so a value that names nothing inherits the base's name,
 * and a base that carries none is `Theme`. Kept as written, a numeric name made
 * the theme report a number where its type promises a string, and the next
 * `applyStyle` over it threw `TypeError: base.name.trim is not a function`.
 *
 * A **base** a store truncated past the type scale or the density box is read
 * as the identity theme of the base's own mode and contrast for that group — the
 * values a painter answers anyway — because neither type has a partial form for
 * an override to edit. Reading the lost group directly threw
 * `Cannot read properties of null (reading 'sans')`. A flat group stays as the
 * base wrote it, so a role an override does not name is still absent for the
 * gate.
 *
 * @example
 * ```ts
 * const brand = extendTheme(darkTheme, {
 *   name: "Acme",
 *   colors: { primary: "#B49CFF", primaryForeground: "#1C1547" },
 * });
 * ```
 */
export function extendTheme(
  base: Theme,
  overrides: ThemeOverridesSource,
): Theme {
  // A whole group a store truncated past reads as the identity theme of the
  // base's own mode and contrast **for the two groups a merge cannot express
  // partially**: a type scale and a density box are complete types, so an
  // override edits the library's own where a painter would have answered it
  // (`textStyle`, `nativeTextTheme`). Reading the lost group threw
  // `Cannot read properties of null (reading 'sans')` out of the one seam a
  // restored brand reaches. A flat group stays as the base wrote it — the roles
  // an override does not name stay absent for the gate, which is the `no colour
  // is invented` rule `paletteToTokens` relies on.
  const identity = getTheme(themeModeOf(base), themeContrastOf(base));
  const colors = overlay(base.colors, namedRoles(overrides.colors));
  // A level's strength is its share of the shadow role, so a brand that retints
  // the role retints every shadow it inherits. A level passed in `elevation`
  // replaces the whole array, colours and all. A shadow a store wrote as absent
  // is no retint at all, rather than a restatement of the base's own tint.
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
 * A stored theme as a boundary decodes it: the overrides a store keeps, plus the
 * two labels that say which base they belong on.
 *
 * It is {@link ThemeOverridesSource} — the shape whose groups and roles may be
 * `null` — with the `mode` and `contrast` a saved `Theme` also carries. Neither
 * label is a value of the theme an override can move; here they are read once,
 * to choose the base {@link restoreTheme} starts from.
 */
export type StoredTheme = ThemeOverridesSource & {
  /** The mode the theme was saved from, as the store wrote it. */
  readonly mode?: unknown;
  /** The contrast variant it was saved from, as the store wrote it. */
  readonly contrast?: unknown;
};

/**
 * Rebuild a theme a store handed back: the shipped theme its own mode and
 * contrast variant name, with the stored values merged on top.
 *
 * {@link extendTheme} keeps its base's `mode` and `contrast` by design — they are
 * what the numbers mean, so an override may not move them — but a whole theme
 * saved to storage carries the labels it was saved from. Passing that value to
 * `extendTheme` under a fixed base therefore restored a dark theme's roles onto
 * a theme that still called itself light: every surface painted dark while
 * `theme.mode` said light, and the painting seams that read the mode through
 * `themeModeOf` handed it the **light** chart scale and the light code palette
 * on its dark fills. This seam reads the stored labels first, so the base is the
 * one they name, and then merges the stored groups with the same rules
 * `extendTheme` applies: a group or a role written as `null` inherits, a
 * complete density box keeps its preset name, and nothing is mutated.
 *
 * The labels are read through {@link themeModeOf} and {@link themeContrastOf},
 * the total reads a painter makes, so a label this release no longer ships is
 * read from the page the theme carries (the upper-cased `Dark` one store wrote)
 * and an unshipped contrast variant is held to the **strict** one rather than
 * downgrading a high-contrast palette. A label the theme does not carry at all
 * restores onto the light default theme, the mode `getTheme` starts from.
 *
 * A store that kept **no theme** at all — the `null` JSON writes for a row that
 * was never saved, the `undefined` a settings value that never held one reads
 * as — is that same absence one value up, and answers the light theme itself.
 * Reading the two labels off it threw `Cannot read properties of null (reading
 * 'mode')` out of the seat a store-based consumer calls after {@link missingTokens}
 * has already answered the value as nothing.
 *
 * Nothing is decoded here: the application's boundary still turns its own file
 * or column into {@link StoredTheme}, and {@link missingTokens} and
 * {@link auditTheme} still own whether the result is complete and shippable.
 *
 * @example
 * ```ts
 * import { auditTheme, restoreTheme } from "@gpuixui/tokens";
 *
 * const saved = decodeTheme(JSON.parse(fromStorage)); // your boundary
 * const theme = restoreTheme(saved);
 * auditTheme(theme).passed;
 * ```
 */
export function restoreTheme(stored: StoredTheme | null | undefined): Theme {
  // `null` is a store's "saved nothing" (JSON has no `undefined`) and a settings
  // value can be `undefined`; both are no theme rather than a theme whose labels
  // are absent, and both answered `Cannot read properties of null (reading
  // 'mode')` before this — the one seam a store-based consumer calls.
  if (stored === null || stored === undefined) {
    return lightTheme;
  }
  return extendTheme(
    getTheme(themeModeOf(stored), themeContrastOf(stored)),
    stored,
  );
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
 * The contrast variant a style is designed for.
 *
 * A style's palette is authored against the floors of one variant and every
 * shipped style declares `default`; a base that needs more keeps its own. A
 * label a store lost, or one this release does not ship, is therefore the
 * default variant rather than the strict one: a look is not an accessibility
 * claim, and reading an unknown label as `"high"` made it match no ordinary base
 * — so the palette the style still carried was dropped without a report.
 */
const styleContrastOf = (style: {
  readonly contrast?: unknown;
}): ThemeContrast =>
  isThemeContrast(style.contrast) ? style.contrast : "default";

/**
 * The name a themed style prints: the base's name and the style's label.
 *
 * Both halves are names a store wrote, so each is read by `nameOf`: an absent,
 * blank or non-string label leaves the base's name whole rather than printing
 * `Dark · null`, and a **base** whose name is not a name — a theme restored from
 * a store that wrote a number there — is `Theme` rather than the
 * `TypeError: base.name.trim is not a function` a direct read threw on the first
 * style a window applied.
 */
const styleName = (
  base: Theme,
  style: { readonly label?: unknown },
): string => {
  const own = nameOf(base.name) ?? "Theme";
  const label = nameOf(style.label) ?? "";
  return label === "" ? own : `${own} · ${label}`;
};

/**
 * One mode's slice of a style group, read as the value a store hands back: a
 * group the store lost, or a mode it never carried, is `undefined` rather than
 * the `TypeError` a direct index threw on `null`.
 */
const modeOf = <T>(
  group: Partial<Record<ThemeMode, T>> | null | undefined,
  mode: ThemeMode,
): T | undefined => group?.[mode] ?? undefined;

/**
 * A theme wearing one style: the base theme's mode and elevation, with the
 * style's families, radii, density and chrome colours. A high-contrast base
 * keeps its own colours — accessibility outranks the look — and takes only the
 * families, radii and density.
 *
 * This is the whole mechanism behind {@link platformTheme}. A consumer who
 * authored a style of their own in the `PlatformStyle` shape applies it the same
 * way; no registry is involved.
 *
 * **The style is read as a store hands it back.** A style is documented as
 * copyable and editable, so the value a consumer applies is often a file its
 * boundary decoded: a group may be `null` where it carried none and the label it
 * was saved with may be absent. Reading only the authored shape made that route
 * impossible without a cast (`AGENTS.md` §2) and failed three ways once it got
 * there — a lost `colors` group threw `TypeError: Cannot read properties of null
 * (reading 'dark')`, a lost `label` named the theme `Dark · null`, and a lost
 * `contrast` label **silently dropped the palette the style still carried**,
 * because an unstated variant was compared with the base's instead of read. Every
 * group now keeps the base's where the style lost it, a family is read as a name,
 * and a style that states no variant is read as `default` — the variant every
 * shipped style declares — while a high-contrast base still keeps its own palette.
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
export function applyStyle(base: Theme, style: PlatformStyleSource): Theme {
  const contrast = themeContrastOf(base);
  // A palette — and the scale its plots are drawn in — is designed against the
  // floors of one contrast variant; a base that needs more keeps its own. A style
  // that states no variant states nothing to compare, and the variant a look is
  // authored against is the default one — reading it as the strict variant
  // dropped a saved style's palette on every ordinary base.
  const applies = contrast === styleContrastOf(style);
  const mode = themeModeOf(base);
  const themed = extendTheme(base, {
    name: styleName(base, style),
    typography: {
      sans: nameOf(style.sans),
      mono: nameOf(style.mono),
    },
    radius: style.radius ?? undefined,
    density: style.density ?? undefined,
    colors: applies ? modeOf(style.colors, mode) : undefined,
    series: applies ? modeOf(style.series, mode) : undefined,
    syntax: applies ? modeOf(style.syntax, mode) : undefined,
  });
  // A switch paint belongs to the look, not to the base: an authored look
  // declares none, so applying it over a platform's theme clears the platform's
  // toggle instead of leaving a green Apple switch in Luna's chrome. A style that
  // lost the group in storage is that same "declares none".
  return {
    ...themed,
    switch: applies ? (modeOf(style.switch, mode) ?? undefined) : base.switch,
    switchMetrics: applies
      ? (style.switchMetrics ?? undefined)
      : base.switchMetrics,
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
