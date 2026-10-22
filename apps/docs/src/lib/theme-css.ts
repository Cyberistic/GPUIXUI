import { seriesColors, type Theme } from "@gpuixui/tokens";
import type { CSSProperties } from "react";
import { cssFontStack } from "./fonts";

/**
 * The browser bridge from a library theme to CSS variables.
 *
 * `@gpuixui/tokens` ships data, not CSS. Every browser rendering of the library
 * — a component preview, a block, the theme editor — reads the variables this
 * maps, so a preview cannot drift from the theme it claims to show. The names
 * are shadcn's (`primaryForeground` → `--primary-foreground`), which is what the
 * preview rules are written against.
 */

/** CSS custom properties, as React accepts them in a `style` prop. */
export type CssVars = CSSProperties & Record<`--${string}`, string>;

/** `primaryForeground` → `primary-foreground`: the variable a role maps to. */
const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * The variables a preview reads from a theme: every colour role as
 * `--<kebab role>`, `--radius` from `radius.md`, the two families, the control
 * metrics and row height of the theme's density so a platform's controls and
 * rows change size in a browser preview the way they do in the runtime, the
 * default spacing step a list row adds to its height, and the five categorical
 * series colours as `--series-1` through `--series-5` so a chart or a legend
 * paints the theme's scale instead of a palette of its own.
 *
 * @example
 * ```tsx
 * const theme = platformTheme(themes.dark, "win32");
 * <div style={toCssVars(theme)}>{children}</div>;
 * ```
 */
export const toCssVars = (theme: Theme): CssVars => ({
  "--radius": `${theme.radius.md}px`,
  "--font-sans": cssFontStack(theme.typography.sans),
  "--font-mono": theme.typography.mono,
  "--control-height-sm": `${theme.density.controlHeight.sm}px`,
  "--control-height-md": `${theme.density.controlHeight.md}px`,
  "--control-height-lg": `${theme.density.controlHeight.lg}px`,
  "--control-padding-x-sm": `${theme.density.controlPaddingX.sm}px`,
  "--control-padding-x-md": `${theme.density.controlPaddingX.md}px`,
  "--control-padding-x-lg": `${theme.density.controlPaddingX.lg}px`,
  "--row-height": `${theme.density.rowHeight}px`,
  "--spacing-md": `${theme.spacing.md}px`,
  ...Object.fromEntries(
    seriesColors(theme).map((value, index) => [`--series-${index + 1}`, value]),
  ),
  ...Object.fromEntries(
    Object.entries(theme.colors).map(([role, value]) => [
      `--${toKebab(role)}`,
      value,
    ]),
  ),
});
