/**
 * A theme for tests.
 *
 * This is a **test double**, not a second palette: every colour is a
 * deliberately meaningless sequential hex value and every number is derived
 * from its own key. A test that passes against it cannot be relying on a real
 * design decision, and a resolution test that *should* differ when the theme
 * differs (see `style.test.ts`) cannot pass by accident.
 *
 * Its shape is the contract `@gpuixui/tokens` must satisfy (see `theme.ts`), so
 * this file is also the executable form of the theme port.
 */

import type { FontWeight, PrimitiveTheme, TextStyle } from "../theme.js";

/** A distinct opaque colour per index, so two roles can never compare equal. */
const shade = (index: number): string =>
  `#${index.toString(16).padStart(6, "0").toUpperCase()}`;

/** A distinct translucent colour per index, for the roles that carry alpha. */
const wash = (index: number): string => `${shade(index)}40`;

const text = (size: number, weight: FontWeight): TextStyle => ({
  fontSize: size,
  lineHeight: size + 4,
  fontWeight: weight,
});

/** One size per role, so a test can name a role and get a unique style. */
const typography: PrimitiveTheme["typography"] = {
  sans: "Test Sans",
  mono: "Test Mono",
  display: text(34, 700),
  h1: text(30, 600),
  h2: text(26, 600),
  h3: text(22, 600),
  body: text(14, 400),
  bodyStrong: text(14, 600),
  label: text(13, 500),
  caption: text(12, 400),
  code: text(13, 400),
  codeBlock: text(12, 400),
};

export const testTheme: PrimitiveTheme = {
  name: "Test",
  mode: "light",
  colors: {
    background: shade(1),
    foreground: shade(2),
    card: shade(3),
    cardForeground: shade(4),
    popover: shade(5),
    popoverForeground: shade(6),
    primary: shade(7),
    primaryForeground: shade(8),
    secondary: shade(9),
    secondaryForeground: shade(10),
    muted: shade(11),
    mutedForeground: shade(12),
    accent: shade(13),
    accentForeground: shade(14),
    destructive: shade(15),
    destructiveForeground: shade(16),
    success: shade(17),
    successForeground: shade(18),
    border: shade(19),
    borderStrong: shade(20),
    input: shade(21),
    inputForeground: shade(22),
    placeholder: shade(23),
    ring: shade(24),
    selection: wash(25),
    overlay: wash(26),
    hover: wash(27),
    active: wash(28),
    selected: shade(29),
    selectedForeground: shade(30),
    disabled: shade(31),
    disabledForeground: shade(32),
    skeleton: shade(33),
    scrollbar: shade(34),
    shadow: wash(35),
  },
  typography,
  spacing: {
    "2xs": 2,
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    "2xl": 24,
    "3xl": 32,
    "4xl": 48,
    "5xl": 64,
  },
  radius: { none: 0, sm: 4, md: 6, lg: 8, xl: 12, full: 9999 },
  density: {
    name: "comfortable",
    controlHeight: { sm: 28, md: 32, lg: 36 },
    controlPaddingX: { sm: 8, md: 10, lg: 12 },
    rowHeight: 32,
  },
  elevation: {
    sm: [
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 2,
        spreadRadius: 0,
        color: wash(36),
      },
    ],
    md: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 8,
        spreadRadius: -2,
        color: wash(37),
      },
    ],
    lg: [
      {
        offsetX: 0,
        offsetY: 8,
        blurRadius: 24,
        spreadRadius: -4,
        color: wash(38),
      },
    ],
    overlay: [],
  },
  borderWidth: { thin: 1, strong: 2 },
  iconSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 },
};

export const testThemeDark: PrimitiveTheme = { ...testTheme, mode: "dark" };
