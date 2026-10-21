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
import type { ThemeMode } from "./theme.js";

/** GPUI's system UI font sentinel; it resolves to each platform's own UI font. */
export const systemUiFont = ".SystemUIFont";

/** A platform a GPUIXUI application runs on. */
export type PlatformName = "darwin" | "linux" | "win32" | "default";

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
 * One platform's appearance: the families its type resolves to, the radii and
 * control density its native windows use, and the chrome roles it paints in
 * each mode. A role it omits keeps the base theme's value.
 */
export interface PlatformStyle extends PlatformType {
  /** Corner radii the platform's own controls use. */
  readonly radius: Radius;
  /** Control density preset the platform's native controls sit at. */
  readonly density: DensityName;
  /** The roles the platform repaints, in each mode. */
  readonly colors: PlatformColors;
}

/**
 * Platform styles. `sans` is GPUI's sentinel everywhere — GPUI maps it to the
 * platform's own UI font, so a theme never names a face the operating system
 * may not have. `mono` names the family each platform installs. `default` is
 * the library's own identity: it changes nothing but the name.
 *
 * The colours are ordinary semantic roles, so a consumer edits a value here and
 * every component follows. Each set is held to the contrast floors in
 * `contrast.ts` by `platforms.test.ts`. The dark sets carry a lighter
 * `placeholder` than the base theme because their field surfaces are lighter
 * than its canvas. A role a set omits keeps the base theme's value.
 */
export const platformStyles: Readonly<Record<PlatformName, PlatformStyle>> = {
  darwin: {
    label: "macOS",
    sans: systemUiFont,
    mono: "Menlo",
    radius: { none: 0, sm: 4, md: 6, lg: 10, xl: 14, full: 9999 },
    density: "compact",
    colors: {
      light: {
        background: "#F2F2F7",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        muted: "#E9E9EF",
        hover: "#E9E9EF",
        active: "#DEDEE6",
        border: "#D9D9E0",
        borderStrong: "#7C7C82",
        primary: "#0A6CD6",
        primaryForeground: "#FFFFFF",
        ring: "#0A6CD6",
        accent: "#E1EBFA",
        accentForeground: "#0A4A8F",
        selected: "#D3E5FB",
        selectedForeground: "#0B3D6B",
        selection: "#0A6CD63D",
      },
      dark: {
        background: "#1C1C1E",
        card: "#26262A",
        popover: "#2C2C30",
        input: "#1F1F22",
        muted: "#2A2A2E",
        hover: "#2E2E33",
        active: "#3A3A40",
        border: "#3A3A40",
        borderStrong: "#8A8A90",
        primary: "#0A84FF",
        primaryForeground: "#11141A",
        ring: "#4CA2FF",
        accent: "#13304F",
        accentForeground: "#A9CCF7",
        selected: "#0D3A66",
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
    radius: { none: 0, sm: 4, md: 6, lg: 9, xl: 12, full: 9999 },
    density: "spacious",
    colors: {
      light: {
        background: "#F6F5F4",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        muted: "#ECEBE9",
        hover: "#E7E6E4",
        active: "#DCDBD8",
        border: "#D4D2CF",
        borderStrong: "#8A8884",
        primary: "#1C71D8",
        primaryForeground: "#FFFFFF",
        ring: "#1C71D8",
        accent: "#E4EFFB",
        accentForeground: "#12457F",
        selected: "#CFE3F9",
        selectedForeground: "#0F3E74",
        selection: "#1C71D83D",
      },
      dark: {
        background: "#242424",
        card: "#303030",
        popover: "#383838",
        input: "#212121",
        muted: "#2A2A2A",
        hover: "#333333",
        active: "#3D3D3D",
        border: "#464646",
        borderStrong: "#A0A0A0",
        primary: "#78AEED",
        primaryForeground: "#11141A",
        ring: "#78AEED",
        accent: "#1B3B5C",
        accentForeground: "#BBD9F7",
        selected: "#1E4468",
        selectedForeground: "#CFE4FA",
        placeholder: "#8A93A3",
        selection: "#78AEED4D",
      },
    },
  },
  win32: {
    label: "Windows",
    sans: systemUiFont,
    mono: "Consolas",
    radius: { none: 0, sm: 2, md: 4, lg: 8, xl: 8, full: 9999 },
    density: "comfortable",
    colors: {
      light: {
        background: "#F3F3F3",
        card: "#FFFFFF",
        popover: "#FFFFFF",
        input: "#FFFFFF",
        muted: "#EBEBEB",
        hover: "#E8E8E8",
        active: "#DEDEDE",
        border: "#E5E5E5",
        borderStrong: "#757575",
        primary: "#0067C0",
        primaryForeground: "#FFFFFF",
        ring: "#0067C0",
        accent: "#E5F1FB",
        accentForeground: "#003E6F",
        selected: "#CCE4F7",
        selectedForeground: "#093A5C",
        selection: "#0067C03D",
      },
      dark: {
        background: "#202020",
        card: "#2B2B2B",
        popover: "#2D2D2D",
        input: "#1F1F1F",
        muted: "#2A2A2A",
        hover: "#333333",
        active: "#3A3A3A",
        border: "#3D3D3D",
        borderStrong: "#9A9A9A",
        primary: "#60CDFF",
        primaryForeground: "#11141A",
        ring: "#60CDFF",
        accent: "#1B3A50",
        accentForeground: "#C9E9FF",
        selected: "#123C57",
        selectedForeground: "#CDEBFF",
        placeholder: "#8A93A3",
        selection: "#60CDFF4D",
      },
    },
  },
  default: {
    label: "Default",
    sans: systemUiFont,
    mono: "Menlo",
    radius: defaultRadius,
    density: "comfortable",
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
