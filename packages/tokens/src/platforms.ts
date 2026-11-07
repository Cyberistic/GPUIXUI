import type { ThemeColors } from "./color.js";
import { shadcnOverrides, type ShadcnVars } from "./shadcn-vars.js";
import {
  radius as defaultRadius,
  type DensityName,
  type Radius,
} from "./scale.js";
import type { MaterialFills, WindowBackground } from "./materials.js";
import type { StoredSeries } from "./series.js";
import { darkSyntax, type StoredSyntax, type SyntaxColors } from "./syntax.js";
import type {
  Interaction,
  SwitchColors,
  SwitchMetrics,
  ThemeContrast,
  ThemeMode,
  ThemeOverrides,
  TypographyOverrides,
} from "./theme.js";

export const systemUiFont = ".SystemUIFont";

export const platformNames = ["darwin", "linux", "win32", "default"] as const;

export type PlatformName = (typeof platformNames)[number];

export const isPlatformName = (value: unknown): value is PlatformName =>
  platformNames.some((name) => name === value);

export interface PlatformType {
  readonly label: string;

  readonly sans: string;

  readonly mono: string;
}

export type PlatformColors = Readonly<Record<ThemeMode, Partial<ThemeColors>>>;

export interface PlatformStyle extends PlatformType {
  readonly radius: Radius;

  readonly density: DensityName;

  readonly colors: PlatformColors;

  readonly switch?: Readonly<Partial<Record<ThemeMode, SwitchColors>>>;

  readonly switchMetrics?: SwitchMetrics;

  readonly materials?: Readonly<Partial<Record<ThemeMode, MaterialFills>>>;
  readonly window?: WindowBackground;

  readonly interaction?: Interaction;

  readonly type?: Omit<TypographyOverrides, "sans" | "mono">;

  readonly series?: Readonly<Partial<Record<ThemeMode, StoredSeries>>>;

  readonly syntax?: Readonly<Partial<Record<ThemeMode, Partial<SyntaxColors>>>>;

  readonly contrast: ThemeContrast;
}

export interface PlatformStyleSource {
  readonly label?: unknown;

  readonly sans?: unknown;

  readonly mono?: unknown;

  readonly radius?: Partial<Radius> | null;

  readonly density?: ThemeOverrides["density"] | null;

  readonly contrast?: unknown;

  readonly colors?: Partial<
    Record<ThemeMode, Partial<ThemeColors> | null>
  > | null;

  readonly series?: Partial<Record<ThemeMode, StoredSeries>> | null;

  readonly syntax?: Partial<Record<ThemeMode, StoredSyntax | null>> | null;

  readonly switch?: Partial<Record<ThemeMode, SwitchColors>> | null;

  readonly switchMetrics?: SwitchMetrics | null;

  readonly materials?: Partial<Record<ThemeMode, MaterialFills>> | null;

  readonly window?: unknown;

  readonly interaction?: unknown;

  readonly type?: Omit<TypographyOverrides, "sans" | "mono"> | null;
}

const platformDarkSyntax: SyntaxColors = {
  ...darkSyntax,
  keyword: "#B0B2FF",
};

const palette = (
  modes: Readonly<Record<ThemeMode, PlatformPalette>>,
): PlatformColors => ({
  light: { ...mappedOf(modes.light), ...modes.light.extras },
  dark: { ...mappedOf(modes.dark), ...modes.dark.extras },
});

const mappedOf = (palette: PlatformPalette): Partial<ThemeColors> =>
  shadcnOverrides(palette.shadcn, { derive: false }).colors ?? {};

interface PlatformPalette {
  readonly shadcn: ShadcnVars;
  readonly extras: Partial<ThemeColors>;
}

