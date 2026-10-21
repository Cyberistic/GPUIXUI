import {
  getPlatformRecipeTheme,
  isPlatformRecipeName,
} from "./platform-recipes.js";
import { isPlatformName } from "./platforms.js";
import { isDensityName } from "./scale.js";
import {
  extendTheme,
  getPlatformTheme,
  isThemeContrast,
  isThemeMode,
  type Theme,
} from "./theme.js";

/**
 * A theme choice as it arrives from storage — a settings row, a shareable URL,
 * an older release. Every axis is `unknown` until {@link resolveThemeChoice}
 * narrows it; the shape of the object is the caller's `Schema` boundary, the
 * unions are the package's, so no consumer retypes a guard. A URL is the one
 * boundary the package transports itself: {@link themeChoiceFromParams} decodes
 * it and {@link themeChoiceParams} writes it back canonically.
 */
export interface ThemeChoice {
  /** `"light"` or `"dark"`; an unknown value resolves to `"light"`. */
  readonly mode?: unknown;
  /** `"default"` or `"high"`; an unknown value resolves to `"default"`. */
  readonly contrast?: unknown;
  /** A shipped platform; an unknown value resolves to the identity. */
  readonly platform?: unknown;
  /** A shipped recipe, which takes precedence over `platform`. */
  readonly recipe?: unknown;
  /** A shipped density preset; an unknown value keeps the resolved theme's. */
  readonly density?: unknown;
}

/**
 * The query keys a shareable theme choice uses, in the order a canonical URL
 * writes them. A consumer clears these keys before applying
 * {@link themeChoiceParams}, so an axis a previous link set cannot survive
 * beside its replacement.
 */
export const themeChoiceKeys = [
  "mode",
  "contrast",
  "platform",
  "recipe",
  "density",
] as const;

/** A key of {@link themeChoiceKeys}. */
export type ThemeChoiceKey = (typeof themeChoiceKeys)[number];

/**
 * The lookup a URL search object provides. `URLSearchParams` satisfies it, as
 * does a plain record read through a function, so the package never depends on
 * a global the native runtime may not install. The `null | undefined` return is
 * `URLSearchParams.get`'s own boundary shape; the core entry is deliberately
 * dependency-free, so absence here is the platform's union rather than an
 * `Option` this package would have to pull in.
 */
export interface ThemeParamSource {
  readonly get: (key: string) => string | null | undefined;
}

/**
 * A row read from storage. The shape is not trusted: a missing key arrives as
 * `null`, the text `"null"` parses to `null`, and neither is a row.
 */
const isRow = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Narrow the five axes through the package's guards — the one owner of the
 * choice a URL, a stored row and a settings screen carry. An unknown value is
 * absent, so an older or newer row still resolves to a readable theme.
 */
const narrowChoice = (read: (key: ThemeChoiceKey) => unknown): ThemeChoice => {
  const mode = read("mode");
  const contrast = read("contrast");
  const platform = read("platform");
  const recipe = read("recipe");
  const density = read("density");
  return {
    mode: isThemeMode(mode) ? mode : undefined,
    contrast: isThemeContrast(contrast) ? contrast : undefined,
    platform: isPlatformName(platform) ? platform : undefined,
    recipe: isPlatformRecipeName(recipe) ? recipe : undefined,
    density: isDensityName(density) ? density : undefined,
  };
};

/**
 * Decode a shareable URL's query into a theme choice. Each of the five keys is
 * narrowed by the package's own guard, so a consumer never retypes one; an
 * unknown value is treated as absent, exactly like a missing key, so a
 * hand-edited or older link still resolves to a readable theme through
 * {@link resolveThemeChoice}.
 *
 * A key the URL does not carry is reported as `undefined` rather than dropped,
 * so the result has the same shape whether the link came from
 * {@link themeChoiceParams} or was written by hand.
 *
 * @example
 * ```ts
 * import { resolveThemeChoice, themeChoiceFromParams } from "@gpuixui/tokens";
 *
 * const search = new URLSearchParams("?mode=dark&platform=win32");
 * const theme = resolveThemeChoice(themeChoiceFromParams(search));
 * ```
 */
export function themeChoiceFromParams(source: ThemeParamSource): ThemeChoice {
  return narrowChoice((key) => source.get(key));
}

/**
 * Decode a persisted row — a settings object, a stored preference, a payload —
 * into a {@link ThemeChoice} without trusting its shape.
 *
 * The row is what the application stores; the five unions are the package's, so
 * the package narrows them. Every axis goes through the same guard as a URL
 * parameter: a known value is kept, an unknown or missing value is absent, and a
 * key the row does not know is ignored, so a row written by an older or a newer
 * release still opens. A value that is not a row at all — `null` from a missing
 * storage key, the text `"null"` after `JSON.parse`, a number, an array — is the
 * empty choice, which {@link resolveThemeChoice} resolves to the identity.
 *
 * The shape of a **theme object** loaded from a file or a URL is a different
 * boundary and stays the application's `Schema`.
 *
 * @example
 * ```ts
 * import { resolveThemeChoice, themeChoiceFromRow } from "@gpuixui/tokens";
 *
 * const theme = resolveThemeChoice(themeChoiceFromRow(storedPreference));
 * ```
 */
