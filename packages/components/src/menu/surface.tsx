/**
 * The menu surface's shared appearance and keyboard rules.
 *
 * A menu's highlight is its focus: every arrow move focuses the row, and every row
 * that takes focus becomes the highlight. That is why there is no separate
 * "active but unfocused" state to get out of sync.
 *
 * `Escape` is offered to the dismiss stack rather than closing directly, so a menu
 * opened inside a dialog closes only the menu.
 */

import type { EventPayload, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match, pipe } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { isEventClaimed } from "../internal/event-claim.js";
import { dismissTopLayer } from "../internal/dismiss-layer.js";
import {
  isActivation,
  isDismiss,
  isDown,
  isFirst,
  isLast,
  isTab,
  isUp,
  typedChar,
} from "../internal/key.js";
import {
  elevation,
  textStyle,
  useTheme,
  type Theme,
} from "../internal/theme.js";
import { useMenuContext, type MenuContextValue } from "./state.js";

/** The floating surface every menu paints. */
export const menuSurfaceStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
  minWidth: 180,
  padding: theme.spacing.xs,
  backgroundColor: theme.colors.popover,
  color: theme.colors.popoverForeground,
  borderRadius: theme.radius.md,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  boxShadow: elevation(theme, "md"),
  pointerEvents: "auto",
});

/**
 * The key handler a menu surface installs. It is a hook-free function so both
 * menu roots — the anchored Dropdown and the pointer-positioned Context menu —
 * can install exactly the same rules.
 */
export const menuKeyHandler = (
  menu: MenuContextValue,
): ((event: EventPayload) => void) => {
  const step = (event: EventPayload): void => {
    // A nested surface (a submenu) has already acted on this event; 0.10.0 has
    // no stopPropagation, so the claim is how this menu stays out of it.
    if (isEventClaimed(event)) return;
    pipe(
      typedChar(event),
      Option.match({
        // A typed letter jumps to a row; it never also runs a named-key rule.
        onSome: menu.typeahead,
        onNone: () =>
          Match.value(event).pipe(
            Match.when(isDown, () => menu.step({ _tag: "Move", delta: 1 })),
            Match.when(isUp, () => menu.step({ _tag: "Move", delta: -1 })),
            Match.when(isFirst, () => menu.step({ _tag: "First" })),
            Match.when(isLast, () => menu.step({ _tag: "Last" })),
            Match.when(isActivation, menu.activateActive),
            Match.when(isDismiss, (value) => {
              dismissTopLayer(value);
            }),
            // A menu is not modal: Tab closes it and lets focus move on.
            Match.when(isTab, () => menu.close("leave")),
            Match.orElse(() => undefined),
          ),
      }),
    );
  };
  return step;
};

/** {@link MenuSurface} props: a labelled menu box. */
export interface MenuSurfaceProps extends Props {
  /** The menu's accessible name. */
  readonly label?: string;
  readonly children?: ReactNode;
}

/**
 * A focusable `role="menu"` box with the shared keyboard rules, for menus that
 * position themselves (the Context menu). The Dropdown puts the same handler on
 * its floating layer instead.
 */
export const MenuSurface = ({
  label,
  children,
  onKeyDown,
  style,
  ...rest
}: MenuSurfaceProps) => {
  const theme = useTheme();
  const menu = useMenuContext();
  const keys = menuKeyHandler(menu);

  return (
    <div
      role="menu"
      aria-label={label}
      tabIndex={-1}
      autoFocus
      {...rest}
      onKeyDown={(event) => {
        keys(event);
        onKeyDown?.(event);
      }}
      style={mergeStyles(
        { ...textStyle(theme, "body"), ...menuSurfaceStyle(theme) },
        style,
      )}
    >
      {children}
    </div>
  );
};
