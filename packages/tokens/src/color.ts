/**
 * Raw colour ramps. Components must use {@link ThemeColors} roles instead;
 * ramps exist for documentation and for the rare case that needs a shade
 * outside the semantic set.
 */
export const palette = {
  neutral: {
    0: "#FFFFFF",
    25: "#FBFCFD",
    50: "#F6F8FA",
    100: "#EEF1F5",
    200: "#E1E5EC",
    300: "#CBD1DB",
    400: "#A1A9B7",
    500: "#737C8C",
    600: "#545D6C",
    700: "#3D4552",
    800: "#2A303B",
    850: "#222730",
    900: "#191D25",
    950: "#11141A",
    1000: "#0B0D11",
  },
  blue: {
    50: "#EFF4FF",
    100: "#DEE9FF",
    200: "#C5D8FF",
    300: "#9FBEFF",
    400: "#6E9CFF",
    500: "#3B76F6",
    600: "#2559D6",
    700: "#1B45AC",
    800: "#173A88",
    900: "#152F6B",
    950: "#0C1D42",
  },
  iris: {
    50: "#EEF0FF",
    100: "#E0E3FF",
    200: "#C7CBFF",
    300: "#A7A9FF",
    400: "#8B85FB",
    500: "#7567F2",
    600: "#5F4BDB",
    700: "#4C39B5",
    800: "#3B2C8F",
    900: "#2E2370",
    950: "#1C1547",
  },
  red: {
    50: "#FFF1F1",
    100: "#FFE0E0",
    200: "#FFC6C6",
    300: "#FF9E9E",
    400: "#FF6B6B",
    500: "#E5484D",
    600: "#CC3439",
    700: "#A5262B",
    800: "#7E1D21",
    900: "#5C1619",
    950: "#3A0B0D",
  },
  green: {
    50: "#ECFDF3",
    100: "#D3F9E2",
    200: "#A8F0C6",
    300: "#6FE0A3",
    400: "#3BC97F",
    500: "#1FA968",
    600: "#158754",
    700: "#116A43",
    800: "#0E5135",
    900: "#0A3A26",
    950: "#042015",
  },
  amber: {
    50: "#FFF8E8",
    100: "#FFEFC6",
    200: "#FFDE8A",
    300: "#FFC94D",
    400: "#F5B01F",
    500: "#D99400",
    600: "#B57600",
    700: "#8E5B00",
    800: "#6B4500",
    900: "#4B3100",
    950: "#2A1B00",
  },
} as const;

/**
 * Semantic colour roles. A role names intent, never a shade, so a theme can
 * change every value without component source changing.
 */
