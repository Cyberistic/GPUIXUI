import {
  brandText,
  controlSizes,
  dividerOn,
  elevationLevels,
  elevationShadow,
  filledHover,
  filledPressed,
  materialFill,
  materialNames,
  seriesColors,
  switchMetricsAt,
  syntaxColors,
  targetSize,
  type BoxShadow,
  type Theme,
} from "@gpuixui/tokens";
import type { CSSProperties } from "react";
import { cssFontStack } from "./fonts";

export type CssVars = CSSProperties & Record<`--${string}`, string>;

const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const cssShadow = (shadow: BoxShadow): string =>
  `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.spreadRadius}px ${shadow.color}`;

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

  "--brand-text": brandText(theme),
  "--primary-hover": filledHover(theme, "primary"),
  "--primary-pressed": filledPressed(theme, "primary"),
  "--secondary-hover": filledHover(theme, "secondary"),
  "--secondary-pressed": filledPressed(theme, "secondary"),
  "--destructive-hover": filledHover(theme, "destructive"),
  "--destructive-pressed": filledPressed(theme, "destructive"),

  "--divider-card": dividerOn(theme, theme.colors.card) ?? theme.colors.border,

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

  ...Object.fromEntries(
    elevationLevels.flatMap((level) => {
      const shadow = elevationShadow(theme, level);
      return shadow === undefined
        ? []
        : [[`--elevation-${level}`, cssShadow(shadow)]];
    }),
  ),

  ...Object.fromEntries(
    materialNames.map((name) => [
      `--material-${name}`,
      materialFill(theme, name),
    ]),
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

export const toCssText = (theme: Theme, selector = ":root"): string =>
  `${selector} {\n${Object.entries(toCssVars(theme))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n}\n`;
