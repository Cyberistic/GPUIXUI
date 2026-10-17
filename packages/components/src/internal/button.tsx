/**
 * `Button` and `IconButton`: the local stand-in for `@gpuixui/primitives`.
 *
 * GPUix has no `button` element type — the types are `div`, `text`, `img`, `svg`,
 * `canvas`, `input`, `textarea`, `anchored`, `code`, `diff`, `markdown` and
 * `virtual-list` — and `@gpuix/react@0.10.0` ships neither `Button` nor
 * `buttonProps`. A button is therefore a `div` with `role="button"`, a tab stop
 * and Enter/Space activation, which is what a newer `@gpuix/react` does upstream.
 *
 * Both exports are replaced by `@gpuixui/primitives`' own the moment that package
 * lands; plan 110 §7 has the amendment and `TODO.md` → Interlocks the record.
 *
 * Known gap: `@gpuix/native@0.10.0` accepts no `aria-disabled`, so a disabled
 * button conveys its state by leaving the tab order, dropping its handlers and
 * dimming — assistive technology sees a button that does nothing.
 */

import type { EventPayload, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { useState } from "react";
import { isActivation } from "./key.js";
import {
  controlHeight,
  controlPaddingX,
  focusRing,
  textStyle,
  useTheme,
  withAlpha,
  type Theme,
} from "./theme.js";

/** How much of the control's own fill a filled variant keeps on hover. */
const HOVER_ALPHA = "80";

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

/** One variant's fill, text colour and interaction states. */
const variantStyle = (theme: Theme, value: ButtonVariant): StyleDesc =>
  Match.value(value).pipe(
    Match.when("primary", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
      // Tokens ship no `primaryHover`; a half-alpha fill is the closest honest
      // step, and the interlock records the missing role.
      hover: { backgroundColor: withAlpha(theme.colors.primary, HOVER_ALPHA) },
    })),
    Match.when("danger", () => ({
      backgroundColor: theme.colors.destructive,
      color: theme.colors.destructiveForeground,
      hover: {
        backgroundColor: withAlpha(theme.colors.destructive, HOVER_ALPHA),
      },
    })),
    Match.when("secondary", () => ({
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
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
        onKeyDown: (event: EventPayload) => {
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
  const [focused, setFocused] = useState(false);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...activation(disabled, onClick, onKeyDown)}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          ...controlStyle(theme, variant, size),
          ...disabledStyle(disabled),
          ...(focused ? focusRing(theme) : {}),
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
  const [focused, setFocused] = useState(false);
  const side = controlHeight(theme, size);

  return (
    <div
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...activation(disabled, onClick, onKeyDown)}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
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
          ...disabledStyle(disabled),
          ...(focused ? focusRing(theme) : {}),
        },
        style,
      )}
    />
  );
};
