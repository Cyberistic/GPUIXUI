/**
 * The variant registry: one table per family of control.
 *
 * This is the single source of truth for what `variant="primary"` means. A
 * Button, a ButtonGroup and a docs page all read the same table, so a variant
 * cannot mean one thing in the library and another in its documentation.
 *
 * A variant references **theme roles**, never colours: `(theme) =>
 * theme.colors.primary`. A colour the theme does not ship is derived from a
 * role instead — a link paints `brandText`, the brand moved until it reads as
 * text. A filled action's feedback is derived the same way: `filledHover` and
 * `filledPressed` move the fill toward the theme's foreground and keep it
 * **opaque**, so one action reads as one colour on every surface. Resolution
 * happens in `style.ts`.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  brandText,
  filledHover,
  filledPressed,
  type FilledAction,
} from "@gpuixui/tokens";
import type { SpinnerAccent } from "./loading.js";
import { pressWash } from "./pointer.js";
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

/**
 * Hover and press for a control whose fill is a solid action role.
 *
 * The fill is **derived**, not lifted: `filledHover` / `filledPressed` move it
 * toward the theme's foreground and keep it opaque. A half-alpha lift
 * (`alpha(primary, 0.9)`) let the surface behind the control through, so the
 * same action read as two colours on a card and on a dialog — and a
 * translucent fill cannot be measured for label contrast at all.
 *
 * The action is also what marks the variant as a **filled action**, which is
 * the split the disabled paint reads: a filled action wears the neutral pair, a
 * field or an unfilled control fades (`core/style.ts`).
 */
const filled = (
  action: FilledAction,
): Pick<ControlVariant, "hover" | "active" | "filledAction"> => ({
  filledAction: action,
  hover: (theme) => ({ backgroundColor: filledHover(theme, action) }),
  active: (theme) => ({ backgroundColor: filledPressed(theme, action) }),
});

/**
 * Filled: the brand action. One per view is the rule, not a constraint the
 * component can enforce — but only one variant paints the primary role.
 */
const primary: ControlVariant = {
  background: (theme) => theme.colors.primary,
  foreground: (theme) => theme.colors.primaryForeground,
  border: undefined,
  ...filled("primary"),
};

/**
 * Filled, neutral: the second most important action in a view.
 *
 * The fill alone is not a surface: `secondary` measures under the 1.05:1
 * perceptibility floor against a row's `hover`, `active`, `accent` and
 * `selected` washes in most shipped styles, so a tonal action in a list row's
 * trailing slot was a label with no button around it. The edge is
 * `borderStrong` — the role `contrastPairs` holds to the 3:1 boundary floor —
 * which is what the components package adds to the same action.
 */
const secondary: ControlVariant = {
  background: (theme) => theme.colors.secondary,
  foreground: (theme) => theme.colors.secondaryForeground,
  border: (theme) => theme.colors.borderStrong,
  ...filled("secondary"),
};

/**
 * Hover and press for a control that paints no fill at rest.
 *
 * The hover is the wash on the strip the control rests on. The press is
 * **derived**: it replaces that hover, so it is measured against the wash the
 * control is already wearing rather than against the strip — and the raw
 * `active` role could not be seen against the hover in every shipped style
 * (`core/pointer.ts`).
 */
const washed: Pick<ControlVariant, "hover" | "active"> = {
  hover: (theme) => ({ backgroundColor: theme.colors.hover }),
  active: (theme) => ({ backgroundColor: pressWash(theme) }),
};

/**
 * Border only: reads as a button on a surface without competing for weight.
 *
 * The edge is `borderStrong`, the role `contrastPairs` holds to the 3:1
 * boundary floor on every strip a control sits on; the decorative `border` role
 * is for dividers and card edges, where a control's shape is not a requirement.
 */
const outline: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.foreground,
  border: (theme) => theme.colors.borderStrong,
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
  ...filled("destructive"),
};

