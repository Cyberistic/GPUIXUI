import {
  extendTheme,
  themeOverrides,
  themes,
  type Theme,
  type ThemeOverrides,
} from "./index.js";
import { brandLightTheme } from "./brand-theme.example.js";

/**
 * What a settings panel or a brand editor stores after a reader edits a theme:
 * the **smallest** override that reproduces the theme over the shipped base,
 * not a snapshot of every resolved value.
 *
 * A snapshot works — `restoreTheme` rebuilds it — but it pins every role, step
 * and metric the theme carried, so a palette or type fix in a later release
 * never reaches the brand. The diff inherits everything the reader did not name.
 *
 * This file is type-checked and executed by `theme-overrides.test.ts`, so the
 * documented export route is exercised rather than illustrative.
 */
export const savedBrandEdit: ThemeOverrides = themeOverrides(
  brandLightTheme,
  themes.light,
);

/** The theme the next launch paints from the saved edit. */
export const reopenedBrand: Theme = extendTheme(themes.light, savedBrandEdit);

/**
 * The same edit over a newer release's base: the values the reader never touched
 * follow the shipped theme, which is the reason to store the diff.
 */
export const reopenedOnNewerBase = (base: Theme): Theme =>
  extendTheme(base, savedBrandEdit);
