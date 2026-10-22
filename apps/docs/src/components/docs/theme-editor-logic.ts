import {
  auditTheme,
  extendTheme,
  targetSize,
  themes,
  type ContrastFailure,
  type DecorativeFailure,
  type DisabledFadeFailure,
  type IndicatorFailure,
  type InvalidColorRole,
  type InvalidNumber,
  type InvalidShadowColor,
  type KeyboardDimFailure,
  type NumberRule,
  type SelectionFailure,
  type SeriesDistinctnessFailure,
  type SeriesSurfaceFailure,
  type SeriesVisionFailure,
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

/**
 * What a reader changed: a value per role they touched, over the base theme the
 * platform switch resolves. An untouched role is absent, so the base shows
 * through — which is what lets the switch re-base the preview without throwing
 * the edits away.
 */
export interface ThemePins {
  readonly colors: Partial<Record<EditableRole, string>>;
  readonly radiusMd?: number;
  readonly fontSans?: string;
}

/** The editable state for both modes; each mode is independent. */
export type EditorState = Record<ThemeMode, ThemePins>;

/** No edits: the base theme, whole. */
export const noPins = (): ThemePins => ({ colors: {} });

/** The editor's starting point: no edits over the base theme of each mode. */
export const defaultState = (): EditorState => ({
  light: noPins(),
  dark: noPins(),
});

/**
 * Resolve the edits into a complete `Theme` the preview can render. Uses the
 * library's own `extendTheme`, so the preview and the copied `createTheme` file
 * are the same theme by construction: `base` is the platform style the switch
 * selected, and every role the reader did not touch stays that style's.
 */
export const resolveTheme = (
  mode: ThemeMode,
  pins: ThemePins,
  base: Theme = themes[mode],
): Theme =>
  extendTheme(base, {
    colors: pins.colors,
    ...(pins.radiusMd === undefined ? {} : { radius: { md: pins.radiusMd } }),
    ...(pins.fontSans === undefined
      ? {}
      : { typography: { sans: pins.fontSans } }),
  });

/** The editable roles' values in a resolved theme, as the copy output prints them. */
const editableValues = (theme: Theme): Record<EditableRole, string> => ({
  background: theme.colors.background,
  foreground: theme.colors.foreground,
  card: theme.colors.card,
  popover: theme.colors.popover,
  primary: theme.colors.primary,
  secondary: theme.colors.secondary,
  muted: theme.colors.muted,
  accent: theme.colors.accent,
  destructive: theme.colors.destructive,
  border: theme.colors.border,
  input: theme.colors.input,
  ring: theme.colors.ring,
});

/** The `createTheme` config the copy output emits, as data (not a string). */
export const themeConfig = (
  mode: ThemeMode,
  theme: Theme,
): {
  mode: ThemeMode;
  name: string;
  colors: Record<EditableRole, string>;
  radius: { md: number };
  typography: { sans: string };
} => ({
  mode,
  name: "My theme",
  colors: editableValues(theme),
  radius: { md: theme.radius.md },
  typography: { sans: theme.typography.sans },
});

/**
 * The whole theme contract for an edit, as the library's own gate reports it: a
 * role or an elevation shadow the renderer cannot paint, a numeric token it
 * cannot lay out, a text pair below its floor, a decorative surface too close to
 * what it sits on, a data-series colour too close to its plot or to its
 * neighbour (or two that collapse once a colour-vision deficiency is simulated),
 * a selection wash that hides itself or the text it covers, an indicator mark a
 * reader cannot find on the strip it is drawn on, and a disabled control whose
 * faded label vanishes into its faded fill. `auditTheme` reads all nine in one
 * call, so the editor cannot show some reports and leave the others silent. The
 * base is the platform style the preview is painted over, so the audit measures
 * what the reader sees.
 */
export const auditReport = (
  mode: ThemeMode,
  pins: ThemePins,
  base: Theme = themes[mode],
): ThemeAudit => auditTheme(resolveTheme(mode, pins, base));

/** Which of the audit's ten reports a finding came from. */
export type AuditKind =
  | "role"
  | "shadow"
  | "number"
  | "contrast"
  | "decorative"
  | "series"
  | "deficiency"
  | "selection"
  | "indicator"
  | "disabled"
  | "dim";

/** One audit finding, already worded for the readout. */
export interface AuditFinding {
  readonly kind: AuditKind;
  readonly text: string;
}

const measured = (ratio: number | undefined, floor: number): string =>
  `${ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1`} (needs ${floor}:1)`;

/**
 * The same sentence for a selection wash, which has one failure a ratio cannot
 * express: a theme restored from storage can predate the `selection` role (or
 * the surface under it), so there is no wash to composite and no ratio to
 * print. `invalidColorRoles` names the missing role; the line says the wash
 * could not be built rather than calling a missing value "unmeasurable".
 */
const composited = (
  wash: string | undefined,
  ratio: number | undefined,
  floor: number,
): string =>
  wash === undefined
    ? `could not be composited (needs ${floor}:1)`
    : measured(ratio, floor);

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

/**
 * A role the renderer would ignore. A value it cannot parse is quoted; an
 * absent value — a stored theme older than a role the library added — is called
 * missing, because `JSON.stringify(undefined)` has no string to quote and
 * `undefined is not a colour` reads as a typo rather than an upgrade.
 */
export const formatInvalidRole = ({ role, value }: InvalidColorRole): string =>
  value === undefined
    ? `${role} — missing from this theme`
    : `${role} — ${JSON.stringify(value)} is not a colour GPUix can paint`;

/**
 * An elevation shadow the renderer would ignore, e.g. `elevation md (shadow 1) —
 * "#00000" is not a colour GPUix can paint`. The level then paints no shadow at
 * all, so a raised card or dialog silently sits flat.
 */
export const formatInvalidShadow = ({
  level,
  index,
  color,
}: InvalidShadowColor): string =>
  `elevation ${level} (shadow ${index + 1}) — ${JSON.stringify(color)} is not a colour GPUix can paint`;

/** What a number has to be, in the reader's terms rather than the rule's name. */
const numberRequirement: Record<NumberRule, string> = {
  finite: "a finite number",
  nonNegative: "a length of zero or more",
  positive: "a size greater than zero",
  pressable: `a pressable height of ${targetSize.minimum} or more`,
  leading: "a line height at least its own font size",
  fits: "a height that contains the tallest label or icon it carries",
  emphasis:
    "the size and leading the body text sets, and a weight that exceeds it",
};

/**
 * A numeric token the renderer cannot lay out, e.g. `radius md — NaN cannot be
 * laid out (needs a length of zero or more)`. A style batch crosses a JSON
 * boundary on its way to native, so `NaN` and `Infinity` arrive as `null` and
 * the property is dropped in silence; a negative or zero size is accepted and
 * lays an element out at no height. Either way the reader sees a theme that is
 * not the one they described.
 */
export const formatInvalidNumber = ({
  group,
  path,
  value,
  rule,
}: InvalidNumber): string =>
  `${group} ${path} — ${String(value)} cannot be laid out (needs ${numberRequirement[rule]})`;

/** A series colour too close to a plot surface, e.g. `card: series 2 — 1.14:1 (needs 3:1)`. */
export const formatSeriesSurfaceFailure = ({
  index,
  surface,
  ratio,
  floor,
}: SeriesSurfaceFailure): string =>
  `${surface}: series ${index + 1} — ${measured(ratio, floor)}`;

/** Two positions as a distance against the floor they had to reach. */
const apart = (distance: number | undefined, floor: number): string =>
  `${distance === undefined ? "unmeasurable" : distance.toFixed(3)} apart (needs ${floor})`;

/** Two series colours a reader cannot tell apart. */
export const formatSeriesDistinctnessFailure = ({
  index,
  other,
  distance,
  floor,
}: SeriesDistinctnessFailure): string =>
  `series ${index + 1} and series ${other + 1} — ${apart(distance, floor)}`;

/**
 * Two series colours a reader with a colour-vision deficiency cannot tell apart,
 * e.g. `deuteranopia: series 1 and 2 — 0.029 apart (needs 0.05)`. Contrast and
 * distance both assume full colour vision, so this is the one report that sees a
 * scale collapsing for a colour-blind reader.
 */
export const formatSeriesVisionFailure = ({
  deficiency,
  index,
  other,
  distance,
  floor,
}: SeriesVisionFailure): string =>
  `${deficiency}: series ${index + 1} and series ${other + 1} — ${apart(distance, floor)}`;

/**
 * A selection wash as a line. It has two jobs and one line per missed job: the
 * wash must be visible where the reader selected, and the text inside it must
 * keep the body floor. Both lines carry the wash's fate, so a theme that cannot
 * composite one says so instead of printing an unmeasurable ratio.
 */
export const formatSelectionFailure = ({
  kind,
  foreground,
  background,
  wash,
  ratio,
  floor,
}: SelectionFailure): string =>
  kind === "visibility"
    ? `selection wash over ${background} — ${composited(wash, ratio, floor)}`
    : `${foreground} on the selection wash over ${background} — ${composited(wash, ratio, floor)}`;

/**
 * An indicator mark as a line, e.g. `mark primary on muted — 1.20:1 (needs
 * 3:1)`. A bar, dot or filled slider span is neither text nor a boundary, so no
 * contrast pair covers it: the mark has to be *findable* from across a panel.
 */
export const formatIndicatorFailure = ({
  role,
  surface,
  ratio,
  floor,
}: IndicatorFailure): string =>
  `mark ${role} on ${surface} — ${measured(ratio, floor)}`;

/**
 * A disabled control whose label disappears into its faded fill, e.g. `primary
 * disabled on background — 1.04:1 (needs 1.5:1)`. The fade is a mechanism, not
 * a readability claim: WCAG exempts an inactive component, but a reader still
 * has to see that there is one, and the label is composited over the faded fill
 * rather than the page, which is why a pair that passes enabled can fail here.
 */
export const formatDisabledFade = ({
  fill,
  over,
  ratio,
  floor,
}: DisabledFadeFailure): string =>
  `${fill} disabled on ${over} — ${measured(ratio, floor)}`;

/**
 * A control the keyboard dim erases, e.g. `primary dimmed on card — 1.27:1
 * (needs 1.05:1)`. While one control has keyboard focus the runtime paints
 * every other focusable at 40%, so a filled action's label composites into its
 * own dimmed fill; the floor is only that the label stays a label, because a
 * control that must stay readable opts out with `keyboardFocusDim: false`.
 */
export const formatKeyboardDim = ({
  fill,
  over,
  ratio,
  floor,
}: KeyboardDimFailure): string =>
  `${fill} dimmed on ${over} — ${measured(ratio, floor)}`;

/** Every finding the audit reports, in the one list the readout prints. */
export const auditFindings = (
  report: ThemeAudit,
): ReadonlyArray<AuditFinding> => [
  ...report.invalidRoles.map((failure) => ({
    kind: "role" as const,
    text: formatInvalidRole(failure),
  })),
  ...report.invalidShadows.map((failure) => ({
    kind: "shadow" as const,
    text: formatInvalidShadow(failure),
  })),
  ...report.invalidNumbers.map((failure) => ({
    kind: "number" as const,
    text: formatInvalidNumber(failure),
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
  ...report.series.deficiencies.map((failure) => ({
    kind: "deficiency" as const,
    text: formatSeriesVisionFailure(failure),
  })),
  ...report.selection.map((failure) => ({
    kind: "selection" as const,
    text: formatSelectionFailure(failure),
  })),
  ...report.indicators.map((failure) => ({
    kind: "indicator" as const,
    text: formatIndicatorFailure(failure),
  })),
  ...report.disabledFade.map((failure) => ({
    kind: "disabled" as const,
    text: formatDisabledFade(failure),
  })),
  ...report.keyboardDim.map((failure) => ({
    kind: "dim" as const,
    text: formatKeyboardDim(failure),
  })),
];

/**
 * True when the resolved theme paints every role — the audit's own role check,
 * read at the persistence boundary. A stored edit that carries a value the
 * runtime ignores would paint the previous colour or black in silence, so it is
 * rejected instead of restored. The built-in theme is the base, because whether
 * a colour parses must not depend on which platform style is showing.
 */
export const paintsEveryRole = (mode: ThemeMode, pins: ThemePins): boolean =>
  auditTheme(resolveTheme(mode, pins)).invalidRoles.length === 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isKnownRole = (key: string): key is EditableRole =>
  editableRoles.some((role) => role === key);

const isPinnedColour = ([role, colour]: readonly [string, unknown]): boolean =>
  isKnownRole(role) && typeof colour === "string";

const isPins = (value: unknown): value is ThemePins => {
  if (!isRecord(value)) return false;
  const { colors, radiusMd, fontSans } = value;

  if (colors !== undefined) {
    if (!isRecord(colors)) return false;
    if (!Object.entries(colors).every(isPinnedColour)) return false;
  }
  if (
    radiusMd !== undefined &&
    (typeof radiusMd !== "number" || !Number.isFinite(radiusMd) || radiusMd < 0)
  ) {
    return false;
  }
  if (fontSans !== undefined && typeof fontSans !== "string") return false;
  return true;
};

const isPaintablePins = (mode: ThemeMode, value: unknown): value is ThemePins =>
  isPins(value) && paintsEveryRole(mode, value);

/**
 * Decode a persisted editor state (from the URL or localStorage) at the
 * boundary. Returns `undefined` for anything that is not a readable pin set, so
 * a malformed value falls back to the defaults instead of poisoning the
 * preview. A theme that merely misses a contrast or decorative floor is a design
 * choice the editor reports, not a malformed state.
 */
export const parseState = (value: unknown): EditorState | undefined => {
  if (!isRecord(value)) return undefined;
  if (
    !isPaintablePins("light", value.light) ||
    !isPaintablePins("dark", value.dark)
  ) {
    return undefined;
  }
  return { light: value.light, dark: value.dark };
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

const modeBlock = (mode: ThemeMode, theme: Theme): string => {
  const config = themeConfig(mode, theme);
  return `  ${mode}: createTheme({\n    mode: ${JSON.stringify(mode)},\n    name: "My theme",\n    colors: {\n${colorLines(config.colors)}\n    },\n    radius: { md: ${config.radius.md} },\n    typography: { sans: ${JSON.stringify(config.typography.sans)} },\n  }),`;
};

/**
 * The copy output: a valid `createTheme` module in the library's own format,
 * one theme per mode, with a one-line usage note. It prints the values the
 * preview resolved — the base style plus the reader's edits — so what a reader
 * copies is what they saw, including the platform styles they did not touch.
 */
export const themeSource = (
  resolved: Readonly<Record<ThemeMode, Theme>>,
): string =>
  `import { createTheme } from "@gpuixui/tokens";

// Usage: <ThemeProvider theme={theme[activeMode]} /> from "@gpuixui/tokens/react".
export const theme = {
${modeBlock("light", resolved.light)}
${modeBlock("dark", resolved.dark)}
};
`;
