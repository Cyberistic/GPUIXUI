import {
  extendTheme,
  themes,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The theme editor's pure core: the editable role subset, the token→CSS-variable
 * bridge for the browser preview, and the `createTheme` serialiser for "Copy
 * theme". No React, no DOM — unit-testable and reusable.
 *
 * The bridge exists because `@gpuixui/tokens` ships TypeScript data objects,
 * not CSS variables. The docs preview is CSS, so the bridge maps the library's
 * `ThemeColors` to the shadcn variable names the preview reads.
 */

/** The shadcn-core roles the editor exposes. Each is a real `keyof ThemeColors`. */
export const editableRoles = [
  "background",
  "foreground",
  "card",
  "popover",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "border",
  "input",
  "ring",
] as const;

export type EditableRole = (typeof editableRoles)[number];

/** The subset of a theme the editor edits. */
export interface TokenEdits {
  readonly colors: Record<EditableRole, string>;
  readonly radiusMd: number;
  readonly fontSans: string;
}

/** The editable state for both modes; each mode is independent. */
export type EditorState = Record<ThemeMode, TokenEdits>;

/** Extract the editable subset from a built-in theme. */
export const editsFromTheme = (theme: Theme): TokenEdits => ({
  colors: Object.fromEntries(
    editableRoles.map((role) => [role, theme.colors[role]]),
  ) as Record<EditableRole, string>,
  radiusMd: theme.radius.md,
  fontSans: theme.typography.sans,
});

/** The editor's starting point: the built-in light and dark themes. */
export const defaultState = (): EditorState => ({
  light: editsFromTheme(themes.light),
  dark: editsFromTheme(themes.dark),
});

/**
 * Resolve the edits into a complete `Theme` the preview can render. Uses the
 * library's own `extendTheme`, so the preview and the copied `createTheme` file
 * are the same theme by construction.
 */
export const resolveTheme = (mode: ThemeMode, edits: TokenEdits): Theme =>
  extendTheme(themes[mode], {
    colors: edits.colors,
    radius: { md: edits.radiusMd },
    typography: { sans: edits.fontSans },
  });

/**
 * GPUI resolves `.SystemUIFont` to the operating system's own UI font; the
 * browser cannot. Map the sentinel to a CSS system stack for the preview.
 */
export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const cssFontStack = (sans: string): string =>
  sans === ".SystemUIFont" ? SYSTEM_FONT_STACK : sans;

/** `primaryForeground` → `primary-foreground`: the shadcn variable name. */
const toKebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * The bridge: a complete `Theme` to the CSS variables the preview reads. Every
 * colour role maps to `--<kebab-role>` (shadcn's names, e.g. `primaryForeground`
 * → `--primary-foreground`); `radius.md` maps to the single `--radius`; the UI
 * family maps to `--font-sans`.
 */
export const toCssVars = (theme: Theme): Record<string, string> => {
  const vars: Record<string, string> = {
    "--radius": `${theme.radius.md}px`,
    "--font-sans": cssFontStack(theme.typography.sans),
  };
  for (const [role, value] of Object.entries(theme.colors)) {
    vars[`--${toKebab(role)}`] = `${value}`;
  }
  return vars;
};

/** The `createTheme` config the copy output emits, as data (not a string). */
export const themeConfig = (
  mode: ThemeMode,
  edits: TokenEdits,
): {
  mode: ThemeMode;
  name: string;
  colors: Record<EditableRole, string>;
  radius: { md: number };
  typography: { sans: string };
} => ({
  mode,
  name: "My theme",
  colors: edits.colors,
  radius: { md: edits.radiusMd },
  typography: { sans: edits.fontSans },
});

const HEX_COLOR = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

const isTokenEdits = (value: unknown): value is TokenEdits => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.radiusMd !== "number" ||
    !Number.isFinite(record.radiusMd)
  ) {
    return false;
  }
  if (typeof record.fontSans !== "string" || record.fontSans.length === 0) {
    return false;
  }
  if (typeof record.colors !== "object" || record.colors === null) return false;
  const colors = record.colors as Record<string, unknown>;
  return editableRoles.every(
    (role) =>
      typeof colors[role] === "string" &&
      HEX_COLOR.test(colors[role] as string),
  );
};

/**
 * Decode a persisted editor state (from the URL or localStorage) at the
 * boundary. Returns `undefined` for anything that is not a complete, valid
 * `EditorState`, so a malformed value falls back to the defaults instead of
 * poisoning the preview.
 */
export const parseState = (value: unknown): EditorState | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (!isTokenEdits(record.light) || !isTokenEdits(record.dark))
    return undefined;
  return { light: record.light, dark: record.dark };
};

const colorLines = (colors: Record<EditableRole, string>): string =>
  editableRoles
    .map((role) => `      ${role}: ${JSON.stringify(colors[role])},`)
    .join("\n");

const modeBlock = (mode: ThemeMode, edits: TokenEdits): string =>
  `  ${mode}: createTheme({\n    mode: ${JSON.stringify(mode)},\n    name: "My theme",\n    colors: {\n${colorLines(edits.colors)}\n    },\n    radius: { md: ${edits.radiusMd} },\n    typography: { sans: ${JSON.stringify(edits.fontSans)} },\n  }),`;

/**
 * The copy output: a valid `createTheme` module in the library's own format,
 * one theme per mode, with a one-line usage note.
 */
export const themeSource = (state: EditorState): string =>
  `import { createTheme } from "@gpuixui/tokens";

// Usage: <ThemeProvider theme={theme[activeMode]} /> from "@gpuixui/tokens/react".
export const theme = {
${modeBlock("light", state.light)}
${modeBlock("dark", state.dark)}
};
`;
