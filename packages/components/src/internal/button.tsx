/**
 * `Button` and `IconButton`: the local stand-in for `@gpuixui/primitives`.
 *
 * GPUix has no `button` element type — the types are `div`, `text`, `img`, `svg`,
 * `canvas`, `input`, `textarea`, `anchored`, `code`, `diff`, `markdown` and
 * `virtual-list` — and `@gpuix/react@0.11.0` publishes a headless `Button`
 * (`@gpuix/react/button`) but no styled one. This package's styled contract lives
 * in `@gpuixui/primitives`' `Button`, so the stand-in stays until the Tier 2
 * parts are migrated onto it (plan 110 §7 and `TODO.md` → Interlocks). A button
 * is therefore a `div` with `role="button"`, a tab stop and Enter/Space
 * activation.
 *
 * Known gap: `@gpuix/native@0.11.0` accepts no `aria-disabled`, so a disabled
 * button conveys its state by leaving the tab order, dropping its handlers and
 * painting the disabled appearance — assistive technology sees a button that
 * does nothing.
 *
 * The disabled appearance is two mechanisms, because a fade is a property of the
 * strip behind the control: a filled action paints the neutral
 * `disabled`/`disabledForeground` pair the contrast contract measures on every
 * surface, and a ghost action keeps the measured `disabledOpacity` fade (see
 * {@link disabledStyle}).
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { activationHandlers } from "./key.js";
import {
  controlHeight,
  controlPaddingX,
  disabledAction,
  disabledOpacity,
  filledHover,
  filledPressed,
  keyboardRing,
  textStyle,
  useTheme,
  type Theme,
} from "./theme.js";

/** The five looks a control can take. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** The control heights the theme's density defines. */
export type ButtonSize = "sm" | "md" | "lg";

