import {
  extendTheme,
  themes,
  type DensityName,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The theme editor's pure core (plan 595).
 *
 * The editor changes a deliberately small set of semantic roles and a density
 * preset, resolves them through the library's own `extendTheme`, and emits the
 * module a reader copies. The preview and the copied module therefore call the
 * same function with the same values — there is no docs-only merge here.
 *
 * The role subset is the one a brand usually changes; every other role stays a
 * single `extendTheme` key away and is documented on Theming.
 */
export const editableRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "destructive",
  "border",
  "input",
  "ring",
] as const satisfies readonly (keyof ThemeColors)[];

export type EditableRole = (typeof editableRoles)[number];

/** The subset of a theme the editor owns. */
export interface ThemeEdits {
  /** The built-in theme an edit starts from. */
  readonly base: ThemeMode;
  /** The density preset the edit applies. */
  readonly density: DensityName;
  /** One value for every editable role. */
  readonly colors: Readonly<Record<EditableRole, string>>;
}

const densityNames = [
  "compact",
  "comfortable",
  "spacious",
] as const satisfies readonly DensityName[];

const isDensityName = (value: string): value is DensityName =>
  densityNames.some((name) => name === value);

const isEditableRole = (value: string): value is EditableRole =>
  editableRoles.some((role) => role === value);

/** A 6-digit hex value without the leading `#`, as the URL carries it. */
const HEX_VALUE = /^[0-9a-fA-F]{6}$/;

/** The editable subset of a built-in theme, read field by field. */
const colorsFromTheme = (theme: Theme): Record<EditableRole, string> => ({
  background: theme.colors.background,
  foreground: theme.colors.foreground,
  card: theme.colors.card,
  cardForeground: theme.colors.cardForeground,
  popover: theme.colors.popover,
  primary: theme.colors.primary,
  primaryForeground: theme.colors.primaryForeground,
  secondary: theme.colors.secondary,
  secondaryForeground: theme.colors.secondaryForeground,
  muted: theme.colors.muted,
  mutedForeground: theme.colors.mutedForeground,
  accent: theme.colors.accent,
  destructive: theme.colors.destructive,
  border: theme.colors.border,
  input: theme.colors.input,
  ring: theme.colors.ring,
});

/** The editor's starting point: one built-in theme's editable values. */
export const defaultEdits = (base: ThemeMode): ThemeEdits => ({
  base,
  density: themes[base].density.name,
  colors: colorsFromTheme(themes[base]),
});

/** The theme the preview renders and the copied module builds. */
export const themeFor = (edits: ThemeEdits): Theme =>
  extendTheme(themes[edits.base], {
    name: "My theme",
    colors: edits.colors,
    density: edits.density,
  });

/** `primaryForeground` → `Primary foreground`. */
export const roleLabel = (role: EditableRole): string => {
  const words = role.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The shareable state: `<base>.<density>` plus one `role:rrggbb` entry per
 * changed role, in role order. Unchanged roles are omitted, so a URL carries
 * the edit rather than a copy of the theme.
 */
export const toQuery = (edits: ThemeEdits): string => {
  const base = themes[edits.base];
  const changes = editableRoles.flatMap((role) => {
    const value = edits.colors[role].toLowerCase();
    return value === base.colors[role].toLowerCase()
      ? []
      : [`${role}:${value.replace("#", "")}`];
  });
  const prefix = `${edits.base}.${edits.density}`;
  return changes.length === 0 ? prefix : `${prefix}.${changes.join(",")}`;
};

/**
 * Apply the `role:rrggbb` entries to a base palette. Any malformed entry
 * rejects the whole list, so a partially applied URL is never previewed.
 */
const parseEntries = (
  base: Record<EditableRole, string>,
  entries: string,
): Record<EditableRole, string> | undefined =>
  entries
    .split(",")
    .reduce<Record<EditableRole, string> | undefined>((colors, entry) => {
      if (colors === undefined) return undefined;
      const [role, hex, ...rest] = entry.split(":");
      if (rest.length > 0 || role === undefined || hex === undefined) {
        return undefined;
      }
      if (!isEditableRole(role) || !HEX_VALUE.test(hex)) return undefined;
      return { ...colors, [role]: `#${hex.toLowerCase()}` };
    }, base);

/**
 * Decode `?theme=` at the boundary. A malformed base, density, role or hex
 * rejects the whole value, so a hand-edited URL cannot poison the preview; the
 * caller falls back to the default edit.
 */
export const fromQuery = (
  value: string | null | undefined,
): ThemeEdits | undefined => {
  if (value === null || value === undefined || value.length === 0) {
    return undefined;
  }
  const parts = value.split(".");
  if (parts.length < 2 || parts.length > 3) return undefined;
  const [base, density, entries] = parts;
  if (base !== "light" && base !== "dark") return undefined;
  if (density === undefined || !isDensityName(density)) return undefined;

  const colors =
    entries === undefined || entries.length === 0
      ? colorsFromTheme(themes[base])
      : parseEntries(colorsFromTheme(themes[base]), entries);
  return colors === undefined ? undefined : { base, density, colors };
};

/** Whether the edit is the untouched default, so its parameter can be dropped. */
export const isDefault = (edits: ThemeEdits): boolean => {
  const defaults = defaultEdits("light");
  return (
    edits.base === "light" &&
    edits.density === defaults.density &&
    editableRoles.every(
      (role) =>
        edits.colors[role].toLowerCase() ===
        defaults.colors[role].toLowerCase(),
    )
  );
};

const importName = (base: ThemeMode): "lightTheme" | "darkTheme" =>
  base === "light" ? "lightTheme" : "darkTheme";

/**
 * A real `@gpuixui/tokens` module for the edited theme. Only changed values are
 * emitted, so the source reads as the diff the reader actually made.
 */
export const themeSource = (edits: ThemeEdits): string => {
  const base = themes[edits.base];
  const name = importName(edits.base);
  const changed = editableRoles.filter(
    (role) =>
      edits.colors[role].toLowerCase() !== base.colors[role].toLowerCase(),
  );
  const colors =
    changed.length === 0
      ? ""
      : `  colors: {\n${changed
          .map(
            (role) =>
              `    ${role}: ${JSON.stringify(edits.colors[role].toLowerCase())},`,
          )
          .join("\n")}\n  },\n`;
  const density =
    edits.density === base.density.name
      ? ""
      : `  density: ${JSON.stringify(edits.density)},\n`;
  return `import { extendTheme, ${name} } from "@gpuixui/tokens";

export const brandTheme = extendTheme(${name}, {
  name: "My theme",
${colors}${density}});
`;
};
