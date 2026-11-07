import { colourFunctions, isNamedColour, measuredColour } from "./measure.js";

export const palette = {
  neutral: {
    0: "#FFFFFF",
    25: "#FBFCFD",
    50: "#F6F8FA",
    100: "#EEF1F5",
    200: "#E1E5EC",
    300: "#CBD1DB",
    400: "#A1A9B7",
    500: "#737C8C",
    600: "#545D6C",
    700: "#3D4552",
    800: "#2A303B",
    850: "#222730",
    900: "#191D25",
    950: "#11141A",
    1000: "#0B0D11",
  },
  blue: {
    50: "#EFF4FF",
    100: "#DEE9FF",
    200: "#C5D8FF",
    300: "#9FBEFF",
    400: "#6E9CFF",
    500: "#3B76F6",
    600: "#2559D6",
    700: "#1B45AC",
    800: "#173A88",
    900: "#152F6B",
    950: "#0C1D42",
  },
  iris: {
    50: "#EEF0FF",
    100: "#E0E3FF",
    200: "#C7CBFF",
    300: "#A7A9FF",
    400: "#8B85FB",
    500: "#7567F2",
    600: "#5F4BDB",
    700: "#4C39B5",
    800: "#3B2C8F",
    900: "#2E2370",
    950: "#1C1547",
  },
  red: {
    50: "#FFF1F1",
    100: "#FFE0E0",
    200: "#FFC6C6",
    300: "#FF9E9E",
    400: "#FF6B6B",
    500: "#E5484D",
    600: "#CC3439",
    700: "#A5262B",
    800: "#7E1D21",
    900: "#5C1619",
    950: "#3A0B0D",
  },
  green: {
    50: "#ECFDF3",
    100: "#D3F9E2",
    200: "#A8F0C6",
    300: "#6FE0A3",
    400: "#3BC97F",
    500: "#1FA968",
    600: "#158754",
    700: "#116A43",
    800: "#0E5135",
    900: "#0A3A26",
    950: "#042015",
  },
  amber: {
    50: "#FFF8E8",
    100: "#FFEFC6",
    200: "#FFDE8A",
    300: "#FFC94D",
    400: "#F5B01F",
    500: "#D99400",
    600: "#B57600",
    700: "#8E5B00",
    800: "#6B4500",
    900: "#4B3100",
    950: "#2A1B00",
  },
} as const;

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

  readonly warning: string;

  readonly warningForeground: string;

  readonly info: string;

  readonly infoForeground: string;

  readonly infoSoft: string;

  readonly infoSoftForeground: string;

  readonly successSoft: string;

  readonly successSoftForeground: string;

  readonly warningSoft: string;

  readonly warningSoftForeground: string;

  readonly destructiveSoft: string;

  readonly destructiveSoftForeground: string;

  readonly border: string;

  readonly borderStrong: string;

  readonly input: string;

  readonly inputForeground: string;

  readonly placeholder: string;

  readonly ring: string;

  readonly selection: string;

  readonly overlay: string;

  readonly hover: string;

  readonly active: string;

  readonly selected: string;

  readonly selectedForeground: string;

  readonly disabled: string;

  readonly disabledForeground: string;

  readonly skeleton: string;

  readonly scrollbar: string;

  readonly shadow: string;
}

export interface ColourSource {
  readonly colors?: Partial<Record<keyof ThemeColors, unknown>> | null;
}

export const namesColour = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isRoleTable = (
  colors: Partial<Record<keyof ThemeColors, unknown>>,
): colors is Partial<ThemeColors> => Object.values(colors).every(namesColour);

export function themeColors(theme: ColourSource): Partial<ThemeColors> {
  const colors = theme.colors;
  if (colors === undefined || colors === null) {
    return {};
  }
  return isRoleTable(colors)
    ? colors
    : colorRoles.reduce<Partial<ThemeColors>>((roles, role) => {
        const value = colors[role];
        return namesColour(value) ? { ...roles, [role]: value } : roles;
      }, {});
}

