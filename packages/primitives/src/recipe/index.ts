import type { ControlSize, TextRole } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import { elevationLevel, isTextRole, radiusStep } from "../core/theme.js";
import { stackDirection, trackCount } from "../core/layout.js";
import type {
  BoxSpec,
  GridSpec,
  StackAlign,
  StackJustify,
  StackSpec,
} from "../core/layout.js";
import type { SelectionAccent, SelectionState } from "../core/selection.js";
import {
  lineClampOf,
  paintableAspectRatio,
  paddingSides,
  progressSizeOf,
  progressToneOf,
  scrollAxis,
  textAlignOf,
  textToneOf,
} from "../core/style.js";
import type {
  ProgressSize,
  ProgressTone,
  SliderOrientation,
  SurfaceTone,
  TextAlign,
  TextTone,
} from "../core/style.js";
import type { ElevationLevel, RadiusStep, SpaceStep } from "../core/theme.js";
import { type Orientation, orientationOf } from "../core/keyboard.js";
import { selectionAccentOf } from "../core/selection.js";
import {
  buttonVariantOf,
  paintsFilledSurface,
  toggleVariantOf,
} from "../core/variants.js";
import type { ButtonVariant, ToggleVariant } from "../core/variants.js";

const BUTTON_BASE =
  "flex flex-row items-center justify-center gap-sm rounded-md type-label cursor-pointer disabled:cursor-not-allowed";

const FILLED_DISABLED =
  "disabled:bg-disabled disabled:text-disabled-foreground";
const UNFILLED_DISABLED = "disabled:opacity-50";

const BUTTON_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  primary:
    "bg-primary text-primary-foreground border-0 hover:fill-primary active:fill-primary-pressed",
  secondary:
    "bg-secondary text-secondary-foreground border border-strong hover:fill-secondary active:fill-secondary-pressed",
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

export const buttonClass = (
  variant: ButtonVariant,
  size: ControlSize,
  options: ButtonRecipeOptions = {},
): string => {
  const name = buttonVariantOf(variant);
  return cn(
    BUTTON_BASE,
    BUTTON_VARIANT[name],
    paintsFilledSurface(name) ? FILLED_DISABLED : UNFILLED_DISABLED,
    options.square === true ? BUTTON_SQUARE[size] : BUTTON_SIZE[size],
    options.fullWidth === true && "w-full",
  );
};

const FIELD_BASE =
  "flex flex-row items-center justify-start gap-sm rounded-md type-body cursor-text select-text bg-input text-input-foreground border border-border hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

const FIELD_INVALID = "aria-invalid:border-destructive";

export interface FieldRecipeOptions {
  readonly size: ControlSize;
  readonly fullWidth?: boolean;
  readonly invalid?: boolean;
}

export const fieldClass = (options: FieldRecipeOptions): string =>
  cn(
    FIELD_BASE,
    BUTTON_SIZE[options.size],
    options.invalid === true && FIELD_INVALID,
    options.fullWidth === true && "w-full",
  );

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

  primary: "text-brand",

  destructive: "text-destructiveSoftForeground",
  inherit: undefined,
};

const ALIGN_CLASS: Readonly<Record<TextAlign, string>> = {
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
  readonly align?: TextAlign;
  readonly truncate?: boolean;
  readonly clamp?: number;
  readonly selectable?: boolean;
}

export const textClass = (options: TextRecipeOptions): string => {
  const role = isTextRole(options.role) ? options.role : "body";
  const align = textAlignOf(options.align);
  const clamp = lineClampOf(options.clamp);
  return cn(
    `type-${ROLE_CLASS[role]}`,
    familyOf(role),
    TONE_CLASS[textToneOf(options.tone)],
    align === undefined ? undefined : ALIGN_CLASS[align],
    options.selectable === true ? "select-text" : "select-none",
    options.truncate === true && "whitespace-nowrap text-ellipsis",

    clamp === undefined ? undefined : `clamp-${ROLE_CLASS[role]}-${clamp}`,
  );
};

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

const directionClass = (direction: unknown): string =>
  stackDirection(direction) === "row" ? "flex-row" : "flex-col";

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

