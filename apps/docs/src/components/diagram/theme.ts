/**
 * The palettes diagram exposes, translated to the custom properties Pele
 * paints through.
 *
 * Mermaid.js themes are a renderer config; Pele's theme is CSS. The names and
 * the eight Mermaid variables stay the same as diagram's, so a caller can
 * move a diagram between the two without changing its theme name, but the
 * result is a set of `--pele-*` values on the wrapper. `default` reads the page
 * roles from the stylesheet, which is what lets a light/dark switch re-theme a
 * diagram that was rendered once.
 */

/** The eight Mermaid theme variables a preset carries. */
export interface DiagramThemeVariables {
  readonly primaryColor: string;
  readonly primaryTextColor: string;
  readonly primaryBorderColor: string;
  readonly background: string;
  readonly textColor: string;
  readonly lineColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string;
}

/** The themes Mermaid.js ships. */
export const builtinThemes = [
  "default",
  "dark",
  "forest",
  "neutral",
  "base",
] as const;

export type MermaidBuiltinTheme = (typeof builtinThemes)[number];

/** The named palettes diagram adds on top of Mermaid's five. */
export const mermaidThemes = {
  emerald: {
    primaryColor: "#22c55e",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#16a34a",
    background: "#f0fdf4",
    textColor: "#166534",
    lineColor: "#166534",
    secondaryColor: "#dcfce7",
    tertiaryColor: "#f0fdf4",
  },
  coral: {
    primaryColor: "#f97316",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#ea580c",
    background: "#fff7ed",
    textColor: "#9a3412",
    lineColor: "#c2410c",
    secondaryColor: "#fed7aa",
    tertiaryColor: "#fff7ed",
  },
  amber: {
    primaryColor: "#eab308",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#ca8a04",
    background: "#fefce8",
    textColor: "#854d0e",
    lineColor: "#a16207",
    secondaryColor: "#fef08a",
    tertiaryColor: "#fefce8",
  },
  crimson: {
    primaryColor: "#ef4444",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#dc2626",
    background: "#fef2f2",
    textColor: "#991b1b",
    lineColor: "#b91c1c",
    secondaryColor: "#fecaca",
    tertiaryColor: "#fef2f2",
  },
  bronze: {
    primaryColor: "#d97706",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#b45309",
    background: "#fef3c7",
    textColor: "#78350f",
    lineColor: "#92400e",
    secondaryColor: "#fcd34d",
    tertiaryColor: "#fef3c7",
  },
  ocean: {
    primaryColor: "#0ea5e9",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#0284c7",
    background: "#eff6ff",
    textColor: "#1e40af",
    lineColor: "#0369a1",
    secondaryColor: "#bae6fd",
    tertiaryColor: "#eff6ff",
  },
  sky: {
    primaryColor: "#38bdf8",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#0ea5e9",
    background: "#f0f9ff",
    textColor: "#0369a1",
    lineColor: "#0284c7",
    secondaryColor: "#bae6fd",
    tertiaryColor: "#f0f9ff",
  },
  indigo: {
    primaryColor: "#6366f1",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#4f46e5",
    background: "#eef2ff",
    textColor: "#3730a3",
    lineColor: "#4338ca",
    secondaryColor: "#c7d2fe",
    tertiaryColor: "#eef2ff",
  },
  teal: {
    primaryColor: "#14b8a6",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#0d9488",
    background: "#f0fdfa",
    textColor: "#0f766e",
    lineColor: "#115e59",
    secondaryColor: "#ccfbf1",
    tertiaryColor: "#f0fdfa",
  },
  lime: {
    primaryColor: "#84cc16",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#65a30d",
    background: "#f4f4af",
    textColor: "#415f0b",
    lineColor: "#4d7c0f",
    secondaryColor: "#d4ed87",
    tertiaryColor: "#f4f4af",
  },
  mint: {
    primaryColor: "#6ee7b7",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#10b981",
    background: "#f0fdf4",
    textColor: "#047857",
    lineColor: "#059669",
    secondaryColor: "#a7f3d0",
    tertiaryColor: "#ecfdf5",
  },
  violet: {
    primaryColor: "#a855f7",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#9333ea",
    background: "#faf5ff",
    textColor: "#581c87",
    lineColor: "#7c3aed",
    secondaryColor: "#e9d5ff",
    tertiaryColor: "#faf5ff",
  },
  rose: {
    primaryColor: "#ec4899",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#db2777",
    background: "#fdf2f8",
    textColor: "#be185d",
    lineColor: "#c026d3",
    secondaryColor: "#fbcfe8",
    tertiaryColor: "#fdf2f8",
  },
  slate: {
    primaryColor: "#64748b",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#475569",
    background: "#0f172a",
    textColor: "#f1f5f9",
    lineColor: "#334155",
    secondaryColor: "#1e293b",
    tertiaryColor: "#1e293b",
  },
  charcoal: {
    primaryColor: "#475569",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#334155",
    background: "#111827",
    textColor: "#f9fafb",
    lineColor: "#6b7280",
    secondaryColor: "#1f2937",
    tertiaryColor: "#374151",
  },
} as const satisfies Record<string, DiagramThemeVariables>;