export const lightColors = {
  background: palette.neutral[50],
  foreground: palette.neutral[900],
  card: palette.neutral[0],
  cardForeground: palette.neutral[900],
  popover: palette.neutral[0],
  popoverForeground: palette.neutral[900],
  primary: palette.iris[600],
  primaryForeground: palette.neutral[0],
  secondary: palette.neutral[200],
  secondaryForeground: palette.neutral[800],
  muted: palette.neutral[100],

  mutedForeground: "#4B5362",
  accent: palette.iris[100],
  accentForeground: palette.iris[800],
  destructive: palette.red[600],
  destructiveForeground: palette.neutral[0],
  success: palette.green[600],
  successForeground: palette.neutral[0],
  warning: palette.amber[400],
  warningForeground: palette.amber[950],
  info: palette.blue[600],
  infoForeground: palette.neutral[0],

  infoSoft: palette.blue[200],
  infoSoftForeground: palette.blue[900],
  successSoft: palette.green[200],
  successSoftForeground: palette.green[900],
  warningSoft: palette.amber[200],
  warningSoftForeground: palette.amber[900],
  destructiveSoft: palette.red[200],
  destructiveSoftForeground: palette.red[900],
  border: palette.neutral[200],
  borderStrong: "#616A79",
  input: palette.neutral[0],
  inputForeground: palette.neutral[900],
  placeholder: "#606A79",

  ring: palette.iris[600],
  selection: "#7567F23D",
  overlay: "#00000073",
  hover: "#E4E9F0",
  active: "#D6DBE4",
  selected: "#DADDF8",
  selectedForeground: palette.iris[800],
  disabled: palette.neutral[100],
  disabledForeground: palette.neutral[400],
  skeleton: palette.neutral[200],
  scrollbar: palette.neutral[300],
  shadow: "#191D2526",
} satisfies ThemeColors;

export const darkColors = {
  background: palette.neutral[950],
  foreground: palette.neutral[100],
  card: palette.neutral[900],
  cardForeground: palette.neutral[100],
  popover: palette.neutral[850],
  popoverForeground: palette.neutral[50],
  primary: palette.iris[300],
  primaryForeground: palette.neutral[950],
  secondary: palette.neutral[800],
  secondaryForeground: palette.neutral[200],

  muted: "#1E222A",

  mutedForeground: "#C1C7D1",
  accent: palette.iris[900],
  accentForeground: palette.iris[200],
  destructive: palette.red[400],
  destructiveForeground: palette.red[950],
  success: palette.green[400],
  successForeground: palette.green[950],
  warning: palette.amber[300],
  warningForeground: palette.amber[950],
  info: palette.blue[300],
  infoForeground: palette.neutral[950],

  infoSoft: palette.blue[800],
  infoSoftForeground: palette.blue[100],
  successSoft: palette.green[800],
  successSoftForeground: palette.green[100],
  warningSoft: palette.amber[800],
  warningSoftForeground: palette.amber[100],
  destructiveSoft: palette.red[800],
  destructiveSoftForeground: palette.red[100],
  border: palette.neutral[800],
  borderStrong: "#99A2AF",
  input: palette.neutral[900],
  inputForeground: palette.neutral[100],
  placeholder: "#858E9F",
  ring: palette.iris[300],
  selection: "#A7A9FF3D",
  overlay: "#000000A6",
  hover: "#272D37",
  active: "#333A46",
  selected: "#322773",
  selectedForeground: palette.iris[200],
  disabled: palette.neutral[850],
  disabledForeground: palette.neutral[600],
  skeleton: palette.neutral[800],
  scrollbar: palette.neutral[700],
  shadow: "#00000080",
} satisfies ThemeColors;

