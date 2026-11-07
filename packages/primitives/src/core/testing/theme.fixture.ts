import type {
  FontWeight,
  PrimitiveTheme,
  TextRole,
  TextStyle,
} from "../theme.js";

const shade = (index: number): string =>
  `#${index.toString(16).padStart(6, "0").toUpperCase()}`;

const wash = (index: number): string => `${shade(index)}40`;

const text = (size: number, weight: FontWeight): TextStyle => ({
  fontSize: size,
  lineHeight: size + 4,
  fontWeight: weight,
});

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

const palette = (offset: number): PrimitiveTheme["colors"] => ({
  background: shade(offset + 1),
  foreground: shade(offset + 2),
  card: shade(offset + 3),
  cardForeground: shade(offset + 4),
  popover: shade(offset + 5),
  popoverForeground: shade(offset + 6),
  primary: shade(offset + 7),
  primaryForeground: shade(offset + 8),
  secondary: shade(offset + 9),
  secondaryForeground: shade(offset + 10),
  muted: shade(offset + 11),
  mutedForeground: shade(offset + 12),
  accent: shade(offset + 13),
  accentForeground: shade(offset + 14),
  destructive: shade(offset + 15),
  destructiveForeground: shade(offset + 16),
  success: shade(offset + 17),
  successForeground: shade(offset + 18),
  warning: shade(offset + 36),
  warningForeground: shade(offset + 37),
  info: shade(offset + 38),
  infoForeground: shade(offset + 39),
  infoSoft: shade(offset + 40),
  infoSoftForeground: shade(offset + 41),
  successSoft: shade(offset + 42),
  successSoftForeground: shade(offset + 43),
  warningSoft: shade(offset + 44),
  warningSoftForeground: shade(offset + 45),
  destructiveSoft: shade(offset + 46),
  destructiveSoftForeground: shade(offset + 47),
  border: shade(offset + 19),
  borderStrong: shade(offset + 20),
  input: shade(offset + 21),
  inputForeground: shade(offset + 22),
  placeholder: shade(offset + 23),
  ring: shade(offset + 24),
  selection: wash(offset + 25),
  overlay: wash(offset + 26),
  hover: wash(offset + 27),
  active: wash(offset + 28),
  selected: shade(offset + 29),
  selectedForeground: shade(offset + 30),
  disabled: shade(offset + 31),
  disabledForeground: shade(offset + 32),
  skeleton: shade(offset + 33),
  scrollbar: shade(offset + 34),
  shadow: wash(offset + 35),
});

export const testTheme: PrimitiveTheme = {
  name: "Test",
  mode: "light",
  colors: palette(0),
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

export const testThemeDark: PrimitiveTheme = {
  ...testTheme,
  name: "Test Dark",
  mode: "dark",
  colors: palette(1000),
};

type MutableTypeGroup = {
  -readonly [Role in keyof PrimitiveTheme["typography"]]?: PrimitiveTheme["typography"][Role];
};

export const themeWithoutRole = (
  role: TextRole,
  theme: PrimitiveTheme = testTheme,
): PrimitiveTheme => {
  const typography: MutableTypeGroup = { ...theme.typography };
  delete typography[role];
  return { ...theme, typography } as PrimitiveTheme;
};
