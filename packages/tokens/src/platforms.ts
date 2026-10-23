/**
 * Platform styles.
 *
 * GPUix takes one `fontFamily` string per element, and GPUI resolves the
 * `.SystemUIFont` sentinel to the operating system's own UI font, so the UI face
 * follows the platform at runtime. What a component cannot infer is the
 * platform's monospace family, its corner radii, the control density its native
 * windows use, or which platform a preview is showing. All of it comes from
 * here: one table a consumer can copy, edit and ship.
 */

import type { ThemeColors } from "./color.js";
import {
  radius as defaultRadius,
  type DensityName,
  type Radius,
} from "./scale.js";
import type { SeriesColors } from "./series.js";
import { darkSyntax, type SyntaxColors } from "./syntax.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

/** GPUI's system UI font sentinel; it resolves to each platform's own UI font. */
export const systemUiFont = ".SystemUIFont";

/**
 * Platforms the library knows, in documentation order. `PlatformName` derives
 * from this list, so a new platform must also gain a style in `platformStyles`.
 */
export const platformNames = ["darwin", "linux", "win32", "default"] as const;

/** A platform a GPUIXUI application runs on. */
export type PlatformName = (typeof platformNames)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a
 * platform. A consumer iterates {@link platformNames} instead of retyping the
 * four names.
 */
export const isPlatformName = (value: unknown): value is PlatformName =>
  platformNames.some((name) => name === value);

/** The families one platform's type resolves to. */
export interface PlatformType {
  /** Human-readable name for documentation and previews. */
  readonly label: string;
  /** UI font family. */
  readonly sans: string;
  /** The monospace family the platform has installed. */
  readonly mono: string;
}

/** The chrome roles a platform style changes, per mode. */
export type PlatformColors = Readonly<Record<ThemeMode, Partial<ThemeColors>>>;

/**
 * One look: the families its type resolves to, the radii and control density its
 * controls use, and the chrome roles it paints in each mode. `platformStyles` is
 * one table of these keyed by operating system; `retroStyles` is another keyed by
 * era, and a consumer can author a third, because `applyStyle` takes this shape
 * rather than a name. A role a style omits keeps the base theme's value.
 */
export interface PlatformStyle extends PlatformType {
  /** Corner radii the platform's own controls use. */
  readonly radius: Radius;
  /** Control density preset the platform's native controls sit at. */
  readonly density: DensityName;
  /** The roles the platform repaints, in each mode. */
  readonly colors: PlatformColors;
  /**
   * The categorical scale the look paints its data marks in, per mode. A mode it
   * omits — and every style that declares none — resolves the base theme's scale
   * for that mode and contrast variant, which is where the library's own tables
   * are designed to be read.
   *
   * A look that repaints the surfaces a plot is drawn on needs its own: Luna's
   * beige page (`#ECE9D8`) and deeper toolbar (`#E0DCCB`) swallow the shared
   * light amber, which measures 2.75:1 on that toolbar — one series a reader
   * cannot find — so the look carries a scale designed for its own strips.
   *
   * It follows the same rule as {@link colors}: a base theme of another contrast
   * variant keeps its own scale, because a scale designed for a look's surfaces
   * is not a high-contrast scale.
   */
  readonly series?: Readonly<Partial<Record<ThemeMode, SeriesColors>>>;
  /**
   * The syntax palette a look highlights code with, per mode. A mode it omits —
   * and every style that declares none — resolves the base theme's table for
   * that mode, which is designed to be read on every shipped fill.
   *
   * A look that repaints the surface a code block paints owns one for the same
   * reason it owns a `series`: the tokens are read against that page. It follows
   * the same rule as {@link colors} — a base of another contrast variant keeps
   * its own palette.
   */
  readonly syntax?: Readonly<Partial<Record<ThemeMode, SyntaxColors>>>;
  /**
   * The contrast variant the palette is designed for. A base theme that needs
   * more keeps its own colours — accessibility outranks the platform look — so
   * `platformTheme` applies a palette only where this matches the base.
   */
  readonly contrast: ThemeContrast;
}