export const highContrastLightColors = {
  background: "#FFFFFF",
  foreground: "#000000",
  card: "#FFFFFF",
  cardForeground: "#000000",
  popover: "#FFFFFF",
  popoverForeground: "#000000",
  primary: "#3B2C8F",
  primaryForeground: "#FFFFFF",
  secondary: "#E8E8E8",
  secondaryForeground: "#000000",
  muted: "#F2F2F2",
  mutedForeground: "#1F1F1F",
  accent: "#E0E3FF",
  accentForeground: "#2E2370",
  destructive: "#7E1D21",
  destructiveForeground: "#FFFFFF",
  success: "#0E5135",
  successForeground: "#FFFFFF",
  warning: "#F5B01F",
  warningForeground: "#000000",
  info: palette.blue[700],
  infoForeground: "#FFFFFF",

  infoSoft: palette.blue[300],
  infoSoftForeground: palette.blue[950],
  successSoft: palette.green[300],
  successSoftForeground: palette.green[950],
  warningSoft: palette.amber[300],
  warningSoftForeground: palette.amber[950],
  destructiveSoft: palette.red[300],
  destructiveSoftForeground: palette.red[950],
  border: "#6E7683",
  borderStrong: "#454A53",
  input: "#FFFFFF",
  inputForeground: "#000000",
  placeholder: "#4A4F58",

  ring: "#3B2C8F",
  selection: "#7567F24D",
  overlay: "#000000A6",
  hover: "#E8E8E8",
  active: "#D6D6D6",
  selected: "#D9DCF7",
  selectedForeground: "#2E2370",

  disabled: "#F2F2F2",
  disabledForeground: "#5A5A5A",
  skeleton: "#D6D6D6",
  scrollbar: "#9A9A9A",
  shadow: "#00000040",
} satisfies ThemeColors;

export const highContrastDarkColors = {
  background: "#000000",
  foreground: "#FFFFFF",
  card: "#0D0D0D",
  cardForeground: "#FFFFFF",
  popover: "#141414",
  popoverForeground: "#FFFFFF",
  primary: "#C7CBFF",
  primaryForeground: "#000000",
  secondary: "#2E2E2E",
  secondaryForeground: "#FFFFFF",
  muted: "#1A1A1A",
  mutedForeground: "#E0E0E0",
  accent: "#231B59",
  accentForeground: "#E0E3FF",
  destructive: "#FF9E9E",
  destructiveForeground: "#000000",
  success: "#6FE0A3",
  successForeground: "#000000",
  warning: "#FFC94D",
  warningForeground: "#000000",
  info: palette.blue[200],
  infoForeground: "#000000",
  infoSoft: palette.blue[900],
  infoSoftForeground: palette.blue[100],
  successSoft: palette.green[900],
  successSoftForeground: palette.green[100],
  warningSoft: palette.amber[900],
  warningSoftForeground: palette.amber[100],
  destructiveSoft: palette.red[900],
  destructiveSoftForeground: palette.red[100],
  border: "#7A7A7A",
  borderStrong: "#C8C8C8",
  input: "#0D0D0D",
  inputForeground: "#FFFFFF",
  placeholder: "#B0B0B0",
  ring: "#C7CBFF",
  selection: "#C7CBFF42",
  overlay: "#000000CC",
  hover: "#2E2E2E",
  active: "#3D3D3D",
  selected: "#27205C",
  selectedForeground: "#E0E3FF",

  disabled: "#1A1A1A",
  disabledForeground: "#8A8A8A",
  skeleton: "#3D3D3D",
  scrollbar: "#8A8A8A",

  shadow: "#4A4A4AB3",
} satisfies ThemeColors;

const paintedHex =
  /^#?(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

interface ChannelScan {
  readonly channels: readonly string[];
  readonly channel: string;
  readonly depth: number;
  readonly slash: boolean;
  readonly broken: boolean;
}

const isChannelList = (args: string): boolean => {
  const initial: ChannelScan = {
    channels: [],
    channel: "",
    depth: 0,
    slash: false,
    broken: false,
  };
  const scan = args.split("").reduce((state: ChannelScan, character) => {
    const top = state.depth === 0;
    if (state.broken) {
      return state;
    }
    if (character === "(") {
      return {
        ...state,
        depth: state.depth + 1,
        channel: state.channel + character,
      };
    }
    if (character === ")") {
      return top
        ? { ...state, broken: true }
        : {
            ...state,
            depth: state.depth - 1,
            channel: state.channel + character,
          };
    }
    if (top && character === "/") {
      return { ...state, slash: true };
    }
    if (top && (character === "," || /\s/.test(character))) {
      return {
        ...state,
        channels:
          state.channel === ""
            ? state.channels
            : [...state.channels, state.channel],
        channel: "",
      };
    }
    return { ...state, channel: state.channel + character };
  }, initial);
  if (scan.broken || scan.depth !== 0) {
    return false;
  }
  const channels =
    scan.channel === "" ? scan.channels : [...scan.channels, scan.channel];

  if (channels[0]?.toLowerCase() === "from") {
    return true;
  }
  return scan.slash
    ? channels.length === 4
    : channels.length === 3 || channels.length === 4;
};

