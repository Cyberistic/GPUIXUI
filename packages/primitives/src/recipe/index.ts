/**
 * The primitives' recipes, as Tailwind class strings.
 *
 * Each builder turns a component's semantic props into the class string that,
 * compiled through {@link recipeTw}, resolves to the same `StyleDesc` the
 * pre-migration `core/style.ts` resolvers produced. The string is the single
 * source of truth for a component's resting appearance; the caller's `className`
 * is joined last so it wins conflicts exactly as `cn` resolves them.
 */

import type { ControlSize, TextRole } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import type { SpinnerAccent } from "../core/loading.js";
import type {
  BoxSpec,
  GridSpec,
  StackAlign,
  StackDirection,
  StackJustify,
  StackSpec,
} from "../core/layout.js";
import type { SelectionAccent, SelectionState } from "../core/selection.js";
import type {
  ProgressTone,
  ScrollSpec,
  SurfaceTone,
  TextTone,
} from "../core/style.js";
import type { ElevationLevel, RadiusStep, SpaceStep } from "../core/theme.js";
import type { ButtonVariant, ToggleVariant } from "../core/variants.js";

// ── Button ───────────────────────────────────────────────────────────

const BUTTON_BASE =
  "flex flex-row items-center justify-center gap-sm rounded-md type-label cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * A filled action's feedback is a **derived, opaque** fill.
 *
 * `hover:fill-primary` is the theme's own hover fill for the primary action and
 * `active:fill-primary-pressed` its press fill — both derived from the fill
 * toward the theme's foreground. The old `bg-primary/90` lifted the fill's
 * alpha, so the surface behind the control showed through and the same action
 * read as two colours on a card and on a dialog.
 */
const BUTTON_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  primary:
    "bg-primary text-primary-foreground border-0 hover:fill-primary active:fill-primary-pressed",
  secondary:
    "bg-secondary text-secondary-foreground border-0 hover:fill-secondary active:fill-secondary-pressed",
  outline:
    "text-foreground border border-strong hover:bg-hover active:bg-active",
  ghost: "text-foreground border-0 hover:bg-hover active:bg-active",
  destructive:
    "bg-destructive text-destructive-foreground border-0 hover:fill-destructive active:fill-destructive-pressed",
  link: "text-brand border-0 hover:bg-hover hover:underline active:bg-active",
};

const BUTTON_SIZE: Readonly<Record<ControlSize, string>> = {
  sm: "h-sm px-sm",
  md: "h-md px-md",
  lg: "h-lg px-lg",
};

const BUTTON_SQUARE: Readonly<Record<ControlSize, string>> = {
  sm: "size-sm px-0",
  md: "size-md px-0",
  lg: "size-lg px-0",
};

export interface ButtonRecipeOptions {
  readonly square?: boolean;
  readonly fullWidth?: boolean;
}

/** The class string a `Button` resolves from its variant, size and shape. */
export const buttonClass = (
  variant: ButtonVariant,
  size: ControlSize,
  options: ButtonRecipeOptions = {},
): string =>
  cn(
    BUTTON_BASE,
    BUTTON_VARIANT[variant],
    options.square === true ? BUTTON_SQUARE[size] : BUTTON_SIZE[size],
    options.fullWidth === true && "w-full",
  );

// ── Input ────────────────────────────────────────────────────────────

const FIELD_BASE =
  "flex flex-row items-center justify-start gap-sm rounded-md type-body cursor-text select-text bg-input text-input-foreground border border-border hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * A failed validation is an **edge**, not a fill.
 *
 * `destructive` carries `destructiveForeground`; painting it behind a field's
 * value leaves the text unreadable (`inputForeground` on it measures 2.45:1 in
 * the dark theme). The value keeps the field's own `input` fill — the pair
 * `contrastPairs` measures — and the border plus the ring say invalid.
 */
const FIELD_INVALID = "aria-invalid:border-destructive";

export interface FieldRecipeOptions {
  readonly size: ControlSize;
  readonly fullWidth?: boolean;
  readonly invalid?: boolean;
}

/** The class string a single-line field resolves from its size and state. */
export const fieldClass = (options: FieldRecipeOptions): string =>
  cn(
    FIELD_BASE,
    BUTTON_SIZE[options.size],
    options.invalid === true && FIELD_INVALID,
    options.fullWidth === true && "w-full",
  );

// ── Text ─────────────────────────────────────────────────────────────

const ROLE_CLASS: Readonly<Record<TextRole, string>> = {
  display: "display",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "body",
  bodyStrong: "body-strong",
  label: "label",
  caption: "caption",
  code: "code",
  codeBlock: "code-block",
};

