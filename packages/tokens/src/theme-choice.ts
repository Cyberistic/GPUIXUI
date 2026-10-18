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
 * unions are the package's, so no consumer retypes a guard.
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
