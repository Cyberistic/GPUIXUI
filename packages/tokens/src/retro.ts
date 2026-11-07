import { palette, type ThemeColors } from "./color.js";
import type { PlatformStyle } from "./platforms.js";
import { systemUiFont } from "./platforms.js";
import type { SeriesColors } from "./series.js";
import type { Theme } from "./theme.js";
import { applyStyle } from "./theme.js";

export const retroNames = ["luna", "aero", "omarchy"] as const;

export type RetroName = (typeof retroNames)[number];

export const isRetroName = (value: unknown): value is RetroName =>
  retroNames.some((name) => name === value);

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

    success: palette.green[700],

    infoSoft: palette.blue[50],
    successSoft: palette.green[50],
    warningSoft: palette.amber[50],
    destructiveSoft: palette.red[50],
    selection: "#316AC53D",

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

      borderStrong: "#7AA2F7",
      primary: "#7AA2F7",
      primaryForeground: "#13141C",
      ring: "#7AA2F7",

      destructive: "#F06A84",
      destructiveForeground: "#13141C",
      success: "#9ECE6A",
      successForeground: "#13141C",
      warning: "#E0AF68",
      warningForeground: "#13141C",
      info: "#7AA2F7",
      infoForeground: "#13141C",
      infoSoft: "#23345A",

      infoSoftForeground: "#B2CAFF",
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

export const lunaSeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#9A6300",
  "#A5262B",
];

export const omarchySeries: SeriesColors = [
  "#5F4BDB",
  "#1B45AC",
  "#158754",
  "#9A6300",
  "#A5262B",
];

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

    radius: { none: 0, sm: 1, md: 2, lg: 3, xl: 4, full: 9999 },

    density: "compact",
    contrast: "default",
    colors: omarchyColors,
    series: { light: omarchySeries },
  },
};

export function retroTheme(base: Theme, name: RetroName): Theme {
  if (!isRetroName(name)) {
    throw new Error(
      `\`${name}\` is not an authored look: ${retroNames.join(", ")} are the looks this release ships. A restored or configured choice is narrowed with \`isRetroName\` before it reaches a theme.`,
    );
  }
  return applyStyle(base, retroStyles[name]);
}