export const gridClass = (spec: GridSpec): string =>
  cn(
    "grid",
    `grid-cols-${trackCount(spec.columns)}`,
    spec.rows === undefined ? undefined : `grid-rows-${trackCount(spec.rows)}`,
    spec.gap === undefined ? undefined : `gap-${spec.gap}`,
    spec.grow === true && "flex-grow",
  );

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

const ELEVATION_SHADOW: Readonly<Record<ElevationLevel, string | undefined>> = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  overlay: undefined,
};

const elevationClass = (level: unknown): string | undefined => {
  const resolved = elevationLevel(level);
  return resolved === undefined ? undefined : ELEVATION_SHADOW[resolved];
};

const boxPaddingClass = (spec: BoxSpec): string | undefined => {
  const sides = paddingSides(spec);
  if (spec.paddingX === undefined && spec.paddingY === undefined) {
    return sides.top === undefined ? undefined : `p-${sides.top}`;
  }
  return cn(
    sides.top === undefined ? undefined : `pt-${sides.top}`,
    sides.right === undefined ? undefined : `pr-${sides.right}`,
    sides.bottom === undefined ? undefined : `pb-${sides.bottom}`,
    sides.left === undefined ? undefined : `pl-${sides.left}`,
  );
};

export const boxClass = (spec: BoxSpec): string => {
  const corner = radiusStep(spec.radius);
  return cn(
    "flex flex-col",
    SURFACE_BG[spec.tone],
    boxPaddingClass(spec),
    corner === undefined ? undefined : `rounded-${corner}`,
    spec.border === true && "border border-border",
    spec.border === true && spec.borderStyle === "dashed" && "border-dashed",
    paintableAspectRatio(spec.aspectRatio) === undefined
      ? undefined
      : `aspect-ratio-${spec.aspectRatio}`,
    elevationClass(spec.elevation),
    spec.shrink === true ? "shrink-1" : "shrink-0",
    spec.grow === true && "flex-grow",
    spec.fullWidth === true && "w-full",
    spec.fullHeight === true && "h-full",
  );
};

const TOGGLE_PAINT: Readonly<
  Record<ToggleVariant, { readonly rest: string; readonly pressed: string }>
> = {
  default: {
    rest: "text-foreground border-0 hover:bg-hover active:bg-active",
    pressed:
      "bg-accent text-accent-foreground border-0 hover:fill-accent active:fill-accent-pressed",
  },
  outline: {
    rest: "text-foreground border border-strong hover:bg-hover active:bg-active",
    pressed:
      "bg-accent text-accent-foreground border border-strong hover:fill-accent active:fill-accent-pressed",
  },
};

export const toggleClass = (
  variant: ToggleVariant,
  pressed: boolean,
  size: ControlSize,
  options: ButtonRecipeOptions = {},
): string =>
  cn(
    BUTTON_BASE,
    TOGGLE_PAINT[toggleVariantOf(variant)][pressed ? "pressed" : "rest"],

    pressed ? FILLED_DISABLED : UNFILLED_DISABLED,
    options.square === true ? BUTTON_SQUARE[size] : BUTTON_SIZE[size],
  );

export const separatorClass = (
  orientation: Orientation,
  inset?: SpaceStep,
): string => {
  const step = inset ?? "0";
  return orientationOf(orientation, "horizontal") === "horizontal"
    ? cn("h-px shrink-0 bg-border", `ml-${step}`, `mr-${step}`)
    : cn("w-px shrink-0 bg-border", `mt-${step}`, `mb-${step}`);
};

export const separatorGroupClass = "flex flex-row items-center gap-sm";

export const scrollClass = (axis: unknown): string => {
  const resolved = scrollAxis(axis);
  return resolved === "horizontal"
    ? "overflow-y-hidden overflow-x-scroll"
    : resolved === "vertical"
      ? "overflow-y-scroll overflow-x-hidden"
      : "overflow-y-scroll overflow-x-scroll";
};

export const scrollFrameClass = (spec: {
  readonly padding?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;
}): string => {
  const corner = radiusStep(spec.radius);
  return cn(
    "flex flex-col overflow-hidden",
    spec.padding === undefined ? undefined : `p-${spec.padding}`,
    corner === undefined ? undefined : `rounded-${corner}`,
    spec.border === true && "border border-border",
  );
};

