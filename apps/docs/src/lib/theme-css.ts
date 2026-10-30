import {
  controlSizes,
  dividerOn,
  elevationLevels,
  elevationShadow,
  filledHover,
  filledPressed,
  seriesColors,
  switchMetricsAt,
  syntaxColors,
  targetSize,
  type BoxShadow,
  type Theme,
} from "@gpuixui/tokens";
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

/** A theme shadow as the CSS `box-shadow` value it stands for. */
const cssShadow = (shadow: BoxShadow): string =>
  `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.spreadRadius}px ${shadow.color}`;

/**
 * The paint a platform's own switch hands a preview, and the knob's lift. A
 * theme that declares no switch writes nothing, and every preview rule falls
 * back to the accent recipe.
 */
const switchVars = (theme: Theme): CssVars => {
  if (theme.switch === undefined) return {};
  const shadow = elevationShadow(theme, "sm");
  const metrics = theme.switchMetrics;
  return {
    "--switch-on": theme.switch.on,
    "--switch-off": theme.switch.off,
    "--switch-knob": theme.switch.knob,
    ...(theme.switch.edge === undefined
      ? {}
      : {
          "--switch-edge": theme.switch.edge,
          ...(metrics?.border === 0
            ? { "--switch-edge-shadow": `0 0 0 1px ${theme.switch.edge}` }
            : {}),
        }),
    ...(metrics === undefined
      ? {}
      : controlSizes.reduce<CssVars>((vars, size) => {
          const at = switchMetricsAt(metrics, size);
          const suffix = size === "md" ? "" : `-${size}`;
          return {
            ...vars,
            [`--switch-track-width${suffix}`]: `${at.width}px`,
            [`--switch-track-height${suffix}`]: `${at.height}px`,
            [`--switch-knob-size${suffix}`]: `${at.knob}px`,
            [`--switch-inset${suffix}`]: `${at.inset}px`,
            [`--switch-border-width${suffix}`]: `${at.border}px`,
          };
        }, {})),
    ...(shadow === undefined
      ? {}
      : { "--switch-knob-shadow": cssShadow(shadow) }),
  };
};

/**
 * The variables a preview reads from a theme: every colour role as
 * `--<kebab role>`, `--radius` from `radius.md`, the two families, the control
 * metrics and row height of the theme's density so a platform's controls and
 * rows change size in a browser preview the way they do in the runtime, the
 * spacing steps a list row and a timeline's event add between their parts, the
 * icon steps a drawn control takes its side from, the pressable-target floor a
 * control reserves around that drawing, the five categorical series colours
 * as `--series-1` through `--series-5` so a chart or a legend paints the
 * theme's scale instead of a palette of its own, the rule a row crosses
 * each fill it can wear (`--divider-card`, `--divider-muted`,
 * `--divider-selected`, `--divider-hover`, `--divider-accent`), because a row
 * or a header band paints its rule
 * *inside* its own box and the raw `border` role is under the perceptibility
 * floor on a wash, and the syntax palette as `--syntax-<kebab role>`, so a code
 * block draws the palette its native `<code>` host paints rather than a
 * third-party theme.
 *
 * @example
 * ```tsx
 * const theme = platformTheme(themes.dark, "win32");
 * <div style={toCssVars(theme)}>{children}</div>;
 * ```
 */
export const toCssVars = (theme: Theme): CssVars => ({
  "--radius-sm": `${theme.radius.sm}px`,
  "--radius": `${theme.radius.md}px`,
  "--radius-lg": `${theme.radius.lg}px`,
  "--radius-xl": `${theme.radius.xl}px`,
  "--font-sans": cssFontStack(theme.typography.sans),
  "--font-mono": theme.typography.mono,
  "--control-height-sm": `${theme.density.controlHeight.sm}px`,
  "--control-height-md": `${theme.density.controlHeight.md}px`,
  "--control-height-lg": `${theme.density.controlHeight.lg}px`,
  "--control-padding-x-sm": `${theme.density.controlPaddingX.sm}px`,
  "--control-padding-x-md": `${theme.density.controlPaddingX.md}px`,
  "--control-padding-x-lg": `${theme.density.controlPaddingX.lg}px`,
  "--row-height": `${theme.density.rowHeight}px`,
  "--spacing-xs": `${theme.spacing.xs}px`,
  "--spacing-sm": `${theme.spacing.sm}px`,
  "--spacing-md": `${theme.spacing.md}px`,
  "--spacing-lg": `${theme.spacing.lg}px`,
  "--icon-size-sm": `${theme.iconSize.sm}px`,
  "--icon-size-md": `${theme.iconSize.md}px`,
  "--icon-size-lg": `${theme.iconSize.lg}px`,
  "--target-size": `${targetSize.minimum}px`,
  ...switchVars(theme),
  // A filled box's hover and press are the theme's derived opaque fills, not an
  // alpha lift, so a preview shadowing a checked control must take them here.
  "--primary-hover": filledHover(theme, "primary"),
  "--primary-pressed": filledPressed(theme, "primary"),
  "--secondary-hover": filledHover(theme, "secondary"),
  "--secondary-pressed": filledPressed(theme, "secondary"),
  "--destructive-hover": filledHover(theme, "destructive"),
  "--destructive-pressed": filledPressed(theme, "destructive"),
  // A row paints its rule inside its own box, so the line crosses the fill the
  // row wears. The token package derives the colour per surface; a preview
  // drawing the raw `border` role on a wash would show a line the row does not
  // paint (`packages/data/src/table/table.tsx` → `rule`).
  "--divider-card": dividerOn(theme, theme.colors.card) ?? theme.colors.border,
  // The header band a table paints its labels on (`bg-muted`): its rule lands
  // on the band, not on the card behind it.
  "--divider-muted":
    dividerOn(theme, theme.colors.muted) ?? theme.colors.border,
  "--divider-selected":
    dividerOn(theme, theme.colors.selected) ?? theme.colors.border,
  "--divider-hover":
    dividerOn(theme, theme.colors.hover) ?? theme.colors.border,
  "--divider-accent":
    dividerOn(theme, theme.colors.accent) ?? theme.colors.border,
  ...Object.fromEntries(
    seriesColors(theme).map((value, index) => [`--series-${index + 1}`, value]),
  ),
  // The lift each level paints, so a drawing of a raised surface carries the
  // theme's own shadow geometry instead of a literal that agrees with one mode.
  ...Object.fromEntries(
    elevationLevels.flatMap((level) => {
      const shadow = elevationShadow(theme, level);
      return shadow === undefined
        ? []
        : [[`--elevation-${level}`, cssShadow(shadow)]];
    }),
  ),
  ...Object.fromEntries(
    Object.entries(syntaxColors(theme)).map(([role, value]) => [
      `--syntax-${toKebab(role)}`,
      value,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(theme.colors).map(([role, value]) => [
      `--${toKebab(role)}`,
      value,
    ]),
  ),
});

/**
 * The same variables as a stylesheet a reader can copy.
 *
 * A preview paints through a `style` prop, but a reader taking a theme into an
 * application needs the declarations themselves. The block is generated from
 * {@link toCssVars}, so it can never name a variable the preview does not read
 * or miss one it does.
 *
 * @example
 * ```ts
 * toCssText(retroTheme(themes.dark, "aero"), ".aero");
 * ```
 */
export const toCssText = (theme: Theme, selector = ":root"): string =>
  `${selector} {\n${Object.entries(toCssVars(theme))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n}\n`;