/** {@link Button} props. */
export interface ButtonProps extends Props {
  /** Default `"secondary"`. */
  readonly variant?: ButtonVariant;
  /** Default `"md"`. */
  readonly size?: ButtonSize;
  /** Leave the tab order, drop the handlers and dim. Never inferred. */
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

/**
 * A filled action's label is the control, so it stays at full opacity while
 * another control has keyboard focus.
 *
 * The runtime dims every other focusable element to `keyboardFocusDimOpacity`
 * (`0.4`) as a "where can Tab go" cue, and on a filled action that composites
 * the label into its own fill: 5.0–10.5:1 at rest becomes 1.3–3.2:1 on every
 * strip (`src/behaviour/button.test.tsx` measures it with
 * `keyboardDimFailures`). A ghost action has no fill to collapse into and keeps
 * the cue.
 */
const keepLabel = (): StyleDesc => ({ keyboardFocusDim: false });

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

/** One variant's fill and interaction states; its label takes {@link actionOnColor}. */
const variantStyle = (theme: Theme, value: ButtonVariant): StyleDesc => ({
  ...Match.value(value).pipe(
    Match.when("primary", () => ({
      backgroundColor: theme.colors.primary,
      // An opaque fill derived from the action role: a half-alpha fill lets the
      // surface behind the button through, so one button reads two colours.
      hover: { backgroundColor: filledHover(theme, "primary") },
      active: { backgroundColor: filledPressed(theme, "primary") },
      ...keepLabel(),
    })),
    Match.when("danger", () => ({
      backgroundColor: theme.colors.destructive,
      hover: { backgroundColor: filledHover(theme, "destructive") },
      active: { backgroundColor: filledPressed(theme, "destructive") },
      ...keepLabel(),
    })),
    Match.when("secondary", () => ({
      backgroundColor: theme.colors.secondary,
      borderWidth: theme.borderWidth.thin,
      // A control is recognised by its edge, so it paints the measured boundary
      // role: `border` is decorative and is also the `secondary` fill in both
      // shipped themes, so an outline control drew its outline in its own fill.
      borderColor: theme.colors.borderStrong,
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
      ...keepLabel(),
    })),
    Match.when("ghost", () => ({
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
    })),
    Match.exhaustive,
  ),
  color: actionOnColor(theme, value),
});

/** The control's box: type, height and padding from the theme, then its variant. */
const controlStyle = (
  theme: Theme,
  variant: ButtonVariant,
  size: ButtonSize,
): StyleDesc => ({
  ...textStyle(theme, "label"),
  ...variantStyle(theme, variant),
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing.sm,
  height: controlHeight(theme, size),
  paddingLeft: controlPaddingX(theme, size),
  paddingRight: controlPaddingX(theme, size),
  borderRadius: theme.radius.md,
});

/**
 * Click and key activation, muted when the control is disabled. A disabled
 * control keeps its own key handlers so a wrapper can still see keys bubble.
 *
 * The key half is the shared contract: Enter acts on the press, Space on the
 * release, and the Space press is swallowed so it cannot also scroll the region
 * the control sits in.
 */
const activation = (
  disabled: boolean,
  onClick: Props["onClick"],
  observe: Pick<Props, "onKeyDown" | "onKeyUp">,
): Pick<Props, "onClick" | "onKeyDown" | "onKeyUp"> =>
  disabled
    ? observe
    : {
        onClick,
        ...activationHandlers((event) => onClick?.(event), observe),
      };

/**
 * A control's look when it is disabled: out of the tab order, and unavailable in
 * a way a reader can still see.
 *
 * A **filled** action wears the neutral pair `contrastPairs` measures on every
 * surface a control sits on (`disabled` behind `disabledForeground`). A fade is
 * the wrong mechanism there: it composites the label into whatever is behind the
 * action, so the same control reads two colours on two surfaces and lands at
 * 1.47:1–1.49:1 on the card of four shipped light styles (`disabled.test.ts` in
 * `@gpuixui/tokens` measures the premise). A **ghost** action has no fill to
 * collapse into — the dim is the surface behind it — so it keeps the measured
 * fade at `disabledOpacity`.
 *
 * A disabled control must not answer the pointer either, so both paths replace
 * the hover and press fills with the resting one instead of leaving the
 * enabled control's feedback in place.
 */
const disabledStyle = (
  theme: Theme,
  variant: ButtonVariant,
  disabled: boolean,
): StyleDesc => {
  if (!disabled) return { cursor: "pointer" };
  const paint = paintsSurface(variant) ? disabledAction(theme) : undefined;
  return paint === undefined
    ? {
        opacity: disabledOpacity,
        cursor: "not-allowed",
        hover: undefined,
        active: undefined,
      }
    : {
        ...paint,
        cursor: "not-allowed",
        hover: { backgroundColor: paint.backgroundColor },
        active: { backgroundColor: paint.backgroundColor },
      };
};

/** Whether a variant paints a fill of its own; a ghost lets the surface through. */
const paintsSurface = (variant: ButtonVariant): boolean =>
  Match.value(variant).pipe(
    Match.when("primary", () => true),
    Match.when("secondary", () => true),
    Match.when("danger", () => true),
    Match.when("ghost", () => false),
    Match.exhaustive,
  );

/**
 * A labelled action. `variant` picks the look, `size` the density-defined
 * height; the caller's `style` is merged last and wins.
 */
export const Button = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  style,
  ...rest
}: ButtonProps) => {
  const theme = useTheme();

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...activation(disabled, onClick, { onKeyDown, onKeyUp })}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        {
          ...controlStyle(theme, variant, size),
          ...disabledStyle(theme, variant, disabled),
          ...keyboardRing(theme),
        },
        style,
      )}
    />
  );
};

/**
 * A square, icon-only action. The glyph is the caller's `children`; the
 * accessible name is `label`, because there is no visible text to read.
 */
export const IconButton = ({
  label,
  size = "md",
  disabled = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  style,
  ...rest
}: IconButtonProps) => {
  const theme = useTheme();
  const side = controlHeight(theme, size);

  return (
    <div
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...activation(disabled, onClick, { onKeyDown, onKeyUp })}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: side,
          height: side,
          borderRadius: theme.radius.md,
          color: theme.colors.mutedForeground,
          hover: {
            backgroundColor: theme.colors.hover,
            color: theme.colors.foreground,
          },
          active: { backgroundColor: theme.colors.active },
          // An icon action is unfilled, so the measured fade is its disabled
          // mechanism; the pointer fills go with it.
          ...disabledStyle(theme, "ghost", disabled),
          ...keyboardRing(theme),
        },
        style,
      )}
    />
  );
};
