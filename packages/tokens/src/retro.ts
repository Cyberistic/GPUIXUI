/**
 * Two authored looks from the desktop's past: Windows XP's Luna and Windows 7's
 * Aero.
 *
 * They are **styles, not platforms**. `platformNames` is the persisted key a
 * consumer stores and the docs toggle offers, so it names the operating systems
 * an application runs on today; a look is data of the same shape as
 * `platformStyles`, applied with `applyStyle` and offered under its own name.
 * That distinction is the extension mechanism in practice: the library ships
 * two more looks without the platform axis growing a value.
 *
 * Provenance: the chrome values are the era's own — Luna's blue title bar and
 * `#ECE9D8` face, its `#7F9DB9` field edge and `#316AC5` selection; Aero's
 * glass-blue greys and `#3399FF` highlight. No artwork, gradient, bitmap, icon
 * or logo is copied, so there is no redistributable asset here. Neither era had
 * a dark mode, so both dark sets are authored for this library and held to the
 * same contrast, decorative and selection contracts as everything else — they
 * are not reconstructions, and are documented as invented. Luna's dark
 * `selection` is a 24% tint, not the 30% Aero can carry: its lighter card left
 * the selected text under the body floor (`selection.ts`). Both modes carry
 * their own `secondary` — the face a tonal action rests on — because each look's
 * muted strip and window sit at their own lightness (`decorative.ts`). Luna light
 * also carries its own status tints: its beige page is at the lightness a pale
 * tint has, so the base light tint would vanish into it and a deeper one into
 * its toolbar — the look sits its tints above its page instead. Its warm pressed
 * wash is why the light destructive status text is red 900 in the base theme,
 * which this look inherits.
 */

import { palette, type ThemeColors } from "./color.js";
import type { PlatformStyle } from "./platforms.js";
import { systemUiFont } from "./platforms.js";
import type { Theme } from "./theme.js";
import { applyStyle } from "./theme.js";

/**
 * The authored looks the package ships, in documentation order. `RetroName`
 * derives from this list, so a new look must also gain a style in
 * {@link retroStyles}.
 */
export const retroNames = ["luna", "aero"] as const;

/** An authored look a consumer can apply on top of a base theme. */
export type RetroName = (typeof retroNames)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to an
 * authored look. Iterate {@link retroNames} instead of retyping the names.
 */
export const isRetroName = (value: unknown): value is RetroName =>
  retroNames.some((name) => name === value);

/** A look's chrome, per mode. A role it omits keeps the base theme's value. */
const lunaColors: Readonly<Record<"light" | "dark", Partial<ThemeColors>>> = {
  light: {
    background: "#ECE9D8",
    foreground: "#171714",
    card: "#FFFFFF",
    popover: "#FFFFFF",
    input: "#FFFFFF",
    secondary: "#D5CFB8",
    muted: "#E0DCCB",
    mutedForeground: "#4F5550",
    hover: "#F4F1E3",
    active: "#D8D4C1",
    border: "#C4BFAA",
    borderStrong: "#5F7391",
    primary: "#316AC5",
    primaryForeground: "#FFFFFF",
    ring: "#0058EE",
    accent: "#BFD4EF",
    accentForeground: "#123A66",
    selected: "#BDD4F0",
    selectedForeground: "#0E2F57",
    // Luna's beige page sits at the same lightness a pale status tint has
    // (`#ECE9D8` is 1.00:1 from the base blue soft fill), and its muted strip
    // is deeper still, so a tint that clears the default page vanishes here.
    // The look carries its own, one ramp step lighter than its page instead:
    // visible against the beige, the white card and the deeper toolbar.
    infoSoft: palette.blue[50],
    successSoft: palette.green[50],
    warningSoft: palette.amber[50],
    destructiveSoft: palette.red[50],
    selection: "#316AC53D",
    // A hunk header is a `muted` stripe and its text is the faint role, so the
    // placeholder is held to 4.5:1 on the toolbar as well as on the page.
    placeholder: "#59616D",
    disabled: "#E4E0CE",
    disabledForeground: "#8C8873",
    skeleton: "#D2CDB6",
    scrollbar: "#B3AE96",
    shadow: "#00000040",
  },
  dark: {
    background: "#101E33",
    foreground: "#E6ECF5",
    card: "#172A44",
    popover: "#1C3250",
    input: "#0B1626",
    secondary: "#3A4A5E",
    muted: "#1B2F4A",
    mutedForeground: "#B4C6DD",
    hover: "#223A58",
    active: "#2A4464",
    border: "#30496A",
    borderStrong: "#7E9CBF",
    primary: "#7AB0FF",
    primaryForeground: "#0B1626",
    ring: "#7AB0FF",
    accent: "#1E3A5C",
    accentForeground: "#CFE0F7",
    selected: "#22456B",
    selectedForeground: "#DCE9FB",
    selection: "#7AB0FF3D",
    placeholder: "#93A8C4",
    disabled: "#1B2F4A",
    disabledForeground: "#7086A0",
    skeleton: "#22364F",
    scrollbar: "#3B5675",
    shadow: "#00000099",
  },
};

