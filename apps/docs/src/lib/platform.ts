import {
  applyStyle,
  platformTheme,
  platformTypes,
  retroNames,
  retroStyles,
  shadcnNeutralTheme,
  themes,
  type PlatformName,
  type RetroName,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";

export const platformOrder = [
  "darwin",
  "linux",
  "win32",
  "default",
] as const satisfies readonly PlatformName[];

export const platformLabel = (platform: PlatformName): string =>
  platformTypes[platform].label;

export const landingPlatformOrder = ["macos", "windows", "linux"] as const;

export type LandingPlatform = (typeof landingPlatformOrder)[number];

const landingPlatformLabels: Readonly<Record<LandingPlatform, string>> = {
  macos: "macOS",
  windows: "Windows 11",
  linux: "Linux / Arch",
};

export const landingPlatformLabel = (platform: LandingPlatform): string =>
  landingPlatformLabels[platform];

export const parsePlatform = (
  raw: string | null | undefined,
): PlatformName | undefined => platformOrder.find((option) => option === raw);

export type LookName = "native" | RetroName;

export const lookOrder = [
  "native",
  ...retroNames,
] as const satisfies readonly LookName[];

export const lookLabel = (look: LookName): string =>
  look === "native" ? "Platform" : retroStyles[look].label;

export const parseLook = (
  raw: string | null | undefined,
): LookName | undefined => lookOrder.find((look) => look === raw);

export const modeOrder = [
  "dark",
  "light",
] as const satisfies readonly ThemeMode[];

export const modeLabel = (mode: ThemeMode): string =>
  mode === "dark" ? "Dark" : "Light";

export const parseMode = (
  raw: string | null | undefined,
): ThemeMode | undefined => modeOrder.find((mode) => mode === raw);

export const previewMode: ThemeMode = "dark";

export interface PlatformSignals {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
}

export const browserSignals = (): PlatformSignals =>
  typeof navigator === "undefined"
    ? { userAgent: "", maxTouchPoints: 0 }
    : {
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      };

export type PlatformFamily = "ios" | "macos" | "windows" | "linux" | "unknown";

export const platformFamily = (
  { userAgent, maxTouchPoints }: PlatformSignals = browserSignals(),
): PlatformFamily => {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Macintosh|Mac OS X/.test(userAgent))
    return maxTouchPoints > 1 ? "ios" : "macos";
  if (/Windows/.test(userAgent)) return "windows";
  if (/Linux/.test(userAgent)) return "linux";
  return "unknown";
};

const platformOfFamily = {
  ios: "darwin",
  macos: "darwin",
  windows: "win32",
  linux: "linux",
  unknown: "darwin",
} as const satisfies Record<PlatformFamily, PlatformName>;

export const detectPlatform = (
  signals: PlatformSignals = browserSignals(),
): PlatformName => platformOfFamily[platformFamily(signals)];

export const omarchyLook = parseLook("omarchy");

export const namesOmarchy = (marker: string | null | undefined): boolean =>
  /omarchy/i.test(marker ?? "");

export const detectLook = (omarchy: boolean): LookName =>
  omarchy ? (omarchyLook ?? "native") : "native";

export interface PreviewChoice {
  readonly platform: PlatformName;
  readonly look: LookName;
  readonly mode: ThemeMode;
}

export const choosingPlatform = (
  choice: PreviewChoice,
  platform: PlatformName,
): PreviewChoice => ({ ...choice, platform, look: "native" });

export const resolvePlatformTheme = (
  platform: PlatformName,
  mode: ThemeMode = previewMode,
  look: LookName = "native",
): Theme => {
  const base =
    platform === "default"
      ? shadcnNeutralTheme(mode)
      : platformTheme(themes[mode], platform);
  return look === "native" ? base : applyStyle(base, retroStyles[look]);
};

export const platformThemes = (
  platform: PlatformName,
  look: LookName = "native",
): Readonly<Record<ThemeMode, Theme>> => ({
  light: resolvePlatformTheme(platform, "light", look),
  dark: resolvePlatformTheme(platform, "dark", look),
});
