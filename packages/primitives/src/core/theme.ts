/**
 * The theme a primitive draws with.
 *
 * This is a **structural port**, not an import of `@gpuixui/tokens`: primitives
 * declares exactly the shape it reads, so the package compiles and its tests
 * run before the tokens package is merged in, and any theme that carries these
 * groups works. Every field is a value, never a literal — no colour, size,
 * radius or font appears outside `core/` and the test fixture.
 *
 * The port mirrors `@gpuixui/tokens`' `Theme` group for group and name for
 * name (`colors`, `typography`, `spacing`, `radius`, `density`, `elevation`,
 * `borderWidth`, `iconSize`), so `lightTheme` from that package satisfies it
 * with no adapter. It declares only the roles a primitive renders; the full
 * 47-role set, including status tones, stays in `@gpuixui/tokens`.
 *
 * `TODO:` depend on `@gpuixui/tokens` directly and delete this declaration once
 * the tokens package is in the tree — its `exports` points at an uncommitted
 * `dist`, so a consumer cannot resolve it yet.
 */

/** Light or dark. A primitive never branches on this beyond a check. */
export type ThemeMode = "light" | "dark";

/** Weight accepted by GPUix's `StyleDesc.fontWeight`. */
export type FontWeight = 400 | 500 | 600 | 700;

/** One typographic role: size, leading and weight. */
export interface TextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
}

/** The named type roles components use, so no component picks a pixel size. */
export type TextRole =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "code"
  | "codeBlock";

/** Font families and the type scale, keyed by role. */
export type Typography = { readonly sans: string; readonly mono: string } & {
  readonly [role in TextRole]: TextStyle;
};

/** Spacing scale, shared by padding, margin and gap. */
export interface Spacing {
  readonly "2xs": number;
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly "2xl": number;
  readonly "3xl": number;
  readonly "4xl": number;
  readonly "5xl": number;
}

/** A step on the spacing scale: `theme.spacing[step]`. */
export type SpaceStep = keyof Spacing;

/** Corner radius scale. */
export interface Radius {
  readonly none: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly full: number;
}

/** A step on the radius scale: `theme.radius[step]`. */
export type RadiusStep = keyof Radius;

/** Control sizes every interactive component supports. */
export type ControlSize = "sm" | "md" | "lg";

/** Named control density presets. */
export type DensityName = "compact" | "comfortable" | "spacious";

/** Density-dependent control metrics. Density moves numbers, never colours. */
export interface Density {
  readonly name: DensityName;
  readonly controlHeight: Readonly<Record<ControlSize, number>>;
  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;
  readonly rowHeight: number;
}

/**
 * A drop shadow, structurally identical to GPUix's `StyleDesc.boxShadow`.
 * GPUix paints one shadow per element, so a theme's shadow list is resolved to
 * its first entry rather than composited.
 */
export interface ThemeShadow {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blurRadius: number;
  readonly spreadRadius: number;
  readonly color: string;
}

/** Shadow levels, each a list painted in order by web renderers. */
export interface Elevation {
  readonly sm: ReadonlyArray<ThemeShadow>;
  readonly md: ReadonlyArray<ThemeShadow>;
  readonly lg: ReadonlyArray<ThemeShadow>;
  readonly overlay: ReadonlyArray<ThemeShadow>;
}

/** A level a surface can be raised to. */
export type ElevationLevel = keyof Elevation;

/** Border thicknesses. */
export interface BorderWidth {
  readonly thin: number;
  readonly strong: number;
}

/** Square icon sizes, on the same scale as the icon package. */
export interface ThemeIconSize {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
}

/** The semantic colour roles a primitive renders. */
export interface ThemeColors {
  readonly background: string;
  readonly foreground: string;
  readonly card: string;
  readonly cardForeground: string;
  readonly popover: string;
  readonly popoverForeground: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly secondary: string;
  readonly secondaryForeground: string;
  readonly muted: string;
  readonly mutedForeground: string;
  readonly accent: string;
  readonly accentForeground: string;
  readonly destructive: string;
  readonly destructiveForeground: string;
  readonly success: string;
  readonly successForeground: string;
  readonly border: string;
  /** Control boundaries, held to a non-text contrast floor. */
  readonly borderStrong: string;
  readonly input: string;
  readonly inputForeground: string;
  readonly placeholder: string;
  readonly ring: string;
  readonly selection: string;
  readonly overlay: string;
  /** Hover wash for low-emphasis surfaces. */
  readonly hover: string;
  /** Pressed wash for low-emphasis surfaces. */
  readonly active: string;
  readonly selected: string;
  readonly selectedForeground: string;
  readonly disabled: string;
  readonly disabledForeground: string;
  readonly skeleton: string;
  readonly scrollbar: string;
  readonly shadow: string;
}

/** Everything a primitive may draw with. Nothing else. */
export interface PrimitiveTheme {
  readonly name: string;
  readonly mode: ThemeMode;
  readonly colors: ThemeColors;
  readonly typography: Typography;
  readonly spacing: Spacing;
  readonly radius: Radius;
  readonly density: Density;
  readonly elevation: Elevation;
  readonly borderWidth: BorderWidth;
  readonly iconSize: ThemeIconSize;
}

/**
 * How a colour is reached from a theme.
 *
 * A function rather than a dot-path string: a misspelled path is a compile
 * error, and a variant can derive a colour instead of only naming one.
 */
export type ColorRef = (theme: PrimitiveTheme) => string;