export interface ThemeColors {
  /** Window and application canvas. */
  readonly background: string;
  /** Default text on `background`. */
  readonly foreground: string;
  /** Raised content surface. */
  readonly card: string;
  /** Text on `card`. */
  readonly cardForeground: string;
  /** Floating surface for menus, popovers and dialogs. */
  readonly popover: string;
  /** Text on `popover`. */
  readonly popoverForeground: string;
  /** Primary action background. */
  readonly primary: string;
  /** Text and icons on `primary`. */
  readonly primaryForeground: string;
  /** Primary action background while hovered. */
  readonly primaryHover: string;
  /** Primary action background while pressed. */
  readonly primaryActive: string;
  /** Brand-toned text, links and icons on plain surfaces. */
  readonly primaryText: string;
  /** Secondary action background. */
  readonly secondary: string;
  /** Text and icons on `secondary`. */
  readonly secondaryForeground: string;
  /** Secondary action background while hovered. */
  readonly secondaryHover: string;
  /** Secondary action background while pressed. */
  readonly secondaryActive: string;
  /** Quiet surface for disabled areas and subtle grouping. */
  readonly muted: string;
  /** Secondary text on `muted` and on `background`. */
  readonly mutedForeground: string;
  /**
   * Highlight wash for a menu row, a selectable row under the pointer and a
   * toggle that is on. A persistent row selection is `selected`.
   */
  readonly accent: string;
  /** Text and icons on `accent`. */
  readonly accentForeground: string;
  /** Tinted emphasis surface while hovered. */
  readonly accentHover: string;
  /** Tinted emphasis surface while pressed. */
  readonly accentActive: string;
  /** Destructive action background. */
  readonly destructive: string;
  /** Text and icons on `destructive`. */
  readonly destructiveForeground: string;
  /** Destructive action background while hovered. */
  readonly destructiveHover: string;
  /** Destructive action background while pressed. */
  readonly destructiveActive: string;
  /** Success background and indicator. */
  readonly success: string;
  /** Text and icons on `success`. */
  readonly successForeground: string;
  /** Warning background and indicator. */
  readonly warning: string;
  /** Text and icons on `warning`. */
  readonly warningForeground: string;
  /** Informational status, distinct from `primary`. */
  readonly info: string;
  /** Text and icons on `info`. */
  readonly infoForeground: string;
  /** Soft informational surface for alerts, badges and toasts. */
  readonly infoSoft: string;
  /** Text and icons on `infoSoft`. */
  readonly infoSoftForeground: string;
  /** Designed edge around `infoSoft`, held to the divider floor on that fill. */
  readonly infoSoftBorder: string;
  /** Soft success surface. */
  readonly successSoft: string;
  /** Text and icons on `successSoft`. */
  readonly successSoftForeground: string;
  /** Designed edge around `successSoft`, held to the divider floor on that fill. */
  readonly successSoftBorder: string;
  /** Soft warning surface. */
  readonly warningSoft: string;
  /** Text and icons on `warningSoft`. */
  readonly warningSoftForeground: string;
  /** Designed edge around `warningSoft`, held to the divider floor on that fill. */
  readonly warningSoftBorder: string;
  /** Soft destructive surface. */
  readonly destructiveSoft: string;
  /** Text and icons on `destructiveSoft`. */
  readonly destructiveSoftForeground: string;
  /** Designed edge around `destructiveSoft`, held to the divider floor on that fill. */
  readonly destructiveSoftBorder: string;
  /** Informational status text and indicators on plain surfaces and row washes. */
  readonly infoText: string;
  /** Success status text and indicators on plain surfaces and row washes. */
  readonly successText: string;
  /** Warning status text and indicators on plain surfaces and row washes. */
  readonly warningText: string;
  /** Destructive status text and indicators on plain surfaces and row washes. */
  readonly destructiveText: string;
  /** Dividers and decorative borders. */
  readonly border: string;
  /** Control boundaries on plain surfaces, a quiet panel, row washes and soft status fills. */
  readonly borderStrong: string;
  /** Input field background. */
  readonly input: string;
  /** Text typed into an input. */
  readonly inputForeground: string;
  /** Placeholder text inside an input. */
  readonly placeholder: string;
  /** Focus ring. */
  readonly ring: string;
  /** Text selection wash for `selectionColor`. Translucent, so text stays legible. */
  readonly selection: string;
  /**
   * Text selection veil for content painted on a filled action. Neutral, because
   * an accent-tinted wash cannot be perceived on the accent fill itself.
   */
  readonly selectionOnFill: string;
  /**
   * Modal scrim. Translucent, because the surfaces beneath it must stay
   * recognisable. A pure black canvas cannot be darkened, so the high-contrast
   * dark theme veils with light instead of black.
   */
  readonly overlay: string;
  /** Hover wash for ghost and subtle surfaces; a filled control uses `xHover`. */
  readonly hover: string;
  /** Pressed wash for ghost and subtle surfaces; a filled control uses `xActive`. */
  readonly active: string;
  /**
   * Selected row or item background, held one perceivable step past the
   * `accent` wash a selectable row hovers with.
   */
  readonly selected: string;
  /** Text and icons on `selected`. */
  readonly selectedForeground: string;
  /** Disabled surface. Deliberately allowed to sit near the panel: no neutral clears both a white card and the quiet panel, so a disabled control paints its `border` edge on this fill to keep its shape. */
  readonly disabled: string;
  /** Disabled text and icons; held to the `inactive` floor (3:1, 4.5:1 at AAA) so an unavailable control stays readable. */
  readonly disabledForeground: string;
  /** Loading placeholder, held to the perceivability floor on every surface and row wash it fills. */
  readonly skeleton: string;
  /**
   * The unfilled groove of a value indicator — a progress bar, meter or slider
   * rail. A surface role cannot carry this: the quiet panel is the same value
   * as the card in every platform dark style, so a track painted with `muted`
   * disappears on the surface it sits on.
   */
  readonly track: string;
  /**
   * Scrollbar thumb tint. Reserved in GPUix 0.10.0: the platform paints the
   * scrollbar and exposes no tint.
   */
  readonly scrollbar: string;
  /** Opaque elevation tint; each level applies its own alpha. */
  readonly shadow: string;
}

