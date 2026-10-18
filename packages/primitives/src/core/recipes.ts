/**
 * The first shadcn conformance slice: the new-york-v4 class recipes.
 *
 * The class strings live in `@gpuixui/tw` (copied verbatim from the upstream
 * registry and guarded by `upstream.test.ts`); this module is the only place a
 * primitive resolves them. Geometry, type, radius, gap and layout come from the
 * recipe exactly. The **tokens stay the single source of colour**: the field
 * keeps its `input` fill (shadcn's `bg-transparent` is a browser assumption),
 * the destructive button keeps `destructiveForeground` (not the recipe's literal
 * `text-white`), a ghost/link button gets the inherited text colour a native
 * element cannot inherit, and the runtime's lack of a default control cursor is
 * covered here.
 *
 * GPUix 0.10.0 has no `focusVisible` or `data-*` style property, so the
 * compiler returns `focus`, `invalid` and `disabled` as separate buckets; the
 * components apply them from their own state (`docs/gpuix-capabilities.md`).
 * An invalid field wins over a focused one, so a failed field keeps its error
 * cue while the caret is in it.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  BUTTON_BASE,
  BUTTON_SIZES as RECIPE_SIZES,
  BUTTON_VARIANTS as RECIPE_VARIANTS,
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_INVALID,
  classesToStyle,
  mergeTwStyle,
} from "@gpuixui/tw";
import type { ControlVariant } from "./style.js";
import type {
  ControlSize,
  PrimitiveTheme,
  RadiusStep,
  ThemeShadow,
} from "./theme.js";
import { buttonVariants, type ButtonVariant } from "./variants.js";

/** The field's own state, as the component knows it. */
export interface FieldRecipeState {
  readonly focused: boolean;
  readonly invalid: boolean;
  readonly disabled: boolean;
}

/** What an OTP cell needs from the field: its size is the recipe's height. */
export interface OtpCellSpec {
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly focused?: boolean;
}

/** What a button's recipe needs beyond the theme. */
export interface ButtonRecipeSpec {
  readonly variant: ButtonVariant;
  readonly size: ControlSize;
  /** Square: the icon sizes (`size-9` at `md`). */
  readonly square?: boolean;
  /** Overrides the recipe's `rounded-md`; an attached group supplies `none`. */
  readonly radius?: RadiusStep;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /** The component's own focus state; 0.10.0 has no `focusVisible`. */
  readonly focused?: boolean;
}

/** The shadcn size for a text button. */
const BUTTON_SIZE: Readonly<Record<ControlSize, keyof typeof RECIPE_SIZES>> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

/** The shadcn size for an icon button (`size-*`). */
const BUTTON_ICON_SIZE: Readonly<
  Record<ControlSize, keyof typeof RECIPE_SIZES>
> = {
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
};

/** Our public variant names, mapped onto the upstream cva keys. */
const BUTTON_VARIANT: Readonly<
  Record<ButtonVariant, keyof typeof RECIPE_VARIANTS>
> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  destructive: "destructive",
  link: "link",
};

/** The input recipe as shadcn composes it: base, focus and invalid. */
const FIELD_CLASSES = [INPUT_BASE, INPUT_FOCUS, INPUT_INVALID].join(" ");

/**
 * The theme's paint for a field, layered over the recipe's geometry.
 *
 * `hover`/`active` are this package's boundary feedback: shadcn leaves them to
 * the browser's defaults, while every pointer-interactive control here declares
 * them (`runtime/pointer-feedback.runtime.test.tsx`).
 */
const fieldPaint = (theme: PrimitiveTheme, disabled: boolean): StyleDesc => ({
  backgroundColor: theme.colors.input,
  color: theme.colors.inputForeground,
  cursor: disabled ? "not-allowed" : "text",
  userSelect: "text",
  hover: { borderColor: theme.colors.borderStrong },
  active: { borderColor: theme.colors.ring },
});

/** A control that cannot act declares no pointer feedback (plan 361's rule). */
const inert = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: undefined,
  active: undefined,
});

/** A field's chrome: the new-york-v4 recipe plus the token paint and states. */
export const fieldRecipeStyle = (
  { focused, invalid, disabled }: FieldRecipeState,
  theme: PrimitiveTheme,
): StyleDesc => {
  const recipe = classesToStyle(FIELD_CLASSES, theme);
  const base = mergeTwStyle(recipe.style, fieldPaint(theme, disabled));
  const withFocus =
    focused && !disabled ? mergeTwStyle(base, recipe.focus) : base;
  const withInvalid = invalid
    ? mergeTwStyle(withFocus, recipe.invalid)
    : withFocus;
  return disabled
    ? inert(mergeTwStyle(withInvalid, recipe.disabled))
    : withInvalid;
};