/** Aero's chrome, per mode. */
const aeroColors: Readonly<Record<"light" | "dark", Partial<ThemeColors>>> = {
  light: {
    background: "#E8EFF7",
    foreground: "#10222F",
    card: "#FFFFFF",
    popover: "#FFFFFF",
    input: "#FFFFFF",
    secondary: "#CFDDEA",
    muted: "#DEE8F2",
    hover: "#EFF6FD",
    active: "#CFDEEE",
    border: "#C9D6E4",
    borderStrong: "#5E7A93",
    primary: "#1F6FB5",
    primaryForeground: "#FFFFFF",
    ring: "#2A80C4",
    accent: "#C6E2F9",
    accentForeground: "#0B3F66",
    selected: "#C2E0F8",
    selectedForeground: "#08344F",
    selection: "#3399FF3D",
    // Aero's window is darker than the base page and its toolbar darker still,
    // so the inherited placeholder was under the 4.5:1 secondary floor on both.
    // This is the step that clears the stripe while staying visibly fainter
    // than `mutedForeground`.
    placeholder: "#586978",
    disabled: "#E3EAF1",
    disabledForeground: "#8A99A6",
    skeleton: "#CFDCE8",
    scrollbar: "#AFC2D2",
    shadow: "#00000040",
  },
  dark: {
    background: "#101C27",
    foreground: "#E7F0F7",
    card: "#172835",
    popover: "#1C3040",
    input: "#0A141C",
    secondary: "#33475A",
    muted: "#1D2F3D",
    mutedForeground: "#BCCEDF",
    hover: "#25394A",
    active: "#2D4356",
    border: "#33495B",
    borderStrong: "#7F98AC",
    primary: "#5FB6F2",
    primaryForeground: "#08161F",
    ring: "#5FB6F2",
    accent: "#1C3A4F",
    accentForeground: "#C6E4F8",
    selected: "#1F4560",
    selectedForeground: "#D3ECFF",
    selection: "#5FB6F23D",
    placeholder: "#90A7B9",
    disabled: "#1D2F3D",
    disabledForeground: "#6C8191",
    skeleton: "#213646",
    scrollbar: "#3C566A",
    shadow: "#00000099",
  },
};

/**
 * The authored looks. Each is the same `PlatformStyle` shape the platform table
 * uses, so one merge rule serves both: families, radii and density always
 * apply, and a palette applies only to a base of the `contrast` variant it was
 * designed for.
 *
 * `sans` stays GPUI's `.SystemUIFont` sentinel rather than naming Tahoma or
 * Segoe UI: the package bundles no font, and a look that named a face the
 * machine lacks would fall back silently. The era is carried by colour, radius
 * and density; the monospace family is the era's own.
 */
export const retroStyles: Readonly<Record<RetroName, PlatformStyle>> = {
  luna: {
    label: "Windows XP (Luna)",
    sans: systemUiFont,
    mono: "Lucida Console",
    radius: { none: 0, sm: 1, md: 2, lg: 3, xl: 4, full: 9999 },
    density: "compact",
    contrast: "default",
    colors: lunaColors,
  },
  aero: {
    label: "Windows 7 (Aero)",
    sans: systemUiFont,
    mono: "Consolas",
    radius: { none: 0, sm: 2, md: 4, lg: 6, xl: 8, full: 9999 },
    density: "comfortable",
    contrast: "default",
    colors: aeroColors,
  },
};

/**
 * A theme wearing an authored look — `applyStyle` over {@link retroStyles}.
 *
 * @example
 * ```tsx
 * import { retroTheme, themes } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={retroTheme(themes.light, "luna")} />
 * ```
 */
export function retroTheme(base: Theme, name: RetroName): Theme {
  return applyStyle(base, retroStyles[name]);
}