/**
 * Light theme semantic roles.
 *
 * The divider sits a half-step off the fill ladder (`#D6DAE1`, between neutral
 * 200 and 300) so a bordered control's edge stays visible on the fill it paints
 * (plan 080). `mutedForeground` is neutral 700 rather than 600 so secondary text
 * keeps the secondary floor when it is selected on a pressed row (plan 087).
 * The soft status foregrounds are the family's darkest step so an alert's text
 * keeps the body floor through the selection wash (plan 091). The soft tints are
 * custom pastels that clear every shipped canvas, card, popover and quiet panel,
 * so a badge in a sidebar stays perceivable (plan 300). The skeleton is
 * one ramp step darker than the pressed wash so a loading row never erases it
 * (plan 094). The filled-control hover and pressed steps are designed opaque
 * roles, so no state composites an alpha fill (plan 097). `disabledForeground` is
 * a half-step between neutral 500 and 600 so an inactive label clears the 3:1
 * `inactive` floor on the darkest platform pressed wash with margin, while the
 * fill stays near the panel and the control's `border` edge carries its shape
 * (plan 306). The quiet panel is neutral 25 — a step toward the card rather than
 * the canvas — so a `hover`, `secondary`, `accent` or `selected` fill painted on
 * a sidebar stays perceivable (plan 309). The status text roles sit a half-step
 * between their ramp steps, so a label keeps the secondary floor when it is
 * selected with the row around it (plan 366). The selected row is iris 100, one
 * designed step past the `accent` wash a selectable row hovers with: selection
 * must be perceivable from the state before the click, or the two look alike
 * (plan 381).
 */