/**
 * The layout a field-shaped row adds over the recipe's flat box.
 *
 * A native `<input>`/`<textarea>` is the field; a `Select` trigger and a
 * `NumberField` are rows that carry the field's chrome, so they need the row
 * layout the browser would have given them.
 */
export const fieldRowStyle: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  minWidth: 0,
};

/**
 * A square field: an OTP digit.
 *
 * The recipe is a full-width field; a cell is as wide as it is high, with no
 * horizontal padding, and centres its character. shadcn's `input-otp` slot is
 * `size-9`, which is the same `h-9` the field recipe already resolves.
 */
export const squareFieldRecipeStyle = (
  state: FieldRecipeState,
  theme: PrimitiveTheme,
): StyleDesc => {
  const base = fieldRecipeStyle(state, theme);
  return typeof base.height === "number"
    ? {
        ...base,
        width: base.height,
        minWidth: base.height,
        paddingLeft: 0,
        paddingRight: 0,
        justifyContent: "center",
        textAlign: "center",
      }
    : base;
};

/** One OTP cell: a square field whose digit is centred. */
export const otpCellStyle = (
  spec: OtpCellSpec,
  theme: PrimitiveTheme,
): StyleDesc =>
  squareFieldRecipeStyle(
    {
      focused: spec.focused === true,
      invalid: spec.invalid === true,
      disabled: spec.disabled === true,
    },
    theme,
  );

/**
 * The ring a field's focus bucket paints.
 *
 * Exported so the tests (and any consumer painting the same ring inside a clip)
 * read the recipe's own shape rather than restating `ring-[3px] ring-ring/50`.
 */
export const fieldRecipeRing = (
  theme: PrimitiveTheme,
): ThemeShadow | undefined =>
  classesToStyle(FIELD_CLASSES, theme).focus.boxShadow;

/** The paint a variant contributes over the recipe's shape. */
const variantPaint = (
  variant: ControlVariant,
  theme: PrimitiveTheme,
  disabled: boolean,
): StyleDesc => ({
  color: variant.foreground(theme),
  ...(variant.border === undefined
    ? {}
    : { borderColor: variant.border(theme) }),
  // The recipe has no `active:` state; the package's press feedback is the
  // variant's own, so a filled button still answers a press.
  active: variant.active(theme),
  cursor: disabled ? "not-allowed" : "pointer",
});

/**
 * A button's chrome: base + size + variant from the cva table, over the theme's
 * semantic paint.
 */
export const buttonRecipeStyle = (
  {
    variant,
    size,
    square,
    radius,
    fullWidth,
    disabled,
    focused,
  }: ButtonRecipeSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const sizeKey = square === true ? BUTTON_ICON_SIZE[size] : BUTTON_SIZE[size];
  const recipe = classesToStyle(
    [
      BUTTON_BASE,
      RECIPE_SIZES[sizeKey],
      RECIPE_VARIANTS[BUTTON_VARIANT[variant]],
    ].join(" "),
    theme,
  );
  const base = mergeTwStyle(recipe.style, {
    ...variantPaint(buttonVariants[variant], theme, disabled === true),
    // A button's label is chrome: the runtime's root default is selectable
    // and only an explicit `"none"` opts out (measured, plan `386`).
    userSelect: "none" as const,
  });
  const resolved =
    radius === undefined
      ? base
      : { ...base, borderRadius: theme.radius[radius] };
  const sized =
    fullWidth === true ? { ...resolved, width: "100%" as const } : resolved;
  if (disabled === true) return inert(mergeTwStyle(sized, recipe.disabled));
  return focused === true ? mergeTwStyle(sized, recipe.focus) : sized;
};

/**
 * The ring a button's focus bucket paints.
 *
 * A `ButtonGroup` clips its surface, so a focused button's outer shadow is cut
 * away and the group paints the same ring inset instead (plan `344`). The shape
 * must be the recipe's, or a button would look different inside and outside a
 * group.
 */
export const buttonRecipeRing = (
  theme: PrimitiveTheme,
): ThemeShadow | undefined =>
  classesToStyle(BUTTON_BASE, theme).focus.boxShadow;
