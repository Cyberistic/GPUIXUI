/**
 * The authored looks: Windows XP's Luna, Windows 7's Aero and Omarchy.
 *
 * They are **styles, not platforms**. `platformNames` is the persisted key a
 * consumer stores and the docs toggle offers, so it names the operating systems
 * an application runs on today; a look is data of the same shape as
 * `platformStyles`, applied with `applyStyle` and offered under its own name.
 * That distinction is the extension mechanism in practice: the library ships
 * three looks without the platform axis growing a value.
 *
 * Provenance, in two kinds. The Windows chrome values are the era's own — Luna's
 * blue title bar and `#ECE9D8` face, its `#7F9DB9` field edge and `#316AC5`
 * selection; Aero's glass-blue greys and `#3399FF` highlight — and no artwork,
 * gradient, bitmap, icon or logo is copied, so there is no redistributable asset
 * here. Omarchy's colours are the shell's: Tokyo Night for its dark set and the
 * guide's Flexoki Light reference for its light set. Neither Windows era had a
 * dark mode, so both of those dark sets are authored for this library and
 * documented as invented; Omarchy's are not — they are the palettes a running
 * desktop stages in `colors.toml`, which `decodeOmarchyPalette` reads.
 * Every look is held to the same contrast, decorative and selection contracts as
 * everything else. Luna's dark `selection` is a 24% tint, not the 30% Aero can
 * carry: its lighter card left the selected text under the body floor
 * (`selection.ts`). Both modes carry their own `secondary` — the face a tonal
 * action rests on — because each look's muted strip and window sit at their own
 * lightness (`decorative.ts`). Luna light also carries its own status tints: its
 * beige page is at the lightness a pale tint has, so the base light tint would
 * vanish into it and a deeper one into its toolbar — the look sits its tints
 * above its page instead. Its warm pressed wash is why the light destructive
 * status text is red 900 in the base theme, which this look inherits. Its beige
 * page and toolbar also swallow the shared light **chart** amber (2.75:1 on
 * `#E0DCCB`), so the look declares its own light `series` — the amber one step
 * deeper, `#9A6300` — while the dark edition keeps the shared dark table, which
 * separates on its navy page already.
 *
 * Omarchy needs a series of its own for the same reason (the shared amber is
 * 2.96:1 on its `#E6E4D9` inset), and its geometry and face are the shell's:
 * near-square corners (`radius.md` 2) and `JetBrains Mono`.
 */

import { palette, type ThemeColors } from "./color.js";
import type { PlatformStyle } from "./platforms.js";
import { systemUiFont } from "./platforms.js";
import type { SeriesColors } from "./series.js";
import type { Theme } from "./theme.js";
import { applyStyle } from "./theme.js";

/**
 * The authored looks the package ships, in documentation order. `RetroName`
 * derives from this list, so a new look must also gain a style in
 * {@link retroStyles}.
 */