export const buttonGroupClass = (
  mode: "attached" | "separated",
  gap: SpaceStep,
  orientation: "horizontal" | "vertical",
): string =>
  cn(
    "flex",
    orientation === "vertical"
      ? "flex-col items-stretch"
      : "flex-row items-center",
    mode === "attached" ? "gap-0 rounded-md overflow-hidden" : `gap-${gap}`,
  );

const FIELD_SQUARE_BASE =
  "flex flex-row items-center justify-center gap-sm rounded-md type-body text-center bg-input text-input-foreground border border-border cursor-text hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

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

export const otpGroupClass = "flex flex-row items-center gap-sm";

export const ratingStarClass = (options: {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}): string => {
  const interactive = options.disabled !== true && options.readOnly !== true;
  return cn(
    "relative flex items-center justify-center p-2xs rounded-full min-target",
    interactive ? "cursor-pointer" : "cursor-not-allowed",
    options.disabled === true && "disabled:opacity-50",
  );
};

export const ratingGroupClass = "flex flex-row items-center gap-2xs";

export const tooltipClass =
  "flex flex-col bg-popover text-popover-foreground rounded-sm border border-border pl-sm pr-sm pt-xs pb-xs type-size-caption whitespace-nowrap";

const SELECT_TRIGGER_BASE =
  "flex flex-row items-center justify-between gap-sm rounded-md type-label bg-input text-input-foreground border border-border cursor-pointer hover:border-border-strong active:border-ring disabled:opacity-50 disabled:cursor-not-allowed";

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

export const selectContentClass =
  "flex flex-col bg-popover rounded-md border border-border p-xs gap-2xs min-w-full shadow-lg";

export const selectItemRowClass =
  "flex flex-row items-center justify-between w-full";

export const selectLabelClass =
  "flex flex-row items-center pl-sm pr-sm py-2xs type-size-caption text-muted-foreground";

export const selectSeparatorClass = "h-px w-full bg-border";

export interface SelectItemPaint {
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly disabled: boolean;
}

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

export const numberFieldClass = (options: FieldRecipeOptions): string =>
  cn(fieldClass(options), "pr-0");

export const numberStepperColumnClass =
  "flex flex-col h-full shrink-0 w-stepper-column";

export const numberStepperClass = (disabled: boolean): string =>
  cn(
    "flex items-center justify-center flex-grow rounded-sm",
    disabled
      ? "cursor-not-allowed"
      : "cursor-pointer hover:bg-hover active:bg-active",
  );

export const numberInputClass = "flex-grow h-full min-w-0 px-0 border-0";

const SELECTION_ROLE: Readonly<
  Record<SelectionAccent, { readonly bg: string; readonly fg: string }>
> = {
  primary: { bg: "primary", fg: "primary-foreground" },
  destructive: { bg: "destructive", fg: "destructive-foreground" },
};

export interface SelectionRecipeInput {
  readonly size: ControlSize;
  readonly accent: SelectionAccent;
  readonly state: SelectionState;
  readonly shape?: "square" | "circle";
  readonly invalid?: boolean;
}

export const selectionBoxClass = ({
  size,
  accent,
  state,
  shape = "square",
  invalid,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  const { bg, fg } = SELECTION_ROLE[selectionAccentOf(accent)];
  return cn(
    "flex items-center justify-center shrink-0 border cursor-pointer",
    `size-icon-${size}`,
    shape === "circle" ? "rounded-full" : "rounded-sm",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    filled
      ? cn(
          `bg-${bg} border-${bg} text-${fg}`,

          `hover:fill-${bg} hover:border-transparent active:fill-${bg}-pressed active:border-transparent`,
        )
      : cn(
          invalid === true ? "border-destructive" : "border-strong",
          invalid === true ? "text-destructive" : "text-muted-foreground",
          "hover:bg-hover active:bg-active",
        ),
  );
};

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
      ? `bg-${SELECTION_ROLE[selectionAccentOf(accent)].fg}`
      : invalid === true
        ? "bg-destructive"
        : "bg-muted-foreground",
  );
};

