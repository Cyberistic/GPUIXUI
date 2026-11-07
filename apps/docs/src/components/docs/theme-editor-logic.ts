import {
  auditTheme,
  extendTheme,
  targetSize,
  themes,
  type ContrastFailure,
  type DecorativeFailure,
  type DisabledFadeFailure,
  type HighlightFailure,
  type IndicatorFailure,
  type InvalidColorRole,
  type InvalidNumber,
  type InvalidScale,
  type InvalidShadowColor,
  type InvalidSwitchColor,
  type KeyboardDimFailure,
  type NumberRule,
  type SelectionFailure,
  type SeriesDistinctnessFailure,
  type SeriesSurfaceFailure,
  type SeriesVisionFailure,
  type SwitchMetricFailure,
  type SwitchPlacementFailure,
  type SyntaxFailure,
  type Theme,
  type ThemeAudit,
  type ThemeMode,
} from "@gpuixui/tokens";

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

export interface ThemePins {
  readonly colors: Partial<Record<EditableRole, string>>;
  readonly radiusMd?: number;
  readonly fontSans?: string;
}

export type EditorState = Record<ThemeMode, ThemePins>;

export const noPins = (): ThemePins => ({ colors: {} });

export const defaultState = (): EditorState => ({
  light: noPins(),
  dark: noPins(),
});

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

export const auditReport = (
  mode: ThemeMode,
  pins: ThemePins,
  base: Theme = themes[mode],
): ThemeAudit => auditTheme(resolveTheme(mode, pins, base));

export type AuditKind =
  | "role"
  | "shadow"
  | "number"
  | "contrast"
  | "decorative"
  | "series"
  | "syntax"
  | "deficiency"
  | "selection"
  | "indicator"
  | "disabled"
  | "dim"
  | "scale"
  | "switch"
  | "highlight";

export interface AuditFinding {
  readonly kind: AuditKind;
  readonly text: string;
  readonly warning?: boolean;
  readonly unmeasurable?: boolean;
}

export interface FindingOptions {
  readonly warnings?: boolean;
}