export const retroNames = ["luna", "aero", "omarchy"] as const;

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
    borderStrong: "#495E71",
    primary: "#316AC5",
    primaryForeground: "#FFFFFF",
    ring: "#0058EE",
    accent: "#BFD4EF",
    accentForeground: "#123A66",
    selected: "#B8CEE9",
    selectedForeground: "#0E2F57",
    // A presence dot is a mark on the row it sits in, and a list row fills
    // `selected` once it is chosen: the shared success step measured 2.99:1
    // there, under the 3:1 a non-text mark needs. The look's selected wash is
    // lighter than the base theme's iris tint, so it takes the next green step
    // (`indicator.test.ts` holds both the pre-fix value and the shipped one).
    success: palette.green[700],
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
    // The bar rail is `muted`, measured on the page, a card and this popover;
    // the inherited step sat 1.045:1 from the popover. A step darker clears both
    // without touching the look's navy page.
    muted: "#1B2E49",
    mutedForeground: "#B4C6DD",
    hover: "#223A58",
    active: "#2A4464",
    border: "#30496A",
    borderStrong: "#A9BED6",
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
    borderStrong: "#4D677E",
    primary: "#1F6FB5",
    primaryForeground: "#FFFFFF",
    ring: "#287ABA",
    accent: "#C6E2F9",
    accentForeground: "#0B3F66",
    selected: "#BEDCF4",
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
    // The bar rail is `muted`; the inherited step sat 1.013:1 from this popover
    // and 1.097:1 from the card, so a bar in a dialog had no track.
    muted: "#1A2C3C",
    mutedForeground: "#BCCEDF",
    hover: "#25394A",
    active: "#2D4356",
    border: "#33495B",
    borderStrong: "#A7BAC9",
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
 * Omarchy's chrome, per mode.
 *
 * The dark edition is Tokyo Night (`themes/tokyo-night/colors.toml`), the
 * default the Omarchy Style guide names: page `#1A1B26`, raised surface
 * `#1F2230`, bright text `#C0CAF5`, secondary text `#A9B1D6`, accent
 * `#7AA2F7`, brand `#9ECE6A`, selection ground `#292E42` and the `#414868`
 * strong edge. The light edition is the guide's Flexoki Light reference:
 * canvas `#FFFCF0`, surface `#F2F0E5`, inset `#E6E4D9`, ink `#100F0F`,
 * secondary `#575653`, border `#B7B5AC`, selection `#DAD8CE`, accent
 * `#205EA6`, danger `#AF3029`, warning `#855B00`, success `#526600`
 * (`application-design.md` §1.5).
 */
const omarchyColors: Readonly<Record<"light" | "dark", Partial<ThemeColors>>> =
  {
    light: {
      background: "#FFFCF0",
      foreground: "#100F0F",
      card: "#F2F0E5",
      popover: "#F2F0E5",
      input: "#F0EEE4",
      inputForeground: "#100F0F",
      secondary: "#DAD8CE",
      secondaryForeground: "#100F0F",
      muted: "#E6E4D9",
      mutedForeground: "#575653",
      // Omarchy's states are foreground-tinted, not accent-coated: hover and
      // selection are the neutral steps, and the accent stays text and edges.
      hover: "#DAD8CE",
      active: "#CECDC3",
      accent: "#DAD8CE",
      accentForeground: "#100F0F",
      selected: "#CECDC3",
      selectedForeground: "#100F0F",
      border: "#B7B5AC",
      borderStrong: "#575653",
      primary: "#205EA6",
      primaryForeground: "#FFFCF0",
      ring: "#205EA6",
      success: "#526600",
      successForeground: "#FFFCF0",
      warning: "#855B00",
      warningForeground: "#FFFCF0",
      info: "#205EA6",
      infoForeground: "#FFFCF0",
      infoSoft: "#CFE0F5",
      infoSoftForeground: "#0F3A66",
      successSoft: "#D5E0B4",
      successSoftForeground: "#334200",
      warningSoft: "#EAD29A",
      warningSoftForeground: "#4A3300",
      destructiveSoft: "#F6D2C9",
      destructiveSoftForeground: "#671510",
      placeholder: "#605E59",
      disabled: "#CECDC3",
      disabledForeground: "#87857E",
      skeleton: "#DAD8CE",
      scrollbar: "#B7B5AC",
      selection: "#205EA63D",
      shadow: "#00000040",
    },
    dark: {
      background: "#1A1B26",
      foreground: "#C0CAF5",
      card: "#1F2230",
      popover: "#1F2230",
      input: "#13141C",
      inputForeground: "#C0CAF5",
      secondary: "#2A2E42",
      secondaryForeground: "#C0CAF5",
      muted: "#2A2A2A",
      mutedForeground: "#A9B1D6",
      hover: "#2A2E42",
      active: "#343850",
      accent: "#2F334A",
      accentForeground: "#C0CAF5",
      selected: "#292E42",
      selectedForeground: "#C0CAF5",
      border: "#2A2E42",
      // Omarchy's `border-strong` is `#414868`; a control edge and focus ring are
      // also read on the four soft status tints, where that step is under the 3:1
      // boundary floor. The accent carries both there.
      borderStrong: "#7AA2F7",
      primary: "#7AA2F7",
      primaryForeground: "#13141C",
      ring: "#7AA2F7",
      // Omarchy's `#F7768E` sits too close to the light ink to show a pointer
      // step, so the filled action takes the red one ramp step deeper; the
      // status tint keeps the palette's red family.
      destructive: "#F06A84",
      destructiveForeground: "#13141C",
      success: "#9ECE6A",
      successForeground: "#13141C",
      warning: "#E0AF68",
      warningForeground: "#13141C",
      info: "#7AA2F7",
      infoForeground: "#13141C",
      infoSoft: "#23345A",
      infoSoftForeground: "#A9C4FF",
      successSoft: "#23331F",
      successSoftForeground: "#B9E88A",
      warningSoft: "#3A3018",
      warningSoftForeground: "#F0C98A",
      destructiveSoft: "#45242F",
      destructiveSoftForeground: "#FFC6CE",
      placeholder: "#8B93B8",
      disabled: "#181A24",
      disabledForeground: "#565F89",
      skeleton: "#30354C",
      scrollbar: "#414868",
      selection: "#7AA2F71A",
      shadow: "#000000",
    },
  };