export const isPaintableColor = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  const colour = value.trim();
  if (paintedHex.test(colour) || isNamedColour(colour)) {
    return true;
  }
  const open = colour.indexOf("(");
  if (open < 1 || !colour.endsWith(")")) {
    return false;
  }

  return (
    colourFunctions.has(colour.slice(0, open).trimEnd().toLowerCase()) &&
    isChannelList(colour.slice(open + 1, -1))
  );
};

export function alpha(color: string, amount: number): string {
  const resolved = measuredColour(color);
  if (resolved === undefined || !Number.isFinite(amount)) {
    return color;
  }
  const byte = Math.round(Math.min(Math.max(amount, 0), 1) * 255);
  const hex = byte.toString(16).padStart(2, "0");
  return `${resolved.rgb}${hex}`.toUpperCase();
}

export function alphaOf(color: unknown): number {
  const alphaByte = measuredColour(color)?.alpha;
  return alphaByte === undefined ? 1 : Number.parseInt(alphaByte, 16) / 255;
}

export function blend(color: string, toward: string, amount: number): string {
  const base = measuredColour(color);
  const target = measuredColour(toward);
  if (base === undefined || target === undefined || !Number.isFinite(amount)) {
    return color;
  }
  const from = base.rgb.slice(1);
  const to = target.rgb.slice(1);
  const ratio = Math.min(Math.max(amount, 0), 1);
  const channel = (at: number): string => {
    const start = Number.parseInt(from.slice(at, at + 2), 16);
    const end = Number.parseInt(to.slice(at, at + 2), 16);
    return Math.round(start + (end - start) * ratio)
      .toString(16)
      .padStart(2, "0");
  };
  const rgb = [0, 2, 4].map(channel).join("");
  return `#${rgb}${base.alpha ?? ""}`.toUpperCase();
}

export const colorRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
  "infoSoft",
  "infoSoftForeground",
  "successSoft",
  "successSoftForeground",
  "warningSoft",
  "warningSoftForeground",
  "destructiveSoft",
  "destructiveSoftForeground",
  "border",
  "borderStrong",
  "input",
  "inputForeground",
  "placeholder",
  "ring",
  "selection",
  "overlay",
  "hover",
  "active",
  "selected",
  "selectedForeground",
  "disabled",
  "disabledForeground",
  "skeleton",
  "scrollbar",
  "shadow",
] as const satisfies readonly (keyof ThemeColors)[];

type EveryColorRoleListed<Listed extends keyof ThemeColors> =
  Exclude<keyof ThemeColors, Listed> extends never
    ? true
    : [
        "a colour role is missing from the index",
        Exclude<keyof ThemeColors, Listed>,
      ];

const colorRoleIndex: EveryColorRoleListed<(typeof colorRoles)[number]> = true;

void colorRoleIndex;

export const isColorRole = (value: unknown): value is keyof ThemeColors =>
  colorRoles.some((role) => role === value);

export interface InvalidColorRole {
  readonly role: keyof ThemeColors;

  readonly value: unknown;
}

const storedRole = (theme: ColourSource, role: keyof ThemeColors): unknown => {
  const value: unknown = theme.colors?.[role];
  return value === null ? undefined : value;
};

export function invalidColorRoles(
  theme: ColourSource,
): readonly InvalidColorRole[] {
  return colorRoles.flatMap((role) => {
    const value = storedRole(theme, role);
    return isPaintableColor(value) ? [] : [{ role, value }];
  });
}