const TONE_CLASS: Readonly<Record<TextTone, string | undefined>> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  // Brand text is derived from the brand, not the brand fill role: `primary`
  // carries `primaryForeground` and is measured as a surface, so written as
  // text it lands under the floor (4.30:1 on the base light `active` wash,
  // 3.10:1 in macOS dark). `text-brand` holds every surface a link sits on.
  primary: "text-brand",
  // The status text role, not the solid fill: `destructive` is a background a
  // white label sits on, and reads at 3:1 as body text. `destructiveSoftForeground`
  // is the role tokens measure as page text, so an error is legible.
  destructive: "text-destructiveSoftForeground",
  inherit: undefined,
};

const ALIGN_CLASS: Readonly<Record<"start" | "center" | "end", string>> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

const familyOf = (role: TextRole): string =>
  MONO_ROLES.includes(role) ? "font-mono" : "font-sans";

export interface TextRecipeOptions {
  readonly role: TextRole;
  readonly tone: TextTone;
  readonly align?: "start" | "center" | "end";
  readonly truncate?: boolean;
  readonly clamp?: number;
  readonly selectable?: boolean;
}

/** The class string a `Text` resolves from its role, tone and modifiers. */
export const textClass = (options: TextRecipeOptions): string =>
  cn(
    `type-${ROLE_CLASS[options.role]}`,
    familyOf(options.role),
    TONE_CLASS[options.tone],
    options.align === undefined ? undefined : ALIGN_CLASS[options.align],
    options.selectable === true ? "select-text" : "select-none",
    options.truncate === true && "whitespace-nowrap text-ellipsis",
    options.clamp === undefined ? undefined : `line-clamp-${options.clamp}`,
  );

// ── Stack ────────────────────────────────────────────────────────────

const ALIGN_TO_CLASS: Readonly<Record<StackAlign, string>> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY_TO_CLASS: Readonly<Record<StackJustify, string>> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

const directionClass = (direction: StackDirection): string =>
  direction === "row" ? "flex-row" : "flex-col";

/** The class string a `Stack` resolves from its layout spec. */
export const stackClass = (spec: StackSpec): string =>
  cn(
    "flex",
    directionClass(spec.direction),
    spec.gap === undefined ? undefined : `gap-${spec.gap}`,
    spec.align === undefined ? undefined : ALIGN_TO_CLASS[spec.align],
    spec.justify === undefined ? undefined : JUSTIFY_TO_CLASS[spec.justify],
    spec.wrap === true && "flex-wrap",
    spec.grow === true && "flex-grow",
    spec.fullWidth === true && "w-full",
    spec.fullHeight === true && "h-full",
  );

// ── Grid ─────────────────────────────────────────────────────────────

/** A spec track count clamped to the numeric grid's minimum. */
const track = (count: number): number => Math.max(1, Math.floor(count));

/** The class string a `Grid` resolves from its fixed track spec. */
export const gridClass = (spec: GridSpec): string =>
  cn(
    "grid",
    `grid-cols-${track(spec.columns)}`,
    spec.rows === undefined ? undefined : `grid-rows-${track(spec.rows)}`,
    spec.gap === undefined ? undefined : `gap-${spec.gap}`,
    spec.grow === true && "flex-grow",
  );

// ── Box ──────────────────────────────────────────────────────────────

const SURFACE_BG: Readonly<Record<SurfaceTone, string | undefined>> = {
  none: undefined,
  background: "bg-background",
  card: "bg-card",
  popover: "bg-popover",
  muted: "bg-muted",
  accent: "bg-accent",
  selected: "bg-selected",
  skeleton: "bg-skeleton",
};

/** `overlay` is a reserved, empty elevation level, so it paints no shadow. */
const ELEVATION_SHADOW: Readonly<Record<ElevationLevel, string | undefined>> = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  overlay: undefined,
};

/** The class string a `Box` resolves from its surface and layout spec. */
export const boxClass = (spec: BoxSpec): string =>
  cn(
    "flex flex-col",
    SURFACE_BG[spec.tone],
    spec.padding === undefined ? undefined : `p-${spec.padding}`,
    spec.radius === undefined ? undefined : `rounded-${spec.radius}`,
    spec.border === true && "border border-border",
    spec.elevation === undefined ? undefined : ELEVATION_SHADOW[spec.elevation],
    spec.shrink === true ? "shrink-1" : "shrink-0",
    spec.grow === true && "flex-grow",
    spec.fullWidth === true && "w-full",
    spec.fullHeight === true && "h-full",
  );

