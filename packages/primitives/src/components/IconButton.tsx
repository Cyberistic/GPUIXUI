/**
 * `IconButton` — an icon-only action that must be named.
 *
 * A `Button` with `square` already paints an icon-only action, but nothing in
 * its API stops a caller from shipping the glyph with no `label`: the control
 * is then announced as an unnamed button, and there is no text child to fall
 * back on. This narrows that API instead of duplicating the paint — the name is
 * required, the glyph has its own `icon` slot, and the shape is always square.
 *
 * Everything else is `Button`'s contract, because a second implementation would
 * be a second place for the keyboard rules to drift: Enter activates on key
 * down, Space on key up, a held key is ignored, and a busy or disabled control
 * refuses activation. Focus is the keyboard-only outline `Button` declares at
 * rest, and the caller's `style` is resolved against the button's live state and
 * merged last.
 *
 * Ghost is the default variant: a toolbar of icon actions reads as chrome, not
 * as a row of filled buttons. Pass `variant` when one action should carry more
 * weight.
 */

import type { ReactElement, ReactNode } from "react";
import type { StateStyle } from "@gpuix/react/floating";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ButtonVariant } from "../core/variants.js";
import {
  renderButton,
  type ButtonFocus,
  type ButtonProps,
  type ButtonState,
} from "./Button.js";
import { useFocus, type InteractionProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface IconButtonProps extends InteractionProps {
  /** The accessible name. An icon-only control has no text to read. */
  readonly label: string;
  /** The glyph. It paints inside the button and never becomes its name. */
  readonly icon: ReactNode;
  /** Defaults to `ghost`; a toolbar of these stays quiet. */
  readonly variant?: ButtonVariant;
  /** Defaults to `md`. Both sides of the square come from the density. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Busy: shows a spinner and blocks activation, but stays focusable. */
  readonly loading?: boolean;
  /** Holds the busy spinner's lit dot, for a reader who asked for no motion. */
  readonly reducedMotion?: boolean;
  /** Called for a click or an activating key. Not called while busy or disabled. */
  readonly onActivate?: () => void;
  /** Extra style, resolved against the button's live state and merged last. */
  readonly style?: StateStyle<ButtonState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * The `Button` an `IconButton` is: square, named, and ghost by default.
 *
 * Exposed so a test can read the decision without a renderer, and so a caller
 * composing several of these can share one props object.
 */
export const iconButtonProps = (props: IconButtonProps): ButtonProps => ({
  variant: props.variant ?? "ghost",
  size: props.size,
  square: true,
  disabled: props.disabled,
  loading: props.loading,
  reducedMotion: props.reducedMotion,
  label: props.label,
  leading: props.icon,
  onActivate: props.onActivate,
  onClick: props.onClick,
  onKeyDown: props.onKeyDown,
  onKeyUp: props.onKeyUp,
  onFocus: props.onFocus,
  onBlur: props.onBlur,
  style: props.style,
  className: props.className,
  testId: props.testId,
});

/** The element an icon button renders. Pure in its arguments. */
export const renderIconButton = (
  props: IconButtonProps,
  theme: PrimitiveTheme,
  focus: ButtonFocus,
): ReactElement => renderButton(iconButtonProps(props), theme, focus);

/** A square, icon-only action that carries its name. */
export const IconButton = (props: IconButtonProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  return renderIconButton(props, theme, focus);
};