export const lightColors = {
  background: palette.neutral[50],
  foreground: palette.neutral[900],
  card: palette.neutral[0],
  cardForeground: palette.neutral[900],
  popover: palette.neutral[0],
  popoverForeground: palette.neutral[900],
  primary: palette.iris[600],
  primaryForeground: palette.neutral[0],
  primaryHover: palette.iris[700],
  primaryActive: palette.iris[800],
  primaryText: palette.iris[700],
  secondary: palette.neutral[100],
  secondaryForeground: palette.neutral[800],
  secondaryHover: palette.neutral[200],
  secondaryActive: palette.neutral[300],
  muted: palette.neutral[25],
  mutedForeground: palette.neutral[700],
  accent: palette.iris[50],
  accentForeground: palette.iris[800],
  accentHover: palette.iris[100],
  accentActive: palette.iris[200],
  destructive: palette.red[600],
  destructiveForeground: palette.neutral[0],
  destructiveHover: palette.red[700],
  destructiveActive: palette.red[800],
  success: palette.green[600],
  successForeground: palette.neutral[0],
  warning: palette.amber[400],
  warningForeground: palette.amber[950],
  info: palette.blue[600],
  infoForeground: palette.neutral[0],
  infoSoft: "#D6E3FF",
  infoSoftForeground: palette.blue[900],
  infoSoftBorder: "#A6BEF3",
  successSoft: "#B8EDCE",
  successSoftForeground: palette.green[900],
  successSoftBorder: "#8ED3AF",
  warningSoft: "#FFDF9A",
  warningSoftForeground: palette.amber[950],
  warningSoftBorder: "#EFC055",
  destructiveSoft: "#FFD6D6",
  destructiveSoftForeground: palette.red[900],
  destructiveSoftBorder: "#F0ACAE",
  infoText: palette.blue[700],
  successText: "#0E5739",
  warningText: palette.amber[800],
  destructiveText: "#8F2126",
  border: "#D6DAE1",
  borderStrong: palette.neutral[500],
  input: palette.neutral[0],
  inputForeground: palette.neutral[900],
  placeholder: "#66707F",
  ring: palette.iris[500],
  selection: "#7567F23D",
  selectionOnFill: "#00000026",
  overlay: "#00000073",
  hover: palette.neutral[100],
  active: palette.neutral[200],
  selected: palette.iris[100],
  selectedForeground: palette.iris[800],
  disabled: palette.neutral[100],
  disabledForeground: "#6E7787",
  skeleton: palette.neutral[300],
  track: "#DBDFE5",
  scrollbar: palette.neutral[300],
  shadow: "#191D25",
} satisfies ThemeColors;

/**
 * Dark theme semantic roles. Designed, not an inversion of the light theme.
 * The divider sits a half-step off the fill ladder (`#343B47`, between neutral
 * 800 and 700) so a bordered control's edge stays visible on the fill it paints
 * (plan 080). `mutedForeground` is neutral 300 rather than 400 so secondary text
 * keeps the secondary floor when it is selected on a pressed row (plan 087).
 * The soft status foregrounds are the family's lightest step and the selection
 * wash is 20%, so an alert's text keeps the body floor through it while the
 * highlight stays visible (plan 091). The boundary is a half-step lighter than
 * plan 084 left it, so a checkbox or field inside an Alert or Toast keeps its
 * edge on all four soft status fills (plan 092). The skeleton is one ramp step
 * lighter than the pressed wash so a loading row never erases it (plan 094).
 * The filled-control hover and pressed steps lighten away from the canvas
 * (plan 097). `disabledForeground` is neutral 400 — one step dimmer than the
 * neutral-300 `mutedForeground` — because the lightest dark platform wash needs
 * it to clear the 3:1 `inactive` floor (plan 306). The hover wash is a designed
 * step between the neutral-850 quiet panel and the neutral-800 press, so a menu
 * item or a sidebar row reacts to the pointer on the surface it paints on
 * (plan 309). The selected row is one designed step lighter than the `accent`
 * wash a selectable row hovers with — between it and the pressed step — so the
 * click is perceivable and `selectedForeground` keeps its floor on it
 * (plan 381).
 */
