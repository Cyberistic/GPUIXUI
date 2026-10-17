/**
 * Platform recipes.
 *
 * A shipped platform style is the current look of a platform; a recipe is an
 * era of one. The recipes are plain {@link PlatformStyle} data, so a consumer
 * copies a file and edits it exactly the way a shipped variant is edited. They
 * deliberately do not join the platform axis: `platformNames` stays macOS ·
 * Linux · Windows · Default, and a docs switch offers a recipe beside those
 * variants rather than turning it into a fifth platform.
 */

import { aeroPlatformRecipe } from "./platform-styles/recipes/aero.js";
import { xpPlatformRecipe } from "./platform-styles/recipes/xp.js";
import type { PlatformStyle } from "./platform-types.js";
import {
  applyPlatformStyle,
  getTheme,
  type Theme,
  type ThemeContrast,
  type ThemeMode,
} from "./theme.js";

/**
 * Every recipe, in documentation order. `PlatformRecipeName` derives from this
 * list, so a new recipe must also gain a value in `platformRecipes`.
 */
export const platformRecipeNames = ["xp", "aero"] as const;

/** A platform recipe the library ships. */
export type PlatformRecipeName = (typeof platformRecipeNames)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a shipped
 * recipe. A recipe is not a platform: `isPlatformName("xp")` is `false`.
 */
export const isPlatformRecipeName = (
  value: unknown,
): value is PlatformRecipeName =>
  platformRecipeNames.some((name) => name === value);

/**
 * The shipped recipes. `xp` is Windows XP (Luna) and `aero` is Windows 7
 * (Aero); both reshape the Windows variant through colour, shape and motion,
 * and both are held to the contrast contract in each mode.
 */
export const platformRecipes: Readonly<
  Record<PlatformRecipeName, PlatformStyle>
> = {
  xp: xpPlatformRecipe,
  aero: aeroPlatformRecipe,
};

/**
 * Resolve a recipe for a mode and contrast level. It composes the same
 * `applyPlatformStyle` path as `getPlatformTheme`, so a recipe cannot take a
 * route a shipped variant does not test. At `"high"` only families and shape
 * apply, for the reason the platform variants give: a recipe accent must not
 * drop the AAA floors.
 *
 * @example
 * ```tsx
 * import { getPlatformRecipeTheme } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={getPlatformRecipeTheme("xp", "light")} />
 * ```
 */
export function getPlatformRecipeTheme(
  recipe: PlatformRecipeName,
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  return applyPlatformStyle(getTheme(mode, contrast), platformRecipes[recipe]);
}
