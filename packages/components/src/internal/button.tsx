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
 * dimming — assistive technology sees a button that does nothing.
 */

import type { KeyEvent, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { isActivation } from "./key.js";
import {
  controlHeight,
  controlPaddingX,
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

/** One variant's fill, text colour and interaction states. */
const variantStyle = (theme: Theme, value: ButtonVariant): StyleDesc =>
  Match.value(value).pipe(
    Match.when("primary", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
      // An opaque fill derived from the action role: a half-alpha fill lets the
      // surface behind the button through, so one button reads two colours.
      hover: { backgroundColor: filledHover(theme, "primary") },
      active: { backgroundColor: filledPressed(theme, "primary") },
      ...keepLabel(),
    })),
    Match.when("danger", () => ({
      backgroundColor: theme.colors.destructive,
      color: theme.colors.destructiveForeground,
      hover: { backgroundColor: filledHover(theme, "destructive") },
      active: { backgroundColor: filledPressed(theme, "destructive") },
      ...keepLabel(),
    })),
    Match.when("secondary", () => ({
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
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
      color: theme.colors.foreground,
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
    })),
    Match.exhaustive,
  );

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
 * control keeps its own `onKeyDown` so a wrapper can still see keys bubble.
 */
const activation = (
  disabled: boolean,
  onClick: Props["onClick"],
  onKeyDown: Props["onKeyDown"],
): Pick<Props, "onClick" | "onKeyDown"> =>
  disabled
    ? { onClick: undefined, onKeyDown }
    : {
        onClick,
        onKeyDown: (event: KeyEvent) => {
          if (isActivation(event)) onClick?.(event);
          onKeyDown?.(event);
        },
      };

/** A control's look when it is disabled: dimmed, and out of the tab order. */
const disabledStyle = (disabled: boolean): StyleDesc => ({
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

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
      {...activation(disabled, onClick, onKeyDown)}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        {
          ...controlStyle(theme, variant, size),
          ...disabledStyle(disabled),
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
      {...activation(disabled, onClick, onKeyDown)}
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
      ...keepLabel(),
          ...disabledStyle(disabled),
          ...keyboardRing(theme),
        },
        style,
      )}
    />
  );
};