// ── Toggle ───────────────────────────────────────────────────────────

const TOGGLE_PAINT: Readonly<
  Record<ToggleVariant, { readonly rest: string; readonly pressed: string }>
> = {
  default: {
    rest: "text-foreground border-0 hover:bg-hover active:bg-active",
    pressed:
      "bg-accent text-accent-foreground border-0 hover:bg-accent/90 active:bg-accent/80",
  },
  outline: {
    rest: "text-foreground border border-strong hover:bg-hover active:bg-active",
    pressed:
      "bg-accent text-accent-foreground border border-strong hover:bg-accent/90 active:bg-accent/80",
  },
};

/** The class string a `Toggle` resolves from its variant, state and size. */
export const toggleClass = (
  variant: ToggleVariant,
  pressed: boolean,
  size: ControlSize,
  options: ButtonRecipeOptions = {},
): string =>
  cn(
    BUTTON_BASE,
    TOGGLE_PAINT[variant][pressed ? "pressed" : "rest"],
    options.square === true ? BUTTON_SQUARE[size] : BUTTON_SIZE[size],
  );

// ── Separator ────────────────────────────────────────────────────────

/** The class string a separator rule resolves from its orientation and inset. */
export const separatorClass = (
  orientation: "horizontal" | "vertical",
  inset?: SpaceStep,
): string => {
  const step = inset ?? "0";
  return orientation === "horizontal"
    ? cn("h-px shrink-0 bg-border", `ml-${step}`, `mr-${step}`)
    : cn("w-px shrink-0 bg-border", `mt-${step}`, `mb-${step}`);
};

/** The labelled separator's row: a rule, a caption, a rule. */
export const separatorGroupClass = "flex flex-row items-center gap-sm";

// ── ScrollArea ───────────────────────────────────────────────────────

/** The class string a scroll container resolves from its axis. */
export const scrollClass = (axis: ScrollSpec["axis"]): string =>
  axis === "horizontal"
    ? "overflow-y-hidden overflow-x-scroll"
    : axis === "vertical"
      ? "overflow-y-scroll overflow-x-hidden"
      : "overflow-y-scroll overflow-x-scroll";

/** The frame around a scroll area: its padding is outside the scroller. */
export const scrollFrameClass = (spec: {
  readonly padding?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;
}): string =>
  cn(
    "flex flex-col overflow-hidden",
    spec.padding === undefined ? undefined : `p-${spec.padding}`,
    spec.radius === undefined ? undefined : `rounded-${spec.radius}`,
    spec.border === true && "border border-border",
  );

// ── ButtonGroup ──────────────────────────────────────────────────────

/** The class string a button group resolves from its mode and gap. */
export const buttonGroupClass = (
  mode: "attached" | "separated",
  gap: SpaceStep,
): string =>
  mode === "attached"
    ? "flex flex-row items-center gap-0 rounded-md overflow-hidden"
    : cn("flex flex-row items-center", `gap-${gap}`);

// ── OTP field ────────────────────────────────────────────────────────

const FIELD_SQUARE_BASE =
  "flex flex-row items-center justify-center gap-sm rounded-md type-body text-center bg-input text-input-foreground border border-border cursor-text hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

/** The class string an OTP cell resolves from its size and invalid state. */
export const fieldSquareClass = (options: {
  readonly size: ControlSize;
  readonly invalid?: boolean;
}): string =>
  cn(
    FIELD_SQUARE_BASE,
    `size-${options.size}`,
    "px-0",
    options.invalid === true && FIELD_INVALID,
  );

/** The class string the OTP row resolves to. */
export const otpGroupClass = "flex flex-row items-center gap-sm";

// ── Rating ───────────────────────────────────────────────────────────

/** The class string a rating star resolves from its interactivity. */
export const ratingStarClass = (options: {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}): string => {
  const interactive = options.disabled !== true && options.readOnly !== true;
  return cn(
    // The glyph is icon-sized, so the hairline padding alone is a 20px target at
    // `md`; `min-target` reserves the pressable floor and centres the glyph.
    "flex items-center justify-center p-2xs rounded-full min-target",
    interactive ? "cursor-pointer" : "cursor-not-allowed",
    options.disabled === true && "disabled:opacity-50",
  );
};

/** The class string the rating row resolves to. */
export const ratingGroupClass = "flex flex-row items-center gap-2xs";

// ── Tooltip ──────────────────────────────────────────────────────────

/** The class string a tooltip's content surface resolves to. */
export const tooltipClass =
  "flex flex-col bg-popover rounded-sm border border-border pl-sm pr-sm pt-xs pb-xs type-size-caption whitespace-nowrap";

