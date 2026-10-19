/**
 * Every theme the library ships, in one ordered list.
 *
 * The package owns each theme axis — {@link themeModes}, {@link themeContrasts},
 * {@link platformNames} and {@link platformRecipeNames} — and each resolver, but
 * a consumer checking "every shipped theme" has to know how they compose. The
 * traps are not obvious: `platformNames` includes `default`, whose resolved
 * theme *is* the identity; a recipe is a second axis, not a platform name; and a
 * shipped set at both contrast levels is the full matrix, not one level. Every
 * hand-built list in the package's own suites fell into one of them.
 *
 * `shippedThemes` derives from the axis owners and calls the public resolvers,
 * so it cannot drift from them. It is plain data over a `Theme`, like everything
 * else here.
 */

import {
  platformRecipeNames,
  getPlatformRecipeTheme,
  type PlatformRecipeName,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import type { PlatformVariant } from "./platform-types.js";
import {
  getPlatformTheme,
  getTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";

/**
 * The styled platform variants, in {@link platformNames} order. Derived from the
 * union owner, so a fourth platform joins the enumeration without a second edit.
 */
export const platformVariants: ReadonlyArray<PlatformVariant> =
  platformNames.filter(
    (platform): platform is PlatformVariant => platform !== "default",
  );

/** A built-in identity theme: no platform style applied. */
export interface IdentityShippedTheme {
  /** Discriminates the three sources of a shipped set. */
  readonly source: "identity";
  /** The resolved theme — a built-in variant from {@link getTheme}. */
  readonly theme: Theme;
}

/** A platform variant applied to the built-in theme for its mode. */
export interface PlatformShippedTheme {
  /** Discriminates the three sources of a shipped set. */
  readonly source: "platform";
  /** The variant the set came from. */
  readonly platform: PlatformVariant;
  /** The resolved theme from {@link getPlatformTheme}. */
  readonly theme: Theme;
}

/** A platform recipe applied to the built-in theme for its mode. */
export interface RecipeShippedTheme {
  /** Discriminates the three sources of a shipped set. */
  readonly source: "recipe";
  /** The recipe the set came from. */
  readonly recipe: PlatformRecipeName;
  /** The resolved theme from {@link getPlatformRecipeTheme}. */
  readonly theme: Theme;
}

/**
 * One shipped set: the theme and the axis member it came from. `mode` and
 * `contrast` are read from `theme`, so the provenance and the value cannot
 * disagree.
 */
export type ShippedTheme =
  | IdentityShippedTheme
  | PlatformShippedTheme
  | RecipeShippedTheme;

/**
 * Every shipped set, in documentation order: the identity variants, the styled
 * platform variants, then the recipes. Within each block the mode is outer and
 * the contrast inner. The length is
 * `themeModes.length × themeContrasts.length × (1 + platformVariants.length +
 * platformRecipeNames.length)` — 24 sets today — because `default` is the
 * identity, not a variant.
 *
 * A consumer suite asserts the library's guarantee on the same set the library
 * does:
 *
 * @example
 * ```ts
 * import { shippedThemes, themeFailures } from "@gpuixui/tokens";
 *
 * const failures = shippedThemes.flatMap(({ theme }) => themeFailures(theme));
 * failures; // []
 * ```
 */
export const shippedThemes: ReadonlyArray<ShippedTheme> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast): ShippedTheme => ({
        source: "identity",
        theme: getTheme(mode, contrast),
      }),
    ),
  ),
  ...platformVariants.flatMap((platform) =>
    themeModes.flatMap((mode) =>
      themeContrasts.map(
        (contrast): ShippedTheme => ({
          source: "platform",
          platform,
          theme: getPlatformTheme(platform, mode, contrast),
        }),
      ),
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.flatMap((mode) =>
      themeContrasts.map(
        (contrast): ShippedTheme => ({
          source: "recipe",
          recipe,
          theme: getPlatformRecipeTheme(recipe, mode, contrast),
        }),
      ),
    ),
  ),
];