/**
 * The categorical scale Luna's light edition needs, in legend order.
 *
 * The shared light table is designed against a near-white page; on Luna's
 * `#E0DCCB` toolbar its amber measures **2.75:1**, so a chart in that status bar
 * has one series nobody can find. These are the same hues with the amber one
 * step deeper — the ramp's own `700`, `#8E5B00`, is 0.044 from the red under
 * deuteranopia, under the 0.05 floor — and the table clears the look's page,
 * card, popover and toolbar (tightest 3.30:1, the green on the toolbar).
 * The dark edition needs no table: its navy page separates the shared dark
 * scale already.
 */
export const lunaSeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#9A6300",
  "#A5262B",
];

/**
 * The categorical scale Omarchy's light edition needs, in legend order.
 *
 * The shared light table's amber measures 2.96:1 on this edition's `#E6E4D9`
 * inset, under the 3:1 a data mark needs, so the look carries the shared hues
 * with the amber one ramp step deeper (`#9A6300`); deeper still collapses the
 * amber and red for a deuteranope. The dark edition keeps the shared dark
 * scale, whose page it is designed for.
 */
export const omarchySeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#9A6300",
  "#A5262B",
];

/**
 * The authored looks. Each is the same `PlatformStyle` shape the platform table
 * uses, so one merge rule serves both: families, radii and density always
 * apply, and a palette applies only to a base of the `contrast` variant it was
 * designed for.
 *
 * `sans` stays GPUI's `.SystemUIFont` sentinel rather than naming Tahoma,
 * Segoe UI or JetBrains Mono: the package bundles no font, and a look that
 * named a face the machine lacks would fall back silently. The look is carried
 * by colour, radius and density; the monospace family is the look's own.
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
    series: { light: lunaSeries },
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
  omarchy: {
    label: "Omarchy",
    sans: systemUiFont,
    mono: "JetBrains Mono",
    // Near-square geometry is Omarchy's signature: `Style.cornerRadius`
    // follows the effective Hyprland rounding, and its default is 0; the
    // library's ordered scale keeps the smallest 1–4px steps.
    radius: { none: 0, sm: 1, md: 2, lg: 3, xl: 4, full: 9999 },
    // The shell baseline is a 12px body with 28px rows and intrinsic controls;
    // `compact` is the preset those metrics land in.
    density: "compact",
    contrast: "default",
    colors: omarchyColors,
    series: { light: omarchySeries },
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