// ── Select ───────────────────────────────────────────────────────────

const SELECT_TRIGGER_BASE =
  "flex flex-row items-center justify-between gap-sm rounded-md type-label bg-input text-input-foreground border border-border cursor-pointer hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

/** The class string a select trigger resolves from its size and states. */
export const selectTriggerClass = (options: {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly fullWidth?: boolean;
}): string =>
  cn(
    SELECT_TRIGGER_BASE,
    BUTTON_SIZE[options.size],
    options.invalid === true && FIELD_INVALID,
    options.fullWidth === true && "w-full",
  );

/** The class string the select list's popover surface resolves to. */
export const selectContentClass =
  "flex flex-col bg-popover rounded-md border border-border p-xs gap-2xs min-w-full";

/** The row inside a select item: the label, then the selected mark at the end. */
export const selectItemRowClass =
  "flex flex-row items-center justify-between w-full";

/** A group's name: the caption role, quieter than the rows it heads. */
export const selectLabelClass =
  "flex flex-row items-center pl-sm pr-sm py-2xs type-size-caption text-muted-foreground";

/** The rule between two option groups, spanning the list. */
export const selectSeparatorClass = "h-px w-full bg-border";

/** The three states a select item paints, reported by GPUix's own Select. */
export interface SelectItemPaint {
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly disabled: boolean;
}

/** The class string a select item resolves from its reported state. */
export const selectItemClass = (state: SelectItemPaint): string =>
  cn(
    "flex flex-row items-center h-sm pl-sm pr-sm rounded-sm type-size-label",
    state.disabled === true
      ? "text-disabled-foreground cursor-not-allowed"
      : "text-popover-foreground cursor-pointer",
    state.disabled === true
      ? undefined
      : state.selected === true
        ? "bg-selected"
        : state.highlighted === true
          ? "bg-hover"
          : undefined,
  );

// ── NumberField ──────────────────────────────────────────────────────

/** The field chrome plus a zero right pad, so the stepper hugs the border. */
export const numberFieldClass = (options: FieldRecipeOptions): string =>
  cn(fieldClass(options), "pr-0");

/** The class string the spin column resolves to. */
export const numberStepperColumnClass =
  "flex flex-col h-full shrink-0 w-stepper-column";

/** The class string a step button resolves from its enabled state. */
export const numberStepperClass = (disabled: boolean): string =>
  cn(
    "flex items-center justify-center flex-grow rounded-sm",
    disabled
      ? "cursor-not-allowed"
      : "cursor-pointer hover:bg-hover active:bg-active",
  );

/** The class string the inner numeric input resolves to. */
export const numberInputClass = "flex-grow h-full min-w-0 px-0 border-0";

// ── Selection controls ───────────────────────────────────────────────

/** The two roles an accent can paint a filled selection with. */
const SELECTION_ROLE: Readonly<
  Record<SelectionAccent, { readonly bg: string; readonly fg: string }>
> = {
  primary: { bg: "primary", fg: "primary-foreground" },
  destructive: { bg: "destructive", fg: "destructive-foreground" },
};

/** The shared inputs a selection recipe resolves from. */
export interface SelectionRecipeInput {
  readonly size: ControlSize;
  readonly accent: SelectionAccent;
  readonly state: SelectionState;
  readonly shape?: "square" | "circle";
  readonly invalid?: boolean;
}