const measured = (ratio: number | undefined, floor: number): string =>
  `${ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1`} (needs ${floor}:1)`;

const composited = (
  wash: string | undefined,
  ratio: number | undefined,
  floor: number,
): string =>
  wash === undefined
    ? `could not be composited (needs ${floor}:1)`
    : measured(ratio, floor);

export const formatContrastFailure = ({
  foreground,
  background,
  ratio,
  floor,
}: ContrastFailure): string =>
  `${foreground} on ${background} — ${measured(ratio, floor)}`;

export const formatDecorativeFailure = ({
  surface,
  role,
  over,
  ratio,
  floor,
  level,
}: DecorativeFailure): string =>
  `${surface}${level === undefined ? "" : ` ${level}`}: ${role} on ${over} — ${measured(ratio, floor)}`;

export const formatInvalidRole = ({ role, value }: InvalidColorRole): string =>
  value === undefined
    ? `${role} — missing from this theme`
    : `${role} — ${JSON.stringify(value)} is not a colour GPUix can paint`;

export const formatInvalidShadow = ({
  level,
  index,
  color,
}: InvalidShadowColor): string =>
  `elevation ${level} (shadow ${index + 1}) — ${JSON.stringify(color)} is not a colour GPUix can paint`;

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

export const formatInvalidNumber = ({
  group,
  path,
  value,
  rule,
}: InvalidNumber): string =>
  `${group} ${path} — ${String(value)} cannot be laid out (needs ${numberRequirement[rule]})`;

export const formatSeriesSurfaceFailure = ({
  index,
  surface,
  ratio,
  floor,
}: SeriesSurfaceFailure): string =>
  `${surface}: series ${index + 1} — ${measured(ratio, floor)}`;

const apart = (distance: number | undefined, floor: number): string =>
  `${distance === undefined ? "unmeasurable" : distance.toFixed(3)} apart (needs ${floor})`;

export const formatSeriesDistinctnessFailure = ({
  index,
  other,
  distance,
  floor,
}: SeriesDistinctnessFailure): string =>
  `series ${index + 1} and series ${other + 1} — ${apart(distance, floor)}`;

export const formatSeriesVisionFailure = ({
  deficiency,
  index,
  other,
  distance,
  floor,
}: SeriesVisionFailure): string =>
  `${deficiency}: series ${index + 1} and series ${other + 1} — ${apart(distance, floor)}`;

export const formatSyntaxFailure = ({
  role,
  surface,
  ratio,
  floor,
}: SyntaxFailure): string =>
  `code ${role} on ${surface} — ${measured(ratio, floor)}`;

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

export const formatIndicatorFailure = ({
  role,
  surface,
  ratio,
  floor,
}: IndicatorFailure): string =>
  `mark ${role} on ${surface} — ${measured(ratio, floor)}`;

export const formatDisabledFade = ({
  fill,
  over,
  ratio,
  floor,
}: DisabledFadeFailure): string =>
  `${fill} disabled on ${over} — ${measured(ratio, floor)}`;

export const formatKeyboardDim = ({
  fill,
  over,
  ratio,
  floor,
}: KeyboardDimFailure): string =>
  `${fill} dimmed on ${over} — ${measured(ratio, floor)}`;

export const formatInvalidScale = ({
  group,
  path,
  value,
  previous,
}: InvalidScale): string =>
  `${group} ${path} — ${value} does not exceed ${previous.path} at ${previous.value}`;

export const formatInvalidSwitch = ({
  slot,
  value,
}: InvalidSwitchColor): string =>
  value === undefined
    ? `switch ${slot} — missing from this theme`
    : `switch ${slot} — ${JSON.stringify(value)} is not a colour GPUix can paint`;

export const formatSwitchPlacement = ({
  slot,
  over,
  ratio,
  floor,
}: SwitchPlacementFailure): string =>
  `switch ${slot} on ${over} — ${measured(ratio, floor)}`;

export const formatSwitchMetric = ({
  slot,
  value,
  rule,
  needs,
}: SwitchMetricFailure): string =>
  value === undefined
    ? `switch ${slot} — missing from this theme`
    : rule === "fits"
      ? `switch ${slot} — ${String(value)} cannot hold a knob that needs ${needs}`
      : `switch ${slot} — ${String(value)} cannot be laid out (needs ${numberRequirement[rule]})`;

export const formatHighlightFailure = ({
  kind,
  state,
  surface,
  wash,
  ratio,
  floor,
}: HighlightFailure): string =>
  kind === "visibility"
    ? `find ${state} on ${surface} — ${composited(wash, ratio, floor)}`
    : kind === "legibility"
      ? `foreground on the find ${state} wash over ${surface} — ${composited(wash, ratio, floor)}`
      : `find active and match on ${surface} — ${ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1 apart`} (needs ${floor}:1)`;

export const auditSummary: Readonly<
  Record<Exclude<keyof ThemeAudit, "passed">, string>
> = {
  invalidRoles: "every role paints",
  invalidShadows: "every shadow level paints its colour",
  invalidNumbers: "every number lays out",
  contrast: "every text pair clears its floor",
  decorative: "every decorative surface stays visible",
  series:
    "every data-series colour separates from its plot and from its neighbours under every colour-vision deficiency",
  syntax: "every token in a code block is readable on the fill it is read on",
  selection: "every selection wash stays visible with readable text inside it",
  indicators: "every indicator mark is findable on the strip it is drawn on",
  highlight: "every find wash stands out",
  disabledFade: "every disabled control keeps its faded label",
  keyboardDim: "every control the keyboard dim touches keeps a visible one",
  scales: "every ladder stays in order",
  switch: "the declared switch is findable",
};

const findingsOf = (report: ThemeAudit): ReadonlyArray<AuditFinding> => [
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
  ...report.scales.map((failure) => ({
    kind: "scale" as const,
    text: formatInvalidScale(failure),
  })),
  ...report.switch.paint.map((failure) => ({
    kind: "switch" as const,
    text: formatInvalidSwitch(failure),
  })),
  ...report.switch.placements.map((failure) => ({
    kind: "switch" as const,
    text: formatSwitchPlacement(failure),
  })),
  ...report.switch.metrics.map((failure) => ({
    kind: "switch" as const,
    text: formatSwitchMetric(failure),
  })),
  ...report.contrast.map((failure) => ({
    kind: "contrast" as const,
    text: formatContrastFailure(failure),
    ...(failure.ratio === undefined ? { unmeasurable: true } : {}),
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
  ...report.syntax.map((failure) => ({
    kind: "syntax" as const,
    text: formatSyntaxFailure(failure),
  })),
  ...report.selection.map((failure) => ({
    kind: "selection" as const,
    text: formatSelectionFailure(failure),
  })),
  ...report.indicators.map((failure) => ({
    kind: "indicator" as const,
    text: formatIndicatorFailure(failure),
  })),
  ...report.highlight.map((failure) => ({
    kind: "highlight" as const,
    text: formatHighlightFailure(failure),
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

export const auditFindings = (
  report: ThemeAudit,
): ReadonlyArray<AuditFinding> =>
  findingsOf(report).map((finding) =>
    finding.text.includes("unmeasurable")
      ? { ...finding, unmeasurable: true }
      : finding,
  );

export const themeFindings = (
  mode: ThemeMode,
  pins: ThemePins,
  base: Theme = themes[mode],
  options: FindingOptions = {},
): ReadonlyArray<AuditFinding> => {
  const findings = auditFindings(auditReport(mode, pins, base));
  return options.warnings === true
    ? findings.map((finding) => ({ ...finding, warning: true }))
    : findings;
};

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
