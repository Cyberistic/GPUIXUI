/**
 * `IconButton` — a button whose only content is an icon.
 *
 * The shape was being hand-rolled everywhere the icon *is* the control (a
 * dialog's close, a menu's trigger, a toast's dismiss), and every copy had to
 * solve three things `Button` alone leaves to the caller: an icon needs an
 * explicit tint (`<svg>` is tinted by `style.color`), a busy button keeps its
 * children beside the spinner, and an icon child gives no accessible name.
 * This part owns all three, so the call site is one line with a required name.
 *
 * It composes `Button` and adds no paint of its own — `square` supplies the
 * geometry, `controlStyle` supplies the foreground, and the icon is tinted with
 * the very role the button already paints its text in. It inherits `Button`'s
 * slot-trigger contract (`TriggerHandlers` + `aria-description`), so a
 * `Tooltip` wrapping an `IconButton` opens on hover and focus (plan 341).
 */

import type { ReactElement } from "react";
import { Icon, type IconName, type IconSize } from "@gpuixui/icons";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { buttonVariants } from "../core/variants.js";
import { Button, type ButtonProps } from "./Button.js";
import { useTheme } from "./ThemeProvider.js";

/** The icon scale that matches a control height. */
const ICON_SIZE: Readonly<Record<ControlSize, IconSize>> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export interface IconButtonProps extends Omit<
  ButtonProps,
  "children" | "leading" | "trailing" | "square" | "fullWidth" | "label"
> {
  /** Which icon to paint. It is decorative; the name is `label`. */
  readonly icon: IconName;
  /** Accessible name. Required: an icon alone cannot name the button. */
  readonly label: string;
}

/** The tint and icon size a variant and control size resolve to. Pure. */
const iconButtonParts = (
  { variant = "primary", size = "md" }: IconButtonProps,
  theme: PrimitiveTheme,
): { readonly color: string; readonly size: IconSize } => ({
  color: buttonVariants[variant].foreground(theme),
  size: ICON_SIZE[size],
});

/** The element an icon button renders. Pure in its arguments. */
export const renderIconButton = (
  props: IconButtonProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const { icon, label, ...button } = props;
  const tint = iconButtonParts(props, theme);
  return (
    <Button {...button} square label={label}>
      {props.loading === true ? null : (
        <Icon name={icon} color={tint.color} size={tint.size} />
      )}
    </Button>
  );
};

/** An icon-only action with a required accessible name. */
export const IconButton = (props: IconButtonProps): ReactElement =>
  renderIconButton(props, useTheme());
