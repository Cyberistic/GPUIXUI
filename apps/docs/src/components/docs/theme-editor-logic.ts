import {
  auditTheme,
  extendTheme,
  themes,
  type ContrastFailure,
  type DecorativeFailure,
  type InvalidColorRole,
  type SelectionFailure,
  type SeriesDistinctnessFailure,
  type SeriesSurfaceFailure,
  type Theme,
  type ThemeAudit,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The theme editor's pure core: the editable role subset, the `createTheme`
 * serialiser for "Copy theme", and the audit the readout prints. No React, no
 * DOM — unit-testable and reusable.
 *
 * The theme→CSS-variable bridge every browser preview reads is
 * `src/lib/theme-css.ts`: the editor and the platform switch share it.
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

/** The `createTheme` config the copy output emits, as data (not a string). */ export const themeConfig =
  (
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

/**
 * The whole theme contract for an edit, as the library's own gate reports it: a
 * role the renderer cannot paint, a text pair below its floor, a decorative
 * surface too close to what it sits on, a data-series colour too close to its
 * plot or to its neighbour, and a selection wash that hides itself or the text
 * it covers. `auditTheme` reads all five in one call, so the editor cannot show
 * some reports and leave the others silent.
 */
export const auditReport = (mode: ThemeMode, edits: TokenEdits): ThemeAudit =>
  auditTheme(resolveTheme(mode, edits));

/** Which of the audit's five reports a finding came from. */
export type AuditKind =
  | "role"
  | "contrast"
  | "decorative"
  | "series"
  | "selection";

/** One audit finding, already worded for the readout. */
export interface AuditFinding {
  readonly kind: AuditKind;
  readonly text: string;
}

const measured = (ratio: number | undefined, floor: number): string =>
  `${ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1`} (needs ${floor}:1)`;

/** One failure as an editable line, e.g. `mutedForeground on muted — 3.9:1 (needs 4.5:1)`. */
export const formatContrastFailure = ({
  foreground,
  background,
  ratio,
  floor,
}: ContrastFailure): string =>
  `${foreground} on ${background} — ${measured(ratio, floor)}`;

/** A decorative surface as a line, e.g. `divider: border on background — 1.00:1 (needs 1.05:1)`. */
export const formatDecorativeFailure = ({
  surface,
  role,
  over,
  ratio,
  floor,
}: DecorativeFailure): string =>
  `${surface}: ${role} on ${over} — ${measured(ratio, floor)}`;

/** A role the renderer would ignore, with the value it was given. */
export const formatInvalidRole = ({ role, value }: InvalidColorRole): string =>
  `${role} — ${JSON.stringify(value)} is not a colour GPUix can paint`;

/** A series colour too close to a plot surface, e.g. `card: series 2 — 1.14:1 (needs 3:1)`. */
export const formatSeriesSurfaceFailure = ({
  index,
  surface,
  ratio,
  floor,
}: SeriesSurfaceFailure): string =>
  `${surface}: series ${index + 1} — ${measured(ratio, floor)}`;

/** Two series colours a reader cannot tell apart. */
export const formatSeriesDistinctnessFailure = ({
  index,
  other,
  distance,
  floor,
}: SeriesDistinctnessFailure): string =>
  `series ${index + 1} and series ${other + 1} — ${
    distance === undefined ? "unmeasurable" : distance.toFixed(3)
  } apart (needs ${floor})`;

/**
 * A selection wash as a line. It has two jobs and one line per missed job: the
 * wash must be visible where the reader selected, and the text inside it must
 * keep the body floor.
 */
export const formatSelectionFailure = ({
  kind,
  foreground,
  background,
  ratio,
  floor,
}: SelectionFailure): string =>
  kind === "visibility"
    ? `selection wash over ${background} — ${measured(ratio, floor)}`
    : `${foreground} on the selection wash over ${background} — ${measured(ratio, floor)}`;

/** Every finding the audit reports, in the one list the readout prints. */
export const auditFindings = (
  report: ThemeAudit,
): ReadonlyArray<AuditFinding> => [
  ...report.invalidRoles.map((failure) => ({
    kind: "role" as const,
    text: formatInvalidRole(failure),
  })),
  ...report.contrast.map((failure) => ({
    kind: "contrast" as const,
    text: formatContrastFailure(failure),
  })),
  ...report.decorative.map((failure) => ({
    kind: "decorative" as const,
    text: formatDecorativeFailure(failure),
  })),
  ...report.series.surfaces.map((failure) => ({
    kind: "series" as const,
    text: formatSeriesSurfaceFailure(failure),
  })),
  ...report.series.distinctness.map((failure) => ({
    kind: "series" as const,
    text: formatSeriesDistinctnessFailure(failure),
  })),
  ...report.selection.map((failure) => ({
    kind: "selection" as const,
    text: formatSelectionFailure(failure),
  })),
];

/**
 * True when every editable role is a colour GPUix can paint — the audit's own
 * role check, read at the persistence boundary. A stored edit that carries a
 * value the runtime ignores would paint the previous colour or black in
 * silence, so it is rejected instead of restored.
 */
export const paintsEveryRole = (mode: ThemeMode, edits: TokenEdits): boolean =>
  auditTheme(resolveTheme(mode, edits)).invalidRoles.length === 0;

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
  return editableRoles.every((role) => typeof colors[role] === "string");
};

const isPaintableEdits = (
  mode: ThemeMode,
  value: unknown,
): value is TokenEdits => isTokenEdits(value) && paintsEveryRole(mode, value);

/**
 * Decode a persisted editor state (from the URL or localStorage) at the
 * boundary. Returns `undefined` for anything that is not a complete, valid
 * `EditorState`, so a malformed value falls back to the defaults instead of
 * poisoning the preview. A theme that merely misses a contrast or decorative
 * floor is a design choice the editor reports, not a malformed state.
 */
export const parseState = (value: unknown): EditorState | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (
    !isPaintableEdits("light", record.light) ||
    !isPaintableEdits("dark", record.dark)
  ) {
    return undefined;
  }
  return { light: record.light, dark: record.dark };
};

/** Parse a persisted JSON string, falling back to `undefined` on bad input. */
export const decodeState = (raw: string): EditorState | undefined => {
  try {
    return parseState(JSON.parse(raw));
  } catch {
    return undefined;
  }
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