export const darkColors = {
  background: palette.neutral[950],
  foreground: palette.neutral[100],
  card: palette.neutral[900],
  cardForeground: palette.neutral[100],
  popover: palette.neutral[850],
  popoverForeground: palette.neutral[50],
  primary: palette.iris[300],
  primaryForeground: palette.neutral[950],
  primaryHover: palette.iris[200],
  primaryActive: palette.iris[100],
  primaryText: palette.iris[200],
  secondary: palette.neutral[800],
  secondaryForeground: palette.neutral[200],
  secondaryHover: palette.neutral[700],
  secondaryActive: palette.neutral[600],
  muted: palette.neutral[850],
  mutedForeground: palette.neutral[300],
  accent: palette.iris[900],
  accentForeground: palette.iris[200],
  accentHover: "#42319F",
  accentActive: palette.iris[700],
  destructive: palette.red[400],
  destructiveForeground: palette.red[950],
  destructiveHover: palette.red[300],
  destructiveActive: palette.red[200],
  success: palette.green[400],
  successForeground: palette.green[950],
  warning: palette.amber[300],
  warningForeground: palette.amber[950],
  info: palette.blue[300],
  infoForeground: palette.neutral[950],
  infoSoft: "#16356F",
  infoSoftForeground: palette.blue[50],
  infoSoftBorder: "#3F5E9A",
  successSoft: "#0A3E28",
  successSoftForeground: palette.green[50],
  successSoftBorder: "#1A6D46",
  warningSoft: palette.amber[900],
  warningSoftForeground: palette.amber[50],
  warningSoftBorder: "#815F17",
  destructiveSoft: "#66191B",
  destructiveSoftForeground: palette.red[50],
  destructiveSoftBorder: "#983235",
  infoText: palette.blue[200],
  successText: palette.green[200],
  warningText: palette.amber[200],
  destructiveText: palette.red[200],
  border: "#343B47",
  borderStrong: "#868FA0",
  input: palette.neutral[900],
  inputForeground: palette.neutral[100],
  placeholder: "#858F9F",
  ring: palette.iris[300],
  selection: "#A7A9FF33",
  selectionOnFill: "#FFFFFF26",
  overlay: "#000000A6",
  hover: "#262C36",
  active: palette.neutral[800],
  selected: "#402F94",
  selectedForeground: palette.iris[200],
  disabled: palette.neutral[850],
  disabledForeground: palette.neutral[400],
  skeleton: palette.neutral[700],
  track: "#323945",
  scrollbar: palette.neutral[700],
  shadow: "#000000",
} satisfies ThemeColors;

/**
 * High-contrast light roles. The same 66 roles as {@link lightColors}, with
 * values chosen for AAA body text (7:1) and 4.5:1 essential boundaries. The
 * skeleton is a perceivable step off the pressed wash (plan 094). The divider is
 * darker than the neutral press step, so an outlined control keeps its 3:1 edge
 * while pressed (plan 318). The status text roles sit a half-step between their
 * ramp steps, so a label keeps the 7:1 floor when it is selected with the row
 * around it (plan 366). The selected row is a step past the `accent` wash a
 * selectable row hovers with, so the click is perceivable (plan 381).
 */
export const highContrastLightColors = {
  background: "#FFFFFF",
  foreground: "#000000",
  card: "#FFFFFF",
  cardForeground: "#000000",
  popover: "#FFFFFF",
  popoverForeground: "#000000",
  primary: "#3B2C8F",
  primaryForeground: "#FFFFFF",
  primaryHover: palette.iris[900],
  primaryActive: palette.iris[950],
  primaryText: palette.iris[800],
  secondary: "#E8E8E8",
  secondaryForeground: "#000000",
  secondaryHover: "#D6D6D6",
  secondaryActive: "#B8B8B8",
  muted: "#F2F2F2",
  mutedForeground: "#1F1F1F",
  accent: "#E0E3FF",
  accentForeground: "#2E2370",
  accentHover: "#D5D8FF",
  accentActive: "#BFC2FF",
  destructive: "#7E1D21",
  destructiveForeground: "#FFFFFF",
  destructiveHover: palette.red[900],
  destructiveActive: palette.red[950],
  success: "#0E5135",
  successForeground: "#FFFFFF",
  warning: "#F5B01F",
  warningForeground: "#000000",
  info: palette.blue[700],
  infoForeground: "#FFFFFF",
  infoSoft: palette.blue[200],
  infoSoftForeground: palette.blue[950],
  infoSoftBorder: palette.blue[700],
  successSoft: palette.green[200],
  successSoftForeground: palette.green[950],
  successSoftBorder: palette.green[700],
  warningSoft: palette.amber[200],
  warningSoftForeground: palette.amber[950],
  warningSoftBorder: palette.amber[700],
  destructiveSoft: palette.red[200],
  destructiveSoftForeground: palette.red[950],
  destructiveSoftBorder: palette.red[700],
  infoText: "#102352",
  successText: "#082C1D",
  warningText: "#3A2500",
  destructiveText: "#4E1215",
  border: "#575E6B",
  borderStrong: "#4A4F58",
  input: "#FFFFFF",
  inputForeground: "#000000",
  placeholder: "#4A4F58",
  ring: "#4C39B5",
  selection: "#7567F24D",
  selectionOnFill: "#00000026",
  overlay: "#000000A6",
  hover: "#E8E8E8",
  active: "#D6D6D6",
  selected: "#D8DBFF",
  selectedForeground: "#2E2370",
  disabled: "#E8E8E8",
  disabledForeground: "#5A5A5A",
  skeleton: "#B0B0B0",
  track: "#C6C8CD",
  scrollbar: "#9A9A9A",
  shadow: "#000000",
} satisfies ThemeColors;

