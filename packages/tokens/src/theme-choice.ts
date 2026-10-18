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

const readChoice = <A extends string>(
  source: ThemeParamSource,
  key: ThemeChoiceKey,
  guard: (value: unknown) => value is A,
): A | undefined => {
  const value = source.get(key);
  return guard(value) ? value : undefined;
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
  return {
    mode: readChoice(source, "mode", isThemeMode),
    contrast: readChoice(source, "contrast", isThemeContrast),
    platform: readChoice(source, "platform", isPlatformName),
    recipe: readChoice(source, "recipe", isPlatformRecipeName),
    density: readChoice(source, "density", isDensityName),
  };
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
  density: (choice) =>
    isDensityName(choice.density) ? choice.density : undefined,
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
 * `density` is the one axis written even when it equals the resolved theme's
 * preset, so the writer is deliberately not minimal there. Its fallback is the
 * *resolved theme's* preset, which the platform supplies (macOS ships
 * `compact`), so omitting it would make the same stored row resolve differently
 * the moment a reader edits the platform in the link: `platform=darwin` without
 * a density is `compact`, and the same link with `win32` is `comfortable`.
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
