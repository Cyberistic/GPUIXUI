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

import type { KeyEvent, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { MENU_CONTENT } from "@gpuixui/tw";
import { Match, pipe } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { isEventClaimed } from "../internal/event-claim.js";
import { dismissTopLayer } from "../internal/dismiss-layer.js";
import { DismissScope } from "../internal/dismiss-scope.js";
import {
  isActivation,
  isDismiss,
  isDown,
  isFirst,
  isLast,
  isTab,
  isUp,
  swallowsDefault,
} from "../internal/key.js";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import { PresenceShield } from "../internal/presence.js";
import { useTheme, type Theme } from "../internal/theme.js";
import { typedChar } from "../typeahead.js";
import { useMenuContext, type MenuContextValue } from "./state.js";

/** The floating surface every menu paints: the shared `MENU_CONTENT` recipe
 * compiled against the default registry, with the caller's `className` last. */
export const menuSurfaceStyle = (theme: Theme, className?: string): StyleDesc =>
  overlaySurfaceStyle(MENU_CONTENT, className, theme, "lg");

/**
 * The two key handlers a menu surface installs. They are hook-free functions so
 * both menu roots — the anchored Dropdown and the pointer-positioned Context
 * menu — can install exactly the same rules.
 *
 * The halves are the shared activation contract: movement and type-ahead are
 * press-only, Enter activates on the press, Space on the release, and the Space
 * press is swallowed so it cannot also scroll the page behind the menu.
 */
export const menuKeyHandlers = (
  menu: MenuContextValue,
): {
  readonly onKeyDown: (event: KeyEvent) => void;
  readonly onKeyUp: (event: KeyEvent) => void;
} => ({
  onKeyDown: (event: KeyEvent): void => {
    // A nested surface (a submenu) has already acted on this event; 0.11.0 has
    // no stopPropagation, so the claim is how this menu stays out of it.
    if (isEventClaimed(event)) return;
    if (swallowsDefault(event, "down")) event.preventDefault();
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
            Match.when(
              (press) => isActivation(press, "down"),
              menu.activateActive,
            ),
            Match.when(isDismiss, (value) => {
              dismissTopLayer(value);
            }),
            // A menu is not modal: Tab closes it and lets focus move on.
            Match.when(isTab, () => menu.close("leave")),
            Match.orElse(() => undefined),
          ),
      }),
    );
  },
  onKeyUp: (event: KeyEvent): void => {
    if (isEventClaimed(event)) return;
    if (isActivation(event, "up")) menu.activateActive();
  },
});

/** {@link MenuSurface} props: a labelled menu box. */
export interface MenuSurfaceProps extends Props {
  /** The menu's accessible name. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  /**
   * Whether the surface is painted only for its exit tween. The host's own
   * hitbox is what stops answering, not its children's: the seam's shield
   * covers the box and takes the press the reader meant for whatever the menu
   * uncovered.
   */
  readonly leaving?: boolean;
}

/**
 * A focusable `role="menu"` box with the shared keyboard rules, for menus that
 * position themselves (the Context menu). The Dropdown puts the same handler on
 * its floating layer instead.
 */
export const MenuSurface = ({
  label,
  children,
  leaving = false,
  onKeyDown,
  onKeyUp,
  className,
  style,
  ...rest
}: MenuSurfaceProps) => {
  const theme = useTheme();
  const menu = useMenuContext();
  const keys = menuKeyHandlers(menu);

  return (
    <div
      role="menu"
      aria-label={label}
      tabIndex={-1}
      autoFocus
      {...rest}
      onKeyDown={(event) => {
        keys.onKeyDown(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        keys.onKeyUp(event);
        onKeyUp?.(event);
      }}
      style={mergeStyles(
        mergeStyles(menuSurfaceStyle(theme, className), {
          pointerEvents: "auto",
          // A positioned box is what the leaving guard is inset against.
          position: "relative",
        }),
        style,
      )}
    >
      <DismissScope>{children}</DismissScope>
      <PresenceShield present={!leaving} />
    </div>
  );
};