export const switchTrackClass = ({
  size,
  accent,
  state,
  invalid,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  const { bg } = SELECTION_ROLE[selectionAccentOf(accent)];
  return cn(
    "relative flex flex-row items-center shrink-0 rounded-full border cursor-pointer",
    `switch-track-${size}`,
    "disabled:opacity-50 disabled:cursor-not-allowed",
    filled
      ? cn(
          `bg-${bg} border-${bg}`,

          `hover:fill-${bg} hover:border-transparent active:fill-${bg}-pressed active:border-transparent`,
        )
      : cn(
          "bg-muted",
          invalid === true ? "border-destructive" : "border-strong",
          "hover:bg-hover active:bg-active",
        ),
  );
};

export const switchThumbClass = ({
  size,
  accent,
  state,
}: SelectionRecipeInput): string => {
  const filled = state !== "unchecked";
  return cn(
    "absolute shrink-0 rounded-full pointer-events-none",
    `switch-thumb-${size}`,
    `size-thumb-${size}`,
    filled ? `switch-thumb-on-${size}` : undefined,
    filled
      ? `bg-${SELECTION_ROLE[selectionAccentOf(accent)].fg}`
      : "bg-foreground",
  );
};

export const sliderTrackClass = (
  size: ControlSize,
  orientation: SliderOrientation = "horizontal",
): string =>
  orientation === "vertical"
    ? cn(
        "flex flex-col items-center h-full cursor-pointer",
        `w-control-${size}`,
        `py-inset-${size}`,
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )
    : cn(
        "flex flex-row items-center w-full cursor-pointer",
        `h-${size}`,
        `px-inset-${size}`,
        "disabled:opacity-50 disabled:cursor-not-allowed",
      );

export const sliderRailClass = (
  orientation: SliderOrientation = "horizontal",
): string =>
  orientation === "vertical"
    ? "h-full w-space-xs rounded-full bg-muted flex flex-col justify-end items-center pointer-events-none"
    : "w-full h-space-xs rounded-full bg-muted flex flex-row items-center pointer-events-none";

export const sliderFillClass = (
  invalid: boolean,
  orientation: SliderOrientation = "horizontal",
): string =>
  cn(
    "shrink-0 rounded-full pointer-events-none",
    orientation === "vertical" ? "w-full" : "h-full",
    invalid ? "bg-destructive" : "bg-primary",
  );

export const sliderThumbClass = (
  size: ControlSize,
  invalid: boolean,
  orientation: SliderOrientation = "horizontal",
): string =>
  cn(
    orientation === "vertical"
      ? `slider-thumb-v-${size}`
      : `slider-thumb-${size}`,
    "shrink-0 rounded-full bg-input pointer-events-none",
    invalid ? "border-destructive" : "border-primary",
  );

const PROGRESS_HEIGHT_STEP: Readonly<Record<ProgressSize, SpaceStep>> = {
  sm: "xs",
  md: "sm",
};

export const progressTrackClass = (size: ProgressSize): string =>
  `flex flex-row w-full h-space-${PROGRESS_HEIGHT_STEP[progressSizeOf(size)]} rounded-full bg-muted overflow-hidden`;

const PROGRESS_TONE_CLASS: Readonly<Record<ProgressTone, string>> = {
  primary: "bg-primary",
  success: "bg-success",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

export const progressFillClass = (tone: ProgressTone): string =>
  cn("h-full rounded-full", PROGRESS_TONE_CLASS[progressToneOf(tone)]);

export const progressBufferClass = (tone: ProgressTone): string =>
  cn(
    "h-full shrink-0",
    progressToneOf(tone) === "muted"
      ? "bg-border-strong"
      : "bg-muted-foreground",
  );

export const spinnerGroupClass = "relative shrink-0";

export const skeletonClass = (spec: {
  readonly circle?: boolean;
  readonly radius?: RadiusStep;
}): string =>
  cn(
    "shrink-0 bg-skeleton",

    spec.circle === true
      ? "rounded-full"
      : `rounded-${radiusStep(spec.radius) ?? "sm"}`,
  );
