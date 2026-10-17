/**
 * A stand-in theme for this example.
 *
 * `@gpuixui/tokens` owns the real palette; this file exists only because the
 * example has to run before that package lands (its `exports` still points at an
 * uncommitted `dist`). It is **one example palette, not a design system**: the
 * example reads nothing from it but the `PrimitiveTheme` port.
 *
 * `TODO:` delete this file and import `lightTheme`/`darkTheme` from
 * `@gpuixui/tokens` once that package is in the tree.
 */

import type {
  PrimitiveTheme,
  TextStyle,
  ThemeColors,
} from "@gpuixui/primitives";

/** Light and dark neutral ramps, plus the two semantic colours. */
const neutral = {
  light: {
    canvas: "#FFFFFF",
    surface: "#F6F7F9",
    ink: "#15171C",
    soft: "#667085",
    line: "#E3E6EB",
    lineStrong: "#C2C7D0",
    wash: "#00000010",
    press: "#0000001F",
  },
  dark: {
    canvas: "#0F1115",
    surface: "#171A20",
    ink: "#F1F3F6",
    soft: "#98A1AD",
    line: "#272B33",
    lineStrong: "#3B414B",
    wash: "#FFFFFF14",
    press: "#FFFFFF29",
  },
} as const;

const BRAND = "#3563E9";
const DANGER = "#D1332E";
const SUCCESS = "#2E9E5B";

const colors = (mode: "light" | "dark"): ThemeColors => {
  const ramp = neutral[mode];
  return {
    background: ramp.canvas,
    foreground: ramp.ink,
    card: ramp.surface,
    cardForeground: ramp.ink,
    popover: ramp.surface,
    popoverForeground: ramp.ink,
    primary: BRAND,
    primaryForeground: "#FFFFFF",
    secondary: ramp.surface,
    secondaryForeground: ramp.ink,
    muted: ramp.surface,
    mutedForeground: ramp.soft,
    accent: ramp.surface,
    accentForeground: ramp.ink,
    destructive: DANGER,
    destructiveForeground: "#FFFFFF",
    success: SUCCESS,
    successForeground: "#FFFFFF",
    border: ramp.line,
    borderStrong: ramp.lineStrong,
    input: mode === "light" ? "#FFFFFF" : ramp.canvas,
    inputForeground: ramp.ink,
    placeholder: ramp.soft,
    ring: BRAND,
    selection: `${BRAND}33`,
    overlay: mode === "light" ? "#00000066" : "#00000099",
    hover: ramp.wash,
    active: ramp.press,
    selected: BRAND,
    selectedForeground: "#FFFFFF",
    disabled: ramp.surface,
    disabledForeground: ramp.soft,
    skeleton: ramp.surface,
    scrollbar: ramp.lineStrong,
    shadow: mode === "light" ? "#0000001A" : "#00000066",
  };
};

const face = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle["fontWeight"],
): TextStyle => ({ fontSize, lineHeight, fontWeight });

/** Everything that does not change between the two modes. */
const shared = {
  typography: {
    sans: "Inter",
    mono: "JetBrains Mono",
    display: face(34, 40, 700),
    h1: face(28, 34, 600),
    h2: face(22, 28, 600),
    h3: face(18, 24, 600),
    body: face(14, 20, 400),
    bodyStrong: face(14, 20, 600),
    label: face(13, 18, 500),
    caption: face(12, 16, 400),
    code: face(13, 18, 400),
    codeBlock: face(12, 18, 400),
  },
  spacing: {
    "2xs": 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
    "4xl": 64,
    "5xl": 96,
  },
  radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  density: {
    name: "comfortable",
    controlHeight: { sm: 28, md: 34, lg: 40 },
    controlPaddingX: { sm: 8, md: 12, lg: 16 },
    rowHeight: 34,
  },
  elevation: {
    sm: [
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 2,
        spreadRadius: 0,
        color: "#00000014",
      },
    ],
    md: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 8,
        spreadRadius: -2,
        color: "#0000001F",
      },
    ],
    lg: [
      {
        offsetX: 0,
        offsetY: 12,
        blurRadius: 28,
        spreadRadius: -6,
        color: "#00000029",
      },
    ],
    overlay: [],
  },
  borderWidth: { thin: 1, strong: 2 },
  iconSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 },
} satisfies Omit<PrimitiveTheme, "name" | "mode" | "colors">;

/** The light theme the example opens with. */
export const lightTheme: PrimitiveTheme = {
  name: "Example",
  mode: "light",
  colors: colors("light"),
  ...shared,
};

/** The dark theme, from the same scales. */
export const darkTheme: PrimitiveTheme = {
  name: "Example",
  mode: "dark",
  colors: colors("dark"),
  ...shared,
};
