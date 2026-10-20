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
import type {
  BoxSpec,
  GridSpec,
  StackAlign,
  StackDirection,
  StackJustify,
  StackSpec,
} from "../core/layout.js";
import type { ScrollSpec, SurfaceTone, TextTone } from "../core/style.js";
import type { ElevationLevel, SpaceStep } from "../core/theme.js";
import type { ButtonVariant, ToggleVariant } from "../core/variants.js";

// ── Button ───────────────────────────────────────────────────────────

const BUTTON_BASE =
  "flex flex-row items-center justify-center gap-sm rounded-md type-label cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  primary:
    "bg-primary text-primary-foreground border-0 hover:bg-primary/90 active:bg-primary/80",
  secondary:
    "bg-secondary text-secondary-foreground border-0 hover:bg-secondary/90 active:bg-secondary/80",
  outline:
    "text-foreground border border-border hover:bg-hover active:bg-active",
  ghost: "text-foreground border-0 hover:bg-hover active:bg-active",
  destructive:
    "bg-destructive text-destructive-foreground border-0 hover:bg-destructive/90 active:bg-destructive/80",
  link: "text-primary border-0 hover:bg-hover hover:underline active:bg-active",
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

const FIELD_INVALID =
  "aria-invalid:bg-destructive aria-invalid:border-destructive";

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
  primary: "text-primary",
  destructive: "text-destructive",
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
    rest: "text-foreground border border-border hover:bg-hover active:bg-active",
    pressed:
      "bg-accent text-accent-foreground border border-border hover:bg-accent/90 active:bg-accent/80",
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
    "flex items-center justify-center p-2xs rounded-full",
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
