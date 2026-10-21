import type { Theme } from "@gpuixui/tokens";
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
 * `--<kebab role>`, `--radius` from `radius.md`, and the two families.
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
  ...Object.fromEntries(
    Object.entries(theme.colors).map(([role, value]) => [
      `--${toKebab(role)}`,
      value,
    ]),
  ),
});
