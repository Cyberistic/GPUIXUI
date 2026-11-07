import {
  extendTheme,
  themeOverrides,
  themes,
  type Theme,
  type ThemeOverrides,
} from "./index.js";
import { brandLightTheme } from "./brand-theme.example.js";

export const savedBrandEdit: ThemeOverrides = themeOverrides(
  brandLightTheme,
  themes.light,
);

export const reopenedBrand: Theme = extendTheme(themes.light, savedBrandEdit);

export const reopenedOnNewerBase = (base: Theme): Theme =>
  extendTheme(base, savedBrandEdit);