/**
 * Platform styles. `sans` is GPUI's sentinel everywhere — GPUI maps it to the
 * platform's own UI font, so a theme never names a face the operating system
 * may not have. `mono` names the family each platform installs. `default` is
 * the library's own identity: it changes nothing but the name.
 *
 * The colours are ordinary semantic roles, so a consumer edits a value here and
 * every component follows. Each set is held to the contrast floors in
 * `contrast.ts` by `platforms.test.ts`; `contrast` names the variant those
 * floors are, so a high-contrast base keeps its own palette. The dark sets carry
 * a lighter `placeholder` than the base theme because their field surfaces are
 * lighter than its canvas. Four styles also carry their own `skeleton`, because
 * a placeholder fill is measured against the card, the muted strip and the
 * popover fill it stands in (`decorative.ts`) and the inherited fill matched
 * theirs. Each `darwin` set
 * and all three dark sets carry their own `secondary`, because a tonal action's
 * fill has to be visible on the strip it sits on and their surfaces are
 * lighter than the base theme's — macOS light's window sits 1.015:1 from the
 * base fill, and the dark popovers sit 1.039–1.049:1 from it. The `linux` and
 * `win32` dark sets carry a 24% `selection` — the base dark theme's share —
 * rather than 30%, because a stronger wash over their lighter cards left the
 * text it selects at 6.6:1, under the body floor (`selection.ts`). Windows light
 * also deepens the destructive status text to red 900: its pressed wash is
 * darker than the base theme's, and the shared red 800 label measured 6.93:1 on
 * a pressed destructive row, under the body floor. A role a set omits keeps the
 * base theme's value.
 */
/**
 * The dark syntax table the three platform styles carry.
 *
 * A platform style repaints the page, and a `<markdown>` host's fenced code
 * block paints 3.5% of a neutral ink over that page (`nativeFenceFill`), so the
 * fence sits a step above the base theme's and the dark `keyword` — the one
 * token with no room — needs a brighter value. Measured: the identity's
 * `#A7A9FF` clears the page in every dark style and misses the body floor on the
 * fence in all three platforms (6.49:1 on Linux dark, 6.85:1 on Windows,
 * 6.92:1 on macOS), and `#B0B2FF` is the smallest 2% step toward white that
 * clears them (7.09:1). A light base keeps its page, so the light mode resolves
 * the identity's table.
 */
const platformDarkSyntax: SyntaxColors = {
  ...darkSyntax,
  keyword: "#B0B2FF",
};