/**
 * High-contrast dark roles. The same 66 roles as {@link darkColors}, with the
 * floors of {@link highContrastLightColors}. The divider is lighter than the
 * pressed fill so the edge clears the AAA divider floor on it — the generic
 * `active` wash (plan 080) and the designed neutral press step (plan 318) — and
 * the selection wash is a darker tint so white text keeps the body floor on the
 * fills a row paints (plan 081). The skeleton is a perceivable step off the
 * pressed wash (plan 094). `disabledForeground` is a mid grey because the pressed
 * wash needs 4.5:1 for an inactive label (plan 306). The accent and selected
 * fills are a lighter iris, so a selected row is perceivable on the AAA dark
 * quiet panel and popover (plan 309); `selected` sits on the accent's hover step
 * so the selection is also a step past the row's hover wash (plan 381).
 */
export const highContrastDarkColors = {
  background: "#000000",
  foreground: "#FFFFFF",
  card: "#0D0D0D",
  cardForeground: "#FFFFFF",
  popover: "#141414",
  popoverForeground: "#FFFFFF",
  primary: "#C7CBFF",
  primaryForeground: "#000000",
  primaryHover: palette.iris[100],
  primaryActive: palette.iris[50],
  primaryText: palette.iris[100],
  secondary: "#2E2E2E",
  secondaryForeground: "#FFFFFF",
  secondaryHover: "#3D3D3D",
  secondaryActive: "#4A4A4A",
  muted: "#1A1A1A",
  mutedForeground: "#E0E0E0",
  accent: "#251B5C",
  accentForeground: "#E0E3FF",
  accentHover: "#33257A",
  accentActive: "#42319F",
  destructive: "#FF9E9E",
  destructiveForeground: "#000000",
  destructiveHover: palette.red[200],
  destructiveActive: palette.red[100],
  success: "#6FE0A3",
  successForeground: "#000000",
  warning: "#FFC94D",
  warningForeground: "#000000",
  info: palette.blue[200],
  infoForeground: "#000000",
  infoSoft: palette.blue[900],
  infoSoftForeground: palette.blue[100],
  infoSoftBorder: palette.blue[400],
  successSoft: palette.green[900],
  successSoftForeground: palette.green[100],
  successSoftBorder: palette.green[400],
  warningSoft: palette.amber[900],
  warningSoftForeground: palette.amber[100],
  warningSoftBorder: palette.amber[500],
  destructiveSoft: palette.red[900],
  destructiveSoftForeground: palette.red[100],
  destructiveSoftBorder: palette.red[400],
  infoText: palette.blue[100],
  successText: palette.green[100],
  warningText: palette.amber[100],
  destructiveText: palette.red[100],
  border: "#A0A0A0",
  borderStrong: "#AAAAAA",
  input: "#0D0D0D",
  inputForeground: "#FFFFFF",
  placeholder: "#B0B0B0",
  ring: "#C7CBFF",
  selection: "#4C39B54D",
  selectionOnFill: "#FFFFFF26",
  overlay: "#FFFFFF26",
  hover: "#2E2E2E",
  active: "#3D3D3D",
  selected: "#33257A",
  selectedForeground: "#E0E3FF",
  disabled: "#2E2E2E",
  disabledForeground: "#A9A9A9",
  skeleton: "#565656",
  track: "#3A3A3A",
  scrollbar: "#8A8A8A",
  shadow: "#000000",
} satisfies ThemeColors;