/** A text action: underlines on hover instead of painting a filled surface. */
const link: ControlVariant = {
  background: undefined,
  // The brand as *text*, not the `primary` fill role: it carries
  // `primaryForeground` and no contract measures it on the page.
  foreground: brandText,
  border: undefined,
  hover: (theme) => ({
    backgroundColor: theme.colors.hover,
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

/**
 * The role a variant paints its label in: the on-colour of the fill it owns.
 *
 * A glyph inside an action is the control's label drawn in vectors, not a mark
 * with a colour of its own, so it takes the same role. Any other choice names a
 * colour picked for a different fill — `secondaryForeground` on a `primary` fill
 * measures 1.42:1 in Windows dark, and a chevron painted that way is invisible.
 *
 * Read from the variant table, so a variant added there answers here without a
 * second list, and a layer painted over an action (a busy loader, a chevron or
 * an effect's wash) tints in the role the action's own label paints.
 */
export const actionOnColor = (
  theme: PrimitiveTheme,
  variant: ButtonVariant,
): string => buttonVariants[variant].foreground(theme);

const FILLED_SPINNER_ACCENT: Readonly<
  Partial<Record<ButtonVariant, SpinnerAccent>>
> = {
  primary: "on-primary",
  secondary: "on-secondary",
  destructive: "on-destructive",
};

/**
 * The spinner accent that reads on a button variant's fill.
 *
 * A filled action paints its own on-colour, which the contrast table already
 * measures on that fill; a variant that paints no fill keeps the brand accent,
 * which the mark contract measures on the page. A busy brand button used to
 * paint a brand spinner on a brand fill (1.00:1).
 *
 * A **disabled** filled action paints the neutral pair rather than its fill
 * (`core/style.ts`), so its spinner takes `on-disabled` — `disabledForeground`
 * — instead of the action's on-colour, which would be the fill's text colour on
 * a fill that is no longer there.
 */
export const variantSpinnerAccent = (
  variant: ButtonVariant,
  disabled = false,
): SpinnerAccent =>
  disabled && paintsFilledSurface(variant)
    ? "on-disabled"
    : (FILLED_SPINNER_ACCENT[variant] ?? "primary");

/**
 * The spinner accent that reads on a toggle's current face.
 *
 * A pressed toggle paints the `accent` role, so its busy dots must take the
 * accent's own on-colour — a brand dot on the pressed face is the same
 * 1.00:1-class defect the filled button had. A **disabled pressed** toggle wears
 * the neutral disabled pair instead of the accent, so its dots move to
 * `on-disabled`; an unpressed toggle has no fill to be measured on and keeps the
 * brand accent, faded with the rest of the control.
 */
export const toggleSpinnerAccent = (
  pressed: boolean,
  disabled = false,
): SpinnerAccent => {
  if (pressed) return disabled ? "on-disabled" : "on-accent";
  return "primary";
};

/**
 * Whether a variant paints a fill behind its label.
 *
 * The runtime dims every other focusable element to 40% while one control has
 * keyboard focus (`keyboardFocusDimOpacity`), which on a filled action
 * composites the label into its own fill: measured at 5.0–10.5:1 at rest and
 * 1.3–3.2:1 when dimmed (`keyboardDimFailures`). Those variants opt out with
 * `keyboardFocusDim: false`; an `outline`, `ghost` or `link` action has no fill
 * to collapse into and keeps the where-can-Tab-go cue.
 *
 * Read from the variant table rather than a second list, so a new filled
 * variant inherits the rule.
 */
export const paintsFilledSurface = (variant: ButtonVariant): boolean =>
  buttonVariants[variant].filledAction !== undefined;

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

export const TOGGLE_VARIANTS = ["default", "outline"] as const;

export type ToggleVariant = (typeof TOGGLE_VARIANTS)[number];

/** No chrome at rest; the accent fill is what says "this mode is on". */
const toggleRest: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.foreground,
  border: undefined,
  ...washed,
};

/** Border only at rest, so a toggle reads as a control in a toolbar. */
const toggleOutlineRest: ControlVariant = {
  background: undefined,
  foreground: (theme) => theme.colors.foreground,
  border: (theme) => theme.colors.borderStrong,
  ...washed,
};

/** The accent role is the theme's "selected surface", so it marks a pressed mode. */
const togglePressedBase = (
  border: ControlVariant["border"],
): ControlVariant => ({
  background: (theme) => theme.colors.accent,
  foreground: (theme) => theme.colors.accentForeground,
  border,
  // A pressed toggle is a filled face, so its feedback is the theme's derived
  // accent fill — opaque, and clamped where the label would lose its floor. The
  // half-alpha lift it used showed the surface behind the mode.
  hover: (theme) => ({ backgroundColor: filledHover(theme, "accent") }),
  active: (theme) => ({ backgroundColor: filledPressed(theme, "accent") }),
});

/**
 * A toggle's two paints: at rest, and while pressed.
 *
 * Kept as data so the docs table and the component read one table, exactly like
 * `buttonVariants`.
 */
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
    pressed: togglePressedBase((theme) => theme.colors.borderStrong),
  },
};

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