export const platformStyles: Readonly<Record<PlatformName, PlatformStyle>> = {
  darwin: {
    label: "macOS",
    sans: systemUiFont,
    mono: "Menlo",
    radius: { none: 0, sm: 4, md: 6, lg: 10, xl: 14, full: 9999 },
    density: "compact",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },
    colors: {
      light: {
        background: "#F2F2F7",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        secondary: "#DEE3EA",
        muted: "#E9E9EF",
        skeleton: "#DCDFE7",
        hover: "#E2E2E8",
        active: "#DEDEE6",
        border: "#D9D9E0",
        borderStrong: "#67686D",
        primary: "#0A6CD6",
        primaryForeground: "#FFFFFF",
        ring: "#0A6CD6",
        accent: "#CADEF7",
        accentForeground: "#08407A",
        selected: "#D3E5FB",
        selectedForeground: "#0B3D6B",
        selection: "#0A6CD63D",
      },
      dark: {
        background: "#1C1C1E",
        card: "#26262A",
        popover: "#2C2C30",
        input: "#1F1F22",
        secondary: "#3A3A3C",
        // The bar rail is `muted`, measured on the page, a card, this popover
        // and a field's `input` fill. The inherited value sat 1.028:1 from the
        // popover; the card and the popover are one step apart, and the field
        // fill the diff pane paints sits just above the page, so no step between
        // them clears the rail. The quiet surface takes the recessed step below
        // the page instead — the same direction the light themes take it.
        muted: "#16161A",
        // A loading dialog paints its skeleton rows on this popover fill; the
        // inherited base skeleton sat 1.049:1 from it, so the dialog looked
        // empty rather than loading.
        skeleton: "#303036",
        hover: "#35353B",
        active: "#3A3A40",
        border: "#3A3A40",
        borderStrong: "#ACACB1",
        primary: "#0A84FF",
        primaryForeground: "#11141A",
        ring: "#4CA2FF",
        accent: "#1A3D60",
        accentForeground: "#B2D3F9",
        selected: "#0C3864",
        selectedForeground: "#C7E0FF",
        placeholder: "#8A93A3",
        selection: "#0A84FF4D",
      },
    },
  },
  linux: {
    label: "Linux",
    sans: systemUiFont,
    mono: "DejaVu Sans Mono",
    radius: { none: 0, sm: 4, md: 6, lg: 12, xl: 16, full: 9999 },
    density: "spacious",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },
    colors: {
      light: {
        // Adwaita's window fill; the control and window corners are 6px and
        // 12px (`$button_radius`, `$window_radius` in libadwaita 1.5).
        background: "#FAFAFA",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        muted: "#ECEBE9",
        hover: "#E3E2DF",
        active: "#DCDBD8",
        border: "#D4D2CF",
        borderStrong: "#6A6965",
        // Adwaita's standalone accent is Blue 4: it is the action fill that
        // carries white text and a visible pointer step. Blue 3 tints the
        // selection wash below.
        primary: "#1A6DD3",
        primaryForeground: "#FFFFFF",
        ring: "#1A6DD3",
        accent: "#D2E4F7",
        accentForeground: "#12457F",
        selected: "#CADDF3",
        selectedForeground: "#0F3E74",
        selection: "#3584E43D",
      },
      dark: {
        background: "#242424",
        card: "#303030",
        popover: "#383838",
        input: "#212121",
        secondary: "#404040",
        muted: "#2A2A2A",
        // A loading dialog paints its skeleton rows on this popover fill; the
        // previous step sat 1.031:1 from it.
        skeleton: "#3E3E3E",
        hover: "#343434",
        active: "#3D3D3D",
        border: "#464646",
        borderStrong: "#B2B3B4",
        primary: "#78AEED",
        primaryForeground: "#11141A",
        ring: "#78AEED",
        accent: "#1B3E60",
        accentForeground: "#BBD9F7",
        selected: "#1F4363",
        selectedForeground: "#CFE4FA",
        placeholder: "#8A93A3",
        selection: "#78AEED3D",
      },
    },
  },
  win32: {
    label: "Windows",
    // `.SystemUIFont` resolves to Segoe UI Variable on Windows 11, the Fluent 2
    // UI face; naming the family here would pin an older Segoe UI.
    sans: systemUiFont,
    mono: "Consolas",
    // Fluent 2's 4px grid: a control corners at 4px and a surface at 8px. `sm`
    // and `md` are the control steps (`controlStyle` paints `md`), `lg` and
    // `xl` the surface steps (`surfaceStyle` paints the radius it is given, and
    // cards and dialogs name `lg`/`xl`).
    radius: { none: 0, sm: 4, md: 4, lg: 8, xl: 8, full: 9999 },
    density: "comfortable",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },
    colors: {
      light: {
        background: "#F3F3F3",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        muted: "#EBEBEB",
        hover: "#E0E0E0",
        active: "#D6D6D6",
        border: "#E5E5E5",
        borderStrong: "#696A6B",
        // The Fluent 2 accent (`#0078D4`) is the action fill and the focus
        // rect; the selection wash keeps the 24% share the style has carried.
        primary: "#0078D4",
        primaryForeground: "#FFFFFF",
        ring: "#0078D4",
        accent: "#CFE6F9",
        accentForeground: "#003E6F",
        selected: "#C8E0F3",
        selectedForeground: "#093A5C",
        // The pressed wash is darker here than the base theme's, so the shared
        // red 800 label landed at 6.93:1 on a pressed destructive row. The
        // deeper 900 keeps the row readable without flattening hover into press.
        destructiveSoftForeground: "#5C1619",
        selection: "#0067C03D",
      },
      dark: {
        // Fluent's dark canvas and the layer a card sits on: the `#202020`
        // page, then the elevated `#2C2C2C` layer. The popover sits one step
        // above the card, which elevation separates rather than a third fill.
        background: "#202020",
        card: "#2C2C2C",
        popover: "#2D2D2D",
        input: "#1F1F1F",
        secondary: "#3A3A3A",
        // The bar rail is `muted`; a step below the card keeps a bar visible in
        // a dialog and on a card.
        muted: "#262626",
        // A loading dialog paints its skeleton rows on this popover fill; the
        // inherited base skeleton sat 1.039:1 from it.
        skeleton: "#323232",
        hover: "#333333",
        active: "#3A3A3A",
        border: "#3D3D3D",
        borderStrong: "#ACACAD",
        // Fluent 2's dark accent (`#4CC2FF`) is the action fill and the focus
        // rect. Its hover and press still read against the fill: the pointer
        // steps land at 1.080:1 and 1.129:1, above the 1.05 perceptibility
        // floor, while the dark on-colour stays at 9.19:1.
        primary: "#4CC2FF",
        primaryForeground: "#11141A",
        ring: "#4CC2FF",
        accent: "#1B3A50",
        accentForeground: "#C9E9FF",
        selected: "#143E59",
        selectedForeground: "#CDEBFF",
        placeholder: "#8A93A3",
        selection: "#60CDFF3D",
      },
    },
  },
  default: {
    label: "Default",
    sans: systemUiFont,
    mono: "Menlo",
    radius: defaultRadius,
    density: "comfortable",
    contrast: "default",
    colors: { light: {}, dark: {} },
  },
};

/**
 * The families and label per platform. A view of {@link platformStyles}, kept
 * because a caller that only needs a face should not carry the palette.
 */
export const platformTypes: Readonly<Record<PlatformName, PlatformType>> =
  platformStyles;

const knownPlatform = (name: string): PlatformName =>
  name === "darwin" || name === "linux" || name === "win32" ? name : "default";

/**
 * The platform the code runs on, or `default` when it is not one the library
 * knows — a browser, for example.
 */
export const currentPlatform: PlatformName =
  typeof process === "undefined" ? "default" : knownPlatform(process.platform);

/** The platform's monospace family. */
export const systemMonoFamily: string = platformTypes[currentPlatform].mono;
