import {
  applyStyle,
  platformTheme,
  platformTypes,
  retroNames,
  retroStyles,
  themes,
  type PlatformName,
  type RetroName,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The platform a preview shows.
 *
 * The platform is a library decision, not a docs style: the switch resolves
 * `platformTheme` from `@gpuixui/tokens`, so a preview reads the families (and,
 * as the token platform styles land, the shape) the library names rather than a
 * style sheet written for the browser.
 */

/** The query parameter that carries the platform on every docs URL. */
export const platformParam = "platform";

/** The platforms the switch offers, in the order it shows them. */
export const platformOrder = [
  "darwin",
  "linux",
  "win32",
  "default",
] as const satisfies readonly PlatformName[];

/** The label the library gives a platform. */
export const platformLabel = (platform: PlatformName): string =>
  platformTypes[platform].label;

/**
 * Parse a raw query value. A value the library does not name is rejected
 * rather than guessed, so a mistyped URL falls back to the remembered or
 * default platform.
 */
export const parsePlatform = (
  raw: string | null | undefined,
): PlatformName | undefined => platformOrder.find((option) => option === raw);

/** Read the platform out of a query string (`?platform=win32`). */
export const platformFromSearch = (search: string): PlatformName | undefined =>
  parsePlatform(new URLSearchParams(search).get(platformParam));

/** The query string a platform produces (`?platform=win32`). */
export const platformSearch = (platform: PlatformName): string =>
  `?${platformParam}=${platform}`;

/**
 * The authored look a preview paints, or `native` for the platform's own style.
 *
 * A look is not a platform: `platformNames` is the persisted key for the
 * operating systems an application runs on, and `luna`/`aero` are styles of the
 * same shape (`retroStyles`). Offering them here is the extension mechanism in
 * practice, not a fifth platform — the mission's toggle stays macOS · Linux ·
 * Windows · Default.
 */
export type LookName = "native" | RetroName;

/** The query parameter that carries a look. */
export const lookParam = "look";

/** The looks the switch offers, in order: the platform's own style first. */
export const lookOrder = [
  "native",
  ...retroNames,
] as const satisfies readonly LookName[];

/** The label a look shows: `Platform` for the native style, the style's own name otherwise. */
export const lookLabel = (look: LookName): string =>
  look === "native" ? "Platform" : retroStyles[look].label;

/** Parse a raw look. A name the library does not ship is rejected, not guessed. */
export const parseLook = (
  raw: string | null | undefined,
): LookName | undefined => lookOrder.find((look) => look === raw);

/** Read a look out of a query string (`?look=luna`). */
export const lookFromSearch = (search: string): LookName | undefined =>
  parseLook(new URLSearchParams(search).get(lookParam));

/** The query value a look writes (`luna`), or nothing for the platform style. */
export const lookSearch = (look: LookName): string => look;

/** The query parameter that carries the palette a preview paints. */
export const modeParam = "mode";

/**
 * The palettes a preview offers, in switch order: the library's identity first,
 * because that is what a first visit shows.
 */
export const modeOrder = [
  "dark",
  "light",
] as const satisfies readonly ThemeMode[];

/** The label a palette shows in the switch. */
export const modeLabel = (mode: ThemeMode): string =>
  mode === "dark" ? "Dark" : "Light";

/**
 * Parse a raw mode. A value the library does not name is rejected rather than
 * guessed, so a mistyped URL falls back to the remembered or opening palette.
 */
export const parseMode = (
  raw: string | null | undefined,
): ThemeMode | undefined => modeOrder.find((mode) => mode === raw);

/** Read the mode out of a query string (`?mode=light`). */
export const modeFromSearch = (search: string): ThemeMode | undefined =>
  parseMode(new URLSearchParams(search).get(modeParam));

/** The query string a mode produces (`?mode=light`). */
export const modeSearch = (mode: ThemeMode): string => `?${modeParam}=${mode}`;

/**
 * The palette a preview opens in.
 *
 * The docs site has its own light/dark switch (Fumadocs' theme provider), and a
 * preview deliberately does not follow it: a preview is a picture of the
 * library, and its identity is the dark theme. The palette a reader compares is
 * the switch's own `?mode=` axis, so the site resolves one opening mode and
 * says which — `/docs/theming` prints this value rather than typing "dark", so a
 * page and the provider cannot disagree.
 */
export const previewMode: ThemeMode = "dark";

/**
 * What the browser says about the visitor's desktop.
 *
 * `maxTouchPoints` is the only difference an iPad in desktop mode reports: it
 * sends the Macintosh user agent a Mac sends, but reports touches where a Mac
 * reports none.
 */
export interface PlatformSignals {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
}

/** The browser's signals, or none on the server, where `navigator` is absent. */
export const browserSignals = (): PlatformSignals =>
  typeof navigator === "undefined"
    ? { userAgent: "", maxTouchPoints: 0 }
    : {
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      };

/** The desktop family a user agent names, before the library picks a platform. */
export type PlatformFamily = "ios" | "macos" | "windows" | "linux" | "unknown";

/**
 * The family `signals` name.
 *
 * The order is the rule: an iPad in desktop mode says Macintosh, and the touch
 * count is what separates it from the Mac it imitates. A user agent none of the
 * patterns names is `unknown`, not a guess at a desktop.
 */
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

/**
 * The platform a first visit opens on.
 *
 * iOS, macOS and every desktop the library does not name resolve to `darwin`,
 * the site's own identity; Windows and Linux resolve to the styles the library
 * ships for them.
 */
export const detectPlatform = (
  signals: PlatformSignals = browserSignals(),
): PlatformName => platformOfFamily[platformFamily(signals)];

/**
 * The authored look an Omarchy desktop shows, once `retroStyles` ships it.
 *
 * Omarchy is a Linux desktop with its own authored look, so it is a look rather
 * than a platform. Reading the same `lookOrder` the switch offers keeps the
 * answer absent — and the style `native` — until the style exists.
 */
export const omarchyLook = parseLook("omarchy");

/** Whether a user agent or a stored marker names Omarchy. */
export const namesOmarchy = (marker: string | null | undefined): boolean =>
  /omarchy/i.test(marker ?? "");

/** The look a first visit paints: Omarchy's when shipped, else the platform's. */
export const detectLook = (omarchy: boolean): LookName =>
  omarchy ? (omarchyLook ?? "native") : "native";

/** One choice of platform, look and palette: what the switch shows. */
export interface PreviewChoice {
  readonly platform: PlatformName;
  readonly look: LookName;
  readonly mode: ThemeMode;
}

/**
 * The choice a visit opens with: the URL, then the store, then detection.
 *
 * `remembered` is the store's answer with detection filled in where it had
 * none, so this function is the whole precedence: a shared link wins over the
 * visitor's last choice, and both win over the browser's own report.
 */
export const openingChoice = (
  search: string,
  remembered: PreviewChoice,
): PreviewChoice => ({
  platform: platformFromSearch(search) ?? remembered.platform,
  look: lookFromSearch(search) ?? remembered.look,
  mode: modeFromSearch(search) ?? remembered.mode,
});

/**
 * The theme a preview shows: the library's platform variant over one of its
 * built-in modes, then the authored look over that when one is chosen.
 *
 * `applyStyle` keeps the base's contrast: a high-contrast base takes a look's
 * families, radii and density but keeps its own palette, so the look cannot
 * undo the floors the base was chosen for.
 */
export const resolvePlatformTheme = (
  platform: PlatformName,
  mode: ThemeMode = previewMode,
  look: LookName = "native",
): Theme => {
  const base = platformTheme(themes[mode], platform);
  return look === "native" ? base : applyStyle(base, retroStyles[look]);
};

/**
 * The theme editor's two bases: the selected platform style (and authored look)
 * in each mode. The editor pins only what a reader changes, so a switch of the
 * platform re-bases the preview while the edits stay — the same
 * `extendTheme(platformStyle, edits)` a consumer writes by hand.
 */
export const platformThemes = (
  platform: PlatformName,
  look: LookName = "native",
): Readonly<Record<ThemeMode, Theme>> => ({
  light: resolvePlatformTheme(platform, "light", look),
  dark: resolvePlatformTheme(platform, "dark", look),
});