export function themeChoiceFromRow(value: unknown): ThemeChoice {
  const row: Readonly<Record<string, unknown>> = isRow(value) ? value : {};
  return narrowChoice((key) => row[key]);
}

const encodeThemeChoice: Readonly<
  Record<ThemeChoiceKey, (choice: ThemeChoice) => string | undefined>
> = {
  mode: (choice) =>
    isThemeMode(choice.mode) && choice.mode !== "light"
      ? choice.mode
      : undefined,
  contrast: (choice) =>
    isThemeContrast(choice.contrast) && choice.contrast !== "default"
      ? choice.contrast
      : undefined,
  platform: (choice) =>
    isPlatformRecipeName(choice.recipe)
      ? undefined
      : isPlatformName(choice.platform) && choice.platform !== "default"
        ? choice.platform
        : undefined,
  recipe: (choice) =>
    isPlatformRecipeName(choice.recipe) ? choice.recipe : undefined,
  density: (choice) => resolveThemeChoice(choice).density.name,
};

/**
 * The canonical query entries for a choice, in {@link themeChoiceKeys} order.
 *
 * An axis is omitted when the reader's fallback already selects it: `mode` only
 * for `dark`, `contrast` only for `high`, and `platform` only for `darwin`,
 * `linux` or `win32`, because `default` is the identity an absent key already
 * selects. A valid `recipe` suppresses `platform`, which
 * {@link resolveThemeChoice} could never apply beside it.
 *
 * `density` is the one axis always written: the preset the choice resolves to,
 * which is the platform's (or the recipe's) when the row names none. Its
 * fallback belongs to another axis, so a link without a density would change
 * meaning the moment a reader edits that axis: `platform=darwin` writes
 * `density=compact`, and editing the same link to `win32` keeps `compact`
 * instead of silently taking Windows' `comfortable`. The writer is therefore
 * deliberately not minimal there.
 *
 * The writer is the other half of {@link themeChoiceFromParams}: a consumer
 * clears `themeChoiceKeys` on its search object and then applies these entries,
 * which is what stops a stale axis surviving a new link.
 *
 * @example
 * ```ts
 * import {
 *   themeChoiceKeys,
 *   themeChoiceParams,
 *   type ThemeChoice,
 * } from "@gpuixui/tokens";
 *
 * const next = new URLSearchParams("?platform=win32");
 * const choice: ThemeChoice = { mode: "dark", recipe: "aero" };
 * themeChoiceKeys.forEach((key) => next.delete(key));
 * themeChoiceParams(choice).forEach(([key, value]) => next.set(key, value));
 * ```
 */
export function themeChoiceParams(
  choice: ThemeChoice,
): ReadonlyArray<readonly [ThemeChoiceKey, string]> {
  return themeChoiceKeys.flatMap((key) => {
    const value = encodeThemeChoice[key](choice);
    return value === undefined ? [] : [[key, value] as const];
  });
}

/**
 * Resolve a persisted theme choice to a theme.
 *
 * The mode and contrast select the built-in variant, then the recipe or the
 * platform styles it, and finally a stored density is applied. That order is
 * the contract: a platform style carries its own density preset — macOS is
 * `compact` — so applying the density first would silently revert it, and a
 * recipe is an edition of a platform offered beside the platform axis, so a
 * stored object carrying both resolves the recipe.
 *
 * An unknown axis keeps a readable default rather than failing: an unknown mode
 * is `light`, an unknown contrast is `default`, an unknown platform is the
 * identity, an unknown recipe falls back to the platform, and an unknown
 * density keeps the resolved theme's preset. A persisted value from an older
 * release must not stop a settings screen from opening.
 *
 * @example
 * ```ts
 * import { resolveThemeChoice, type ThemeChoice } from "@gpuixui/tokens";
 *
 * const stored: ThemeChoice = {
 *   mode: "dark",
 *   platform: "win32",
 *   density: "compact",
 * };
 * const theme = resolveThemeChoice(stored);
 * ```
 */
export function resolveThemeChoice(choice: ThemeChoice): Theme {
  const mode = isThemeMode(choice.mode) ? choice.mode : "light";
  const contrast = isThemeContrast(choice.contrast)
    ? choice.contrast
    : "default";
  const theme = isPlatformRecipeName(choice.recipe)
    ? getPlatformRecipeTheme(choice.recipe, mode, contrast)
    : getPlatformTheme(
        isPlatformName(choice.platform) ? choice.platform : "default",
        mode,
        contrast,
      );
  return isDensityName(choice.density)
    ? extendTheme(theme, { density: choice.density })
    : theme;
}
