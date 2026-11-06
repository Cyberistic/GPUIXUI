import * as Arr from "effect/Array";
import type { StyleDesc } from "@gpuix/react";
import {
  brandText,
  filledHover,
  filledPressed,
  type FilledAction,
} from "@gpuixui/tokens";
import type { SpinnerAccent } from "./loading.js";
import { pressWash } from "./pointer.js";
import { colorRole, type PaintSource, type PrimitiveTheme } from "./theme.js";
import type { ControlVariant } from "./style.js";

export const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

const VARIANT_NAMES: ReadonlyArray<string> = BUTTON_VARIANTS;

export const isButtonVariant = (value: unknown): value is ButtonVariant =>
  typeof value === "string" && Arr.contains(VARIANT_NAMES, value);

export const buttonVariantOf = (value: unknown): ButtonVariant =>
  isButtonVariant(value) ? value : "primary";

const filled = (
  action: FilledAction,
): Pick<ControlVariant, "hover" | "active" | "filledAction"> => ({
  filledAction: action,
  hover: (theme) => ({ backgroundColor: filledHover(theme, action) }),
  active: (theme) => ({ backgroundColor: filledPressed(theme, action) }),
});

const primary: ControlVariant = {
  background: (theme) => colorRole(theme, "primary"),
  foreground: (theme) => colorRole(theme, "primaryForeground"),
  border: undefined,
  ...filled("primary"),
};

const secondary: ControlVariant = {
  background: (theme) => colorRole(theme, "secondary"),
  foreground: (theme) => colorRole(theme, "secondaryForeground"),
  border: (theme) => colorRole(theme, "borderStrong"),
  ...filled("secondary"),
};

const washed: Pick<ControlVariant, "hover" | "active"> = {
  hover: (theme) => ({ backgroundColor: colorRole(theme, "hover") }),
  active: (theme) => ({ backgroundColor: pressWash(theme) }),
};

const outline: ControlVariant = {
  background: undefined,
  foreground: (theme) => colorRole(theme, "foreground"),
  border: (theme) => colorRole(theme, "borderStrong"),
  ...washed,
};

const ghost: ControlVariant = {
  background: undefined,
  foreground: (theme) => colorRole(theme, "foreground"),
  border: undefined,
  ...washed,
};

const destructive: ControlVariant = {
  background: (theme) => colorRole(theme, "destructive"),
  foreground: (theme) => colorRole(theme, "destructiveForeground"),
  border: undefined,
  ...filled("destructive"),
};

const link: ControlVariant = {
  background: undefined,

  foreground: brandText,
  border: undefined,
  hover: (theme) => ({
    backgroundColor: colorRole(theme, "hover"),
    textDecoration: "underline",
  }),
  active: (theme) => ({ backgroundColor: pressWash(theme) }),
};

export const buttonVariants: Record<ButtonVariant, ControlVariant> = {
  primary,
  secondary,
  outline,
  ghost,
  destructive,
  link,
};

export function actionOnColor(
  theme: PrimitiveTheme,
  variant: ButtonVariant,
): string;
export function actionOnColor(
  theme: PaintSource,
  variant: ButtonVariant,
): string | undefined;
export function actionOnColor(
  theme: PaintSource,
  variant: ButtonVariant,
): string | undefined {
  return buttonVariants[buttonVariantOf(variant)].foreground(theme);
}

const FILLED_SPINNER_ACCENT: Readonly<
  Partial<Record<ButtonVariant, SpinnerAccent>>
> = {
  primary: "on-primary",
  secondary: "on-secondary",
  destructive: "on-destructive",
};

export const variantSpinnerAccent = (
  variant: ButtonVariant,
  disabled = false,
): SpinnerAccent => {
  const name = buttonVariantOf(variant);
  return disabled && paintsFilledSurface(name)
    ? "on-disabled"
    : (FILLED_SPINNER_ACCENT[name] ?? "primary");
};

export const toggleSpinnerAccent = (
  pressed: boolean,
  disabled = false,
): SpinnerAccent => {
  if (pressed) return disabled ? "on-disabled" : "on-accent";
  return "primary";
};

export const paintsFilledSurface = (variant: ButtonVariant): boolean =>
  buttonVariants[buttonVariantOf(variant)].filledAction !== undefined;

export const fieldVariant: ControlVariant = {
  background: (theme) => colorRole(theme, "input"),
  foreground: (theme) => colorRole(theme, "inputForeground"),
  border: (theme) => colorRole(theme, "border"),
  hover: (theme) => ({ borderColor: colorRole(theme, "borderStrong") }),
  active: (theme) => ({ borderColor: colorRole(theme, "ring") }),
};

export const variantTable: ReadonlyArray<{
  readonly name: ButtonVariant;
  readonly variant: ControlVariant;
  readonly description: string;
}> = [
  { name: "primary", variant: primary, description: "The brand action." },
  { name: "secondary", variant: secondary, description: "Filled, neutral." },
  { name: "outline", variant: outline, description: "Border only." },
  { name: "ghost", variant: ghost, description: "No chrome at rest." },
  {
    name: "destructive",
    variant: destructive,
    description: "Deletes, revokes, disconnects.",
  },
  { name: "link", variant: link, description: "A text action." },
];

export const TOGGLE_VARIANTS = ["default", "outline"] as const;

export type ToggleVariant = (typeof TOGGLE_VARIANTS)[number];

const TOGGLE_NAMES: ReadonlyArray<string> = TOGGLE_VARIANTS;

export const isToggleVariant = (value: unknown): value is ToggleVariant =>
  typeof value === "string" && Arr.contains(TOGGLE_NAMES, value);

export const toggleVariantOf = (value: unknown): ToggleVariant =>
  isToggleVariant(value) ? value : "default";

const toggleRest: ControlVariant = {
  background: undefined,
  foreground: (theme) => colorRole(theme, "foreground"),
  border: undefined,
  ...washed,
};

const toggleOutlineRest: ControlVariant = {
  background: undefined,
  foreground: (theme) => colorRole(theme, "foreground"),
  border: (theme) => colorRole(theme, "borderStrong"),
  ...washed,
};

const togglePressedBase = (
  border: ControlVariant["border"],
): ControlVariant => ({
  background: (theme) => colorRole(theme, "accent"),
  foreground: (theme) => colorRole(theme, "accentForeground"),
  border,

  hover: (theme) => ({ backgroundColor: filledHover(theme, "accent") }),
  active: (theme) => ({ backgroundColor: filledPressed(theme, "accent") }),
});

export const toggleVariants: Readonly<
  Record<
    ToggleVariant,
    { readonly rest: ControlVariant; readonly pressed: ControlVariant }
  >
> = {
  default: {
    rest: toggleRest,
    pressed: togglePressedBase(undefined),
  },
  outline: {
    rest: toggleOutlineRest,
    pressed: togglePressedBase((theme) => colorRole(theme, "borderStrong")),
  },
};

export const variantKey = (
  variant: ControlVariant,
  theme: PrimitiveTheme,
): string =>
  [
    variant.background === undefined ? "none" : variant.background(theme),
    variant.foreground(theme),
    variant.border === undefined ? "none" : variant.border(theme),
  ].join("/");

export const hasPointerFeedback = (
  variant: ControlVariant,
  theme: PrimitiveTheme,
): boolean => {
  const feedback = (style: StyleDesc): boolean =>
    style.backgroundColor !== undefined || style.borderColor !== undefined;
  return feedback(variant.hover(theme)) && feedback(variant.active(theme));
};
