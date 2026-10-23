/**
 * `Button` and `IconButton`: this package's names for the one styled action.
 *
 * The paint and the disabled mechanism are `@gpuixui/primitives`' — a `div`
 * with `role="button"`, the derived opaque pointer fills, the measured
 * `disabled` pair on a filled look and the fade on an unfilled one. A second
 * paint here would be a second place for every one of those to drift (plan
 * 160); this file translates this package's public names onto it, so the 21
 * call sites keep their props.
 *
 * Four translations are load-bearing:
 *
 * - `danger` is the token palette's `destructive`, and this package's `secondary`
 *   carries a `borderStrong` edge — the role `contrastPairs` holds to the 3:1 a
 *   control's boundary needs. The primitive's `secondary` recipe paints
 *   `border border-strong` as well; the class below is this package's copy of
 *   that measured role, held to the recipe by `button-edge.test.ts`.
 * - A caller's `aria-label` is the primitive's `label`, which is the accessible
 *   name it announces in place of the text children.
 * - An `IconButton` is a square ghost action: its glyph is the `icon` slot and
 *   its `label` is required, because an icon-only control has no text to read.
 *   The glyph tint is the `mutedForeground` role at rest (the `foreground` role
 *   under the pointer), which the recipe does not paint.
 * - The primitive owns the activation contract for both routes: a click and an
 *   activating key reach `onActivate`, and the caller's key handlers run after
 *   it — the order this package's triggers were written against (a menu trigger
 *   records the row its surface must focus in `onKeyDown`, which the action
 *   must not clear). Nothing here may install a second one; see
 *   `button-activation.test.ts`.
 */

import type { Props } from "@gpuix/react";
import {
  Button as PrimitiveButton,
  IconButton as PrimitiveIconButton,
} from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import type { Theme } from "./theme.js";

/** The four looks a control can take. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** The control heights the theme's density defines. */
export type ButtonSize = "sm" | "md" | "lg";

/** {@link Button} props. */
export interface ButtonProps extends Props {
  /** Default `"secondary"`. */
  readonly variant?: ButtonVariant;
  /** Default `"md"`. */
  readonly size?: ButtonSize;
  /** Leave the tab order, drop the handlers and paint the disabled state. */
  readonly disabled?: boolean;
}

/** {@link IconButton} props. */
export interface IconButtonProps extends Props {
  /** The accessible name: an icon-only control shows no visible text. */
  readonly label: string;
  /** Default `"md"`. */
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
}

/** This package's look in the primitive's vocabulary. */
const PRIMITIVE_VARIANT: Readonly<
  Record<ButtonVariant, "primary" | "secondary" | "ghost" | "destructive">
> = {
  primary: "primary",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
};

/**
 * The classes a look carries besides the primitive's recipe.
 *
 * `secondary` is the one action with an edge. The primitive's recipe paints
 * `border border-strong` already; the copy here keeps this package's action on
 * the same measured role if that recipe line moves. `button-edge.test.ts`
 * requires both painters to name it, so the copy cannot become the only one
 * without a reader seeing the recipe change.
 */
const VARIANT_CLASS: Readonly<Record<ButtonVariant, string>> = {
  primary: "",
  secondary: "border border-strong",
  ghost: "",
  danger: "",
};

/**
 * The role a variant paints its label in: the on-colour of the fill it owns.
 *
 * A glyph inside an action is the control's label drawn in vectors, not a mark
 * with a colour of its own, so it takes the same role. Any other choice names a
 * colour picked for a different fill — `secondaryForeground` on a `primary` fill
 * measures 1.42:1 in Windows dark, and a chevron painted that way is invisible.
 */
export const actionOnColor = (theme: Theme, variant: ButtonVariant): string =>
  Match.value(variant).pipe(
    Match.when("primary", () => theme.colors.primaryForeground),
    Match.when("danger", () => theme.colors.destructiveForeground),
    Match.when("secondary", () => theme.colors.secondaryForeground),
    Match.when("ghost", () => theme.colors.foreground),
    Match.exhaustive,
  );

/**
 * A labelled action. `variant` picks the look, `size` the density-defined
 * height; the caller's `style` is resolved against the live state and merged
 * last, so it wins.
 */
export const Button = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  onClick,
  style,
  "aria-label": ariaLabel,
  ...rest
}: ButtonProps) => (
  <PrimitiveButton
    {...rest}
    variant={PRIMITIVE_VARIANT[variant]}
    size={size}
    disabled={disabled}
    label={ariaLabel}
    className={cn(VARIANT_CLASS[variant])}
    onActivate={onClick}
    style={style}
  />
);

/**
 * A square, icon-only action. The glyph is the caller's `children`; the
 * accessible name is `label`, because there is no visible text to read.
 */
export const IconButton = ({
  label,
  size = "md",
  disabled = false,
  onClick,
  style,
  children,
  ...rest
}: IconButtonProps) => (
  <PrimitiveIconButton
    {...rest}
    icon={children}
    variant="ghost"
    size={size}
    disabled={disabled}
    label={label}
    className="text-muted-foreground hover:text-foreground"
    onActivate={onClick}
    style={style}
  />
);