export const platformStyles: Readonly<Record<PlatformName, PlatformStyle>> = {
  darwin: {
    label: "macOS",
    sans: systemUiFont,
    mono: "Menlo",

    radius: { none: 0, sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    density: "compact",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },

    switch: {
      light: {
        on: "#34C759",
        off: "#E9E9EA",
        knob: "#FFFFFF",
        edge: "#C7C7CC",
      },
      dark: {
        on: "#30D158",
        off: "#39393D",
        knob: "#FFFFFF",
        edge: "#5A5A5E",
      },
    },
    switchMetrics: { width: 38, height: 22, knob: 20, inset: 1, border: 0 },

    window: "blurred",
    interaction: "appkit",

    type: {
      body: { fontSize: 13, lineHeight: 16 },
      bodyStrong: { fontSize: 13, lineHeight: 16 },
      label: { fontSize: 12, lineHeight: 15 },
      caption: { fontSize: 11, lineHeight: 14 },
    },
    materials: {
      light: {
        sidebar: "#E9E9EF99",
        titlebar: "#F2F2F7CC",
        popover: "#FFFFFFCC",
        hud: "#FFFFFFB3",
        sheet: "#FFFFFFE6",
      },
      dark: {
        sidebar: "#16161A80",
        titlebar: "#1C1C1ECC",
        popover: "#2C2C30CC",
        hud: "#1C1C1EB3",
        sheet: "#26262AE6",
      },
    },
    colors: palette({
      light: {
        shadcn: {
          background: "#F2F2F7",
          card: "#FFFFFF",
          popover: "#FFFFFF",
          input: "#FFFFFF",
          secondary: "#DEE3EA",
          muted: "#E9E9EF",
          border: "#D9D9E0",
          primary: "#0A6CD6",
          "primary-foreground": "#FFFFFF",
          ring: "#0A6CD6",
          accent: "#CADEF7",
          "accent-foreground": "#08407A",
        },
        extras: {
          skeleton: "#DCDFE7",
          hover: "#E2E2E8",
          active: "#DEDEE6",
          borderStrong: "#67686D",
          selected: "#D3E5FB",
          selectedForeground: "#0B3D6B",
          selection: "#0A6CD63D",
        },
      },
      dark: {
        shadcn: {
          background: "#1C1C1E",
          card: "#26262A",
          popover: "#2C2C30",
          input: "#1F1F22",
          secondary: "#3A3A3C",
          muted: "#16161A",
          border: "#3A3A40",
          primary: "#3B9DFF",
          "primary-foreground": "#11141A",
          ring: "#4CA2FF",
          accent: "#1A3D60",
          "accent-foreground": "#B2D3F9",
        },
        extras: {
          skeleton: "#303036",
          hover: "#35353B",
          active: "#3A3A40",
          borderStrong: "#ACACB1",
          selected: "#0C3864",
          selectedForeground: "#C7E0FF",
          placeholder: "#8A93A3",
          selection: "#0A84FF4D",
        },
      },
    }),
  },
  linux: {
    label: "Linux",
    sans: systemUiFont,
    mono: "DejaVu Sans Mono",
    radius: { none: 0, sm: 4, md: 6, lg: 12, xl: 16, full: 9999 },
    density: "spacious",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },

    switch: {
      light: { on: "#3584E4", off: "#DEDDDA", knob: "#FFFFFF" },
      dark: { on: "#78AEED", off: "#3D3D3D", knob: "#FFFFFF" },
    },
    switchMetrics: { width: 44, height: 24, knob: 18, inset: 3, border: 0 },
    colors: palette({
      light: {
        shadcn: {
          background: "#FAFAFA",
          card: "#FFFFFF",
          popover: "#FFFFFF",
          input: "#FFFFFF",
          muted: "#ECEBE9",
          border: "#D4D2CF",
          primary: "#1A6DD3",
          "primary-foreground": "#FFFFFF",
          ring: "#1A6DD3",
          accent: "#D2E4F7",
          "accent-foreground": "#12457F",
        },
        extras: {
          hover: "#E3E2DF",
          active: "#DCDBD8",
          borderStrong: "#6A6965",
          selected: "#CADDF3",
          selectedForeground: "#0F3E74",
          selection: "#3584E43D",
        },
      },
      dark: {
        shadcn: {
          background: "#242424",
          card: "#303030",
          popover: "#383838",
          input: "#212121",
          secondary: "#404040",
          muted: "#2A2A2A",
          border: "#464646",
          primary: "#78AEED",
          "primary-foreground": "#11141A",
          ring: "#78AEED",
          accent: "#1B3E60",
          "accent-foreground": "#BBD9F7",
        },
        extras: {
          skeleton: "#3E3E3E",
          hover: "#343434",
          active: "#3D3D3D",
          borderStrong: "#B2B3B4",
          selected: "#1F4363",
          selectedForeground: "#CFE4FA",
          placeholder: "#8A93A3",
          selection: "#78AEED3D",
        },
      },
    }),
  },
  win32: {
    label: "Windows",

    sans: systemUiFont,
    mono: "Consolas",

    radius: { none: 0, sm: 4, md: 4, lg: 8, xl: 8, full: 9999 },
    density: "comfortable",
    contrast: "default",
    syntax: { dark: platformDarkSyntax },

    switch: {
      light: {
        on: "#0078D4",
        off: "transparent",
        knob: "#FFFFFF",
        knobOff: "#616161",
        edge: "#8A8A8A",
      },
      dark: {
        on: "#4CC2FF",
        off: "transparent",
        knob: "#000000",
        knobOff: "#CFCFCF",
        edge: "#8A8A8A",
      },
    },
    switchMetrics: { width: 40, height: 20, knob: 12, inset: 4, border: 1 },
    colors: palette({
      light: {
        shadcn: {
          background: "#F3F3F3",
          card: "#FFFFFF",
          popover: "#FFFFFF",
          input: "#FFFFFF",
          muted: "#EBEBEB",
          border: "#E5E5E5",
          primary: "#0078D4",
          "primary-foreground": "#FFFFFF",
          ring: "#0078D4",
          accent: "#CFE6F9",
          "accent-foreground": "#003E6F",
        },
        extras: {
          hover: "#E0E0E0",
          active: "#D6D6D6",
          borderStrong: "#696A6B",
          selected: "#C8E0F3",
          selectedForeground: "#093A5C",
          destructiveSoftForeground: "#5C1619",
          selection: "#0067C03D",
        },
      },
      dark: {
        shadcn: {
          background: "#202020",
          card: "#2C2C2C",
          popover: "#2D2D2D",
          input: "#1F1F1F",
          secondary: "#3A3A3A",
          muted: "#262626",
          border: "#3D3D3D",
          primary: "#4CC2FF",
          "primary-foreground": "#11141A",
          ring: "#4CC2FF",
          accent: "#1B3A50",
          "accent-foreground": "#C9E9FF",
        },
        extras: {
          skeleton: "#323232",
          hover: "#333333",
          active: "#3A3A3A",
          borderStrong: "#ACACAD",
          selected: "#143E59",
          selectedForeground: "#CDEBFF",
          placeholder: "#8A93A3",
          selection: "#60CDFF3D",
        },
      },
    }),
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

export const platformTypes: Readonly<Record<PlatformName, PlatformType>> =
  platformStyles;

const knownPlatform = (name: string): PlatformName =>
  isPlatformName(name) ? name : "default";

declare const process: { readonly platform?: string } | undefined;

export const currentPlatform: PlatformName =
  typeof process === "undefined" || process.platform === undefined
    ? "default"
    : knownPlatform(process.platform);

export const systemMonoFamily: string = platformTypes[currentPlatform].mono;
