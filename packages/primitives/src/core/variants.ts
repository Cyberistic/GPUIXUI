/**
 * The variant registry: one table per family of control.
 *
 * This is the single source of truth for what `variant="primary"` means. A
 * Button, a ButtonGroup and a docs page all read the same table, so a variant
 * cannot mean one thing in the library and another in its documentation.
 *
 * A variant references **theme roles**, never colours: `(theme) =>
 * theme.colors.primary`. Interaction feedback lifts the fill's alpha
 * (`alpha(primary, 0.9)`), the way a filled action shows a press without a
 * second palette entry. Resolution happens in `style.ts`.
 */

import type { StyleDesc } from "@gpuix/react";
import { alpha } from "@gpuixui/tokens";
import type { PrimitiveTheme } from "./theme.js";
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

/** Hover and press for a control whose fill is a solid role. */
const filled = (
  color: (theme: PrimitiveTheme) => string,
): Pick<ControlVariant, "hover" | "active"> => ({
  hover: (theme) => ({ backgroundColor: alpha(color(theme), 0.9) }),
  active: (theme) => ({ backgroundColor: alpha(color(theme), 0.8) }),
});

/**
 * Filled: the brand action. One per view is the rule, not a constraint the
 * component can enforce — but only one variant paints the primary role.
 */
const primary: ControlVariant = {
  background: (theme) => theme.colors.primary,
  foreground: (theme) => theme.colors.primaryForeground,
  border: undefined,
  ...filled((theme) => theme.colors.primary),
};

/** Filled, neutral: the second most important action in a view. */
const secondary: ControlVariant = {
  background: (theme) => theme.colors.secondary,
  foreground: (theme) => theme.colors.secondaryForeground,
  border: undefined,
  ...filled((theme) => theme.colors.secondary),
};

/** Hover and press for a control that paints no fill at rest. */
const washed: Pick<ControlVariant, "hover" | "active"> = {
  hover: (theme) => ({ backgroundColor: theme.colors.hover }),
  active: (theme) => ({ backgroundColor: theme.colors.active }),
};

/** Border only: reads as a button on a surface without competing for weight. */
const outline: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.foreground,
  border: (theme) => theme.colors.border,
  ...washed,
};

/** No chrome at rest: for toolbars and dense rows. */
const ghost: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.foreground,
  border: undefined,
  ...washed,
};

/** Destructive: deletes, revokes, disconnects. Never the default action. */
const destructive: ControlVariant = {
  background: (theme) => theme.colors.destructive,
  foreground: (theme) => theme.colors.destructiveForeground,
  border: undefined,
  ...filled((theme) => theme.colors.destructive),
};

/** A text action: underlines on hover instead of painting a filled surface. */
const link: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.primary,
  border: undefined,
  hover: (theme) => ({
    backgroundColor: theme.colors.hover,
    textDecoration: "underline",
  }),
  active: (theme) => ({ backgroundColor: theme.colors.active }),
};

export const buttonVariants: Record<ButtonVariant, ControlVariant> = {
  primary,
  secondary,
  outline,
  ghost,
  destructive,
  link,
};

/**
 * A field: an input, a textarea, a select trigger.
 *
 * It shares the control metrics with a button but not its variants — a field
 * has one appearance, and only `invalid` changes it.
 */
export const fieldVariant: ControlVariant = {
  background: (theme) => theme.colors.input,
  foreground: (theme) => theme.colors.inputForeground,
  border: (theme) => theme.colors.border,
  hover: (theme) => ({ borderColor: theme.colors.borderStrong }),
  active: (theme) => ({ borderColor: theme.colors.ring }),
};

/** The live variant table, so a docs page can enumerate every variant. */
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

/** A variant's resting paint, as a string a test or a docs table can compare. */
export const variantKey = (
  variant: ControlVariant,
  theme: PrimitiveTheme,
): string =>
  [
    variant.background === undefined ? "none" : variant.background(theme),
    variant.foreground(theme),
    variant.border === undefined ? "none" : variant.border(theme),
  ].join("/");

/** Whether a variant declares any pointer feedback at all. */
export const hasPointerFeedback = (
  variant: ControlVariant,
  theme: PrimitiveTheme,
): boolean => {
  const feedback = (style: StyleDesc): boolean =>
    style.backgroundColor !== undefined || style.borderColor !== undefined;
  return feedback(variant.hover(theme)) && feedback(variant.active(theme));
};