/** The class string a checkbox or radio box resolves from. */
export const selectionBoxClass = ({
  size,
  accent,
  state,
  shape = "square",
  invalid,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  const { bg, fg } = SELECTION_ROLE[accent];
  return cn(
    "flex items-center justify-center shrink-0 border cursor-pointer",
    `size-icon-${size}`,
    shape === "circle" ? "rounded-full" : "rounded-sm",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    filled
      ? cn(
          `bg-${bg} border-${bg} text-${fg}`,
          `hover:bg-${bg}/90 hover:border-${bg}/90 active:border-ring`,
        )
      : cn(
          invalid === true ? "border-destructive" : "border-input",
          invalid === true ? "text-destructive" : "text-muted-foreground",
          "hover:border-border-strong active:border-ring",
        ),
  );
};

/** The class string a checked radio's centre dot resolves to. */
export const radioDotClass = ({
  size,
  accent,
  state,
  invalid,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  return cn(
    "shrink-0 rounded-full",
    `size-dot-${size}`,
    filled
      ? `bg-${SELECTION_ROLE[accent].fg}`
      : invalid === true
        ? "bg-destructive"
        : "bg-muted-foreground",
  );
};

/** The class string a switch's track resolves from. */
export const switchTrackClass = ({
  size,
  accent,
  state,
  invalid,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  const { bg } = SELECTION_ROLE[accent];
  return cn(
    // The thumb is absolutely positioned inside this pill, so it is the
    // positioning context and its own size comes from the derived token.
    "relative flex flex-row items-center shrink-0 rounded-full border cursor-pointer",
    `switch-track-${size}`,
    "disabled:opacity-50 disabled:cursor-not-allowed",
    filled
      ? cn(
          `bg-${bg} border-${bg}`,
          `hover:bg-${bg}/90 hover:border-${bg}/90 active:border-ring`,
        )
      : cn(
          "bg-muted",
          invalid === true ? "border-destructive" : "border-input",
          "hover:border-border-strong active:border-ring",
        ),
  );
};

/** The class string a switch's thumb resolves from. */
export const switchThumbClass = ({
  size,
  accent,
  state,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  return cn(
    // `left` is the slide: the checked utility replaces the resting inset with
    // the far position, and the component animates between the two.
    "absolute shrink-0 rounded-full pointer-events-none top-2xs left-2xs",
    `size-thumb-${size}`,
    filled ? `switch-thumb-on-${size}` : undefined,
    filled ? `bg-${SELECTION_ROLE[accent].fg}` : "bg-foreground",
  );
};

// ── Slider / RangeSlider ─────────────────────────────────────────────

/** The class string a slider's hit area resolves from. */
export const sliderTrackClass = (size: ControlSize): string =>
  cn(
    "flex flex-row items-center w-full cursor-pointer",
    `h-${size}`,
    `px-inset-${size}`,
    "disabled:opacity-50 disabled:cursor-not-allowed",
  );

/** The class string a slider's rail resolves to. */
export const sliderRailClass =
  "w-full h-space-xs rounded-full bg-muted flex flex-row items-center pointer-events-none";

/** The class string a slider's filled span resolves from. */
export const sliderFillClass = (invalid: boolean): string =>
  cn(
    "h-full shrink-0 rounded-full pointer-events-none",
    invalid ? "bg-destructive" : "bg-primary",
  );

/** The class string a slider's thumb resolves from. */
export const sliderThumbClass = (size: ControlSize, invalid: boolean): string =>
  cn(
    `slider-thumb-${size}`,
    "shrink-0 rounded-full bg-input pointer-events-none",
    invalid ? "border-destructive" : "border-primary",
  );

// ── Meter / Progress ─────────────────────────────────────────────────

/** The spacing step each progress size sits at. */
const PROGRESS_HEIGHT_STEP: Readonly<Record<"sm" | "md", SpaceStep>> = {
  sm: "xs",
  md: "sm",
};

/** The class string a progress or meter track resolves from. */
export const progressTrackClass = (size: "sm" | "md"): string =>
  `w-full h-space-${PROGRESS_HEIGHT_STEP[size]} rounded-full bg-muted overflow-hidden`;

/** The colour role each progress tone paints. */
const PROGRESS_TONE_CLASS: Readonly<Record<ProgressTone, string>> = {
  primary: "bg-primary",
  success: "bg-success",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

/** The class string a progress or meter fill resolves from. */
export const progressFillClass = (tone: ProgressTone): string =>
  cn("h-full rounded-full", PROGRESS_TONE_CLASS[tone]);

// ── Spinner / Skeleton ───────────────────────────────────────────────

/** The class string a spinner's row resolves to. */
export const spinnerGroupClass = "flex flex-row items-center gap-2xs";

/** The colour role each spinner accent paints on every dot. */
const SPINNER_ACCENT_CLASS: Readonly<Record<SpinnerAccent, string>> = {
  primary: "bg-primary",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
  "on-primary": "bg-primary-foreground",
  "on-secondary": "bg-secondary-foreground",
  "on-destructive": "bg-destructive-foreground",
};

/**
 * The class string a spinner dot resolves from its accent.
 *
 * The trail fades through the dot's `opacity` rather than a second role, so an
 * indicator inside a filled control paints that fill's on-colour throughout.
 */
export const spinnerDotClass = (accent: SpinnerAccent): string =>
  cn("shrink-0 rounded-full", SPINNER_ACCENT_CLASS[accent]);

/** The class string a skeleton's resting shape resolves from. */
export const skeletonClass = (spec: {
  readonly circle?: boolean;
  readonly radius?: RadiusStep;
}): string =>
  cn(
    "shrink-0 bg-skeleton",
    spec.circle === true ? "rounded-full" : `rounded-${spec.radius ?? "sm"}`,
  );