const hexColor = /^#([0-9A-Fa-f]{6})(?:[0-9A-Fa-f]{2})?$/;

/**
 * True when `value` is a `#RRGGBB` or `#RRGGBBAA` colour — the only form
 * {@link alpha}, `compositeOver` and `contrastRatio` parse. GPUix accepts every
 * CSS colour form, so a named or functional colour is paintable but invisible
 * to the token maths; use this at a boundary that receives a role from storage,
 * a URL or a payload.
 *
 * @example
 * ```ts
 * isHexColor("#191D25"); // true
 * isHexColor("#7567F23D"); // true
 * isHexColor("rebeccapurple"); // false
 * ```
 */
export const isHexColor = (value: string): boolean => hexColor.test(value);

/**
 * Return `color` with an alpha channel, as an 8-digit hex colour.
 *
 * `amount` is clamped to `0…1` and rounded to the nearest byte. A 6-digit
 * `#RRGGBB` gains an alpha byte; an 8-digit `#RRGGBBAA` has its alpha replaced.
 * A `NaN` amount — a computed fraction with no value — returns the colour
 * unchanged, the same fallback as an unparseable colour. A colour the parser
 * does not recognise is returned unchanged, so a non-hex value stays solid
 * rather than becoming transparent.
 *
 * @example
 * ```ts
 * alpha("#2559D6", 0.3); // "#2559D64D"
 * ```
 */
export function alpha(color: string, amount: number): string {
  if (Number.isNaN(amount)) {
    return color;
  }
  const match = hexColor.exec(color);
  if (match === null) {
    return color;
  }
  const byte = Math.round(Math.min(Math.max(amount, 0), 1) * 255);
  const hex = byte.toString(16).padStart(2, "0");
  return `#${match[1]}${hex}`.toUpperCase();
}

/**
 * Every semantic colour role, in the order the token documentation lists them.
 * A documentation site iterates this to build colour tables against any theme
 * without an unsafe cast.
 *
 * @example
 * ```ts
 * import { colorRoles, themes } from "@gpuixui/tokens";
 *
 * const rows = colorRoles.map((role) => ({
 *   role,
 *   light: themes.light.colors[role],
 *   dark: themes.dark.colors[role],
 * }));
 * ```
 */
export const colorRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "primaryHover",
  "primaryActive",
  "primaryText",
  "secondary",
  "secondaryForeground",
  "secondaryHover",
  "secondaryActive",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "accentHover",
  "accentActive",
  "destructive",
  "destructiveForeground",
  "destructiveHover",
  "destructiveActive",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
  "infoSoft",
  "infoSoftForeground",
  "infoSoftBorder",
  "successSoft",
  "successSoftForeground",
  "successSoftBorder",
  "warningSoft",
  "warningSoftForeground",
  "warningSoftBorder",
  "destructiveSoft",
  "destructiveSoftForeground",
  "destructiveSoftBorder",
  "infoText",
  "successText",
  "warningText",
  "destructiveText",
  "border",
  "borderStrong",
  "input",
  "inputForeground",
  "placeholder",
  "ring",
  "selection",
  "selectionOnFill",
  "overlay",
  "hover",
  "active",
  "selected",
  "selectedForeground",
  "disabled",
  "disabledForeground",
  "skeleton",
  "track",
  "scrollbar",
  "shadow",
] as const satisfies readonly (keyof ThemeColors)[];
