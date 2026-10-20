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
  StackAlign,
  StackDirection,
  StackJustify,
  StackSpec,
} from "../core/layout.js";
import type { TextTone } from "../core/style.js";
import type { ButtonVariant } from "../core/variants.js";

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