export type MermaidCustomTheme = keyof typeof mermaidThemes;

export type DiagramTheme = MermaidBuiltinTheme | MermaidCustomTheme;

/** Whether a stored or selected value names a theme this module carries. */
export const isDiagramTheme = (value: string): value is DiagramTheme =>
  (builtinThemes as ReadonlyArray<string>).includes(value) ||
  Object.hasOwn(mermaidThemes, value);

/** The Mermaid presets, by mode. */
const BUILTIN_VARIABLES: Record<
  Exclude<MermaidBuiltinTheme, "default">,
  DiagramThemeVariables
> = {
  dark: {
    primaryColor: "#1e293b",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#475569",
    background: "#0f172a",
    textColor: "#f8fafc",
    lineColor: "#64748b",
    secondaryColor: "#334155",
    tertiaryColor: "#1e293b",
  },
  forest: {
    primaryColor: "#dcfce7",
    primaryTextColor: "#14532d",
    primaryBorderColor: "#16a34a",
    background: "#f0fdf4",
    textColor: "#14532d",
    lineColor: "#15803d",
    secondaryColor: "#bbf7d0",
    tertiaryColor: "#f0fdf4",
  },
  neutral: {
    primaryColor: "#f5f5f5",
    primaryTextColor: "#171717",
    primaryBorderColor: "#a3a3a3",
    background: "#ffffff",
    textColor: "#171717",
    lineColor: "#737373",
    secondaryColor: "#e5e5e5",
    tertiaryColor: "#fafafa",
  },
  base: {
    primaryColor: "#eef2ff",
    primaryTextColor: "#312e81",
    primaryBorderColor: "#6366f1",
    background: "#ffffff",
    textColor: "#312e81",
    lineColor: "#6366f1",
    secondaryColor: "#e0e7ff",
    tertiaryColor: "#eef2ff",
  },
};

const isBuiltinTheme = (
  theme: DiagramTheme,
): theme is Exclude<MermaidBuiltinTheme, "default"> =>
  Object.hasOwn(BUILTIN_VARIABLES, theme);

const isCustomTheme = (theme: string): theme is MermaidCustomTheme =>
  Object.hasOwn(mermaidThemes, theme);

/** The palette a theme name resolves to. `default` reads the page's roles. */
export const themeVariables = (
  theme: DiagramTheme | undefined,
): DiagramThemeVariables | undefined => {
  if (theme === undefined || theme === "default") return undefined;
  return isBuiltinTheme(theme)
    ? BUILTIN_VARIABLES[theme]
    : isCustomTheme(theme)
      ? mermaidThemes[theme]
      : undefined;
};

/** The colour a theme picker shows beside the theme's name. */
export const themeSwatch = (theme: DiagramTheme): string =>
  themeVariables(theme)?.primaryBorderColor ?? "var(--ring)";

/** Mermaid's variable names, mapped to the roles Pele paints. */
export const peleRoleOf: Record<keyof DiagramThemeVariables, string> = {
  primaryColor: "--pele-surface",
  primaryTextColor: "--pele-fg",
  primaryBorderColor: "--pele-border",
  background: "--pele-bg",
  textColor: "--pele-fg",
  lineColor: "--pele-line",
  secondaryColor: "--pele-surface-alt",
  tertiaryColor: "--pele-surface",
};

/**
 * A theme's Mermaid variables as Pele custom properties.
 *
 * The Mermaid names are accepted so a config copied from diagram keeps
 * working; a variable outside the eight (a Mermaid-only key) is ignored rather
 * than painted as a property Pele does not read.
 */
const isVariableName = (name: string): name is keyof DiagramThemeVariables =>
  Object.hasOwn(peleRoleOf, name);

/**
 * The order the variables are applied in: a broader colour first, the more
 * specific one last. Pele has one text role and one node-fill role, so
 * `primaryTextColor` must win over `textColor` and `primaryColor` over the
 * tertiary fallback; a reduce in object order would let the wrong one win.
 */
const variableOrder: ReadonlyArray<keyof DiagramThemeVariables> = [
  "background",
  "tertiaryColor",
  "secondaryColor",
  "primaryColor",
  "lineColor",
  "textColor",
  "primaryTextColor",
  "primaryBorderColor",
];

export const peleVariables = (
  variables:
    | Partial<DiagramThemeVariables>
    | Readonly<Record<string, string | undefined>>
    | undefined,
): Readonly<Record<string, string>> => {
  if (variables === undefined) return {};
  const entries = Object.entries(variables);
  return variableOrder.reduce<Record<string, string>>((style, name) => {
    const value = entries.find(([key]) => key === name)?.[1];
    return value === undefined || !isVariableName(name)
      ? style
      : { ...style, [peleRoleOf[name]]: value };
  }, {});
};
