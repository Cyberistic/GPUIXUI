import {
  extendTheme,
  getTheme,
  platformTheme,
  type PlatformStyleOptions,
  type Theme,
  type ThemeMode,
} from "./theme.js";
import type { PlatformName } from "./platforms.js";
import { seriesColors } from "./series.js";
import {
  parseShadcnStyles,
  roleVariables,
  shadcnOverrides,
  type ShadcnVars,
} from "./shadcn-vars.js";

export const shadcnNeutral: Readonly<Record<ThemeMode, ShadcnVars>> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
  },
};

export const shadcnTheme = (
  css: string,
  mode: ThemeMode,
  base: Theme = getTheme(mode),
): Theme => {
  const styles = parseShadcnStyles(css);
  const vars = mode === "dark" ? styles.dark : styles.light;
  return Object.keys(vars).length === 0
    ? base
    : extendTheme(base, shadcnOverrides(vars));
};

const cssOf = (theme: Theme): ReadonlyArray<string> => {
  const colours = theme.colors;
  const lines = Object.entries(roleVariables()).map(
    ([variable, role]) => `  --${variable}: ${colours[role]};`,
  );
  const charts = seriesColors(theme).map(
    (colour, index) => `  --chart-${index + 1}: ${colour};`,
  );
  return [...lines, ...charts, `  --radius: ${theme.radius.md}px;`];
};

export const shadcnNeutralTheme = (mode: ThemeMode): Theme =>
  extendTheme(getTheme(mode), shadcnOverrides(shadcnNeutral[mode]));

export const shadcnCss = (theme: Theme): string =>
  [`:root {`, ...cssOf(theme), `}`].join("\n");

export const shadcnPlatformTheme = (
  css: string,
  platform: PlatformName,
  mode: ThemeMode,
  options: PlatformStyleOptions = { keepPalette: true },
): Theme => platformTheme(shadcnTheme(css, mode), platform, options);

export const shadcnStylesheet = (light: Theme, dark: Theme): string =>
  [
    shadcnCss(light),
    "",
    ".dark {",
    ...cssOf(dark).map((line) => line.replace(/^ {2}/, "  ")),
    "}",
    "",
  ].join("\n");
