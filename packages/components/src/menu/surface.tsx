/** @jsxImportSource @gpuix/react */
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
import { MenuLeaving, useMenuContext, type MenuContextValue } from "./state.js";

export const menuSurfaceStyle = (theme: Theme, className?: string): StyleDesc =>
  overlaySurfaceStyle(MENU_CONTENT, className, theme, "lg");

export const menuKeyHandlers = (
  menu: MenuContextValue,
): {
  readonly onKeyDown: (event: KeyEvent) => void;
  readonly onKeyUp: (event: KeyEvent) => void;
} => ({
  onKeyDown: (event: KeyEvent): void => {
    if (isEventClaimed(event)) return;
    if (swallowsDefault(event, "down")) event.preventDefault();
    pipe(
      typedChar(event),
      Option.match({
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

export interface MenuSurfaceProps extends Props {
  readonly label?: string;

  readonly className?: string;
  readonly children?: ReactNode;

  readonly leaving?: boolean;
}

export const MenuSurface = ({
  label,
  children,
  leaving = false,
  onKeyDown,
  onKeyUp,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
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
      onMouseEnter={(event) => {
        menu.notePointer(true);
        onMouseEnter?.(event);
      }}
      onMouseMove={(event) => {
        menu.notePointer(true);
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        menu.notePointer(false);
        onMouseLeave?.(event);
      }}
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

          position: "relative",
        }),
        style,
      )}
    >
      <MenuLeaving.Provider value={leaving}>
        <DismissScope>{children}</DismissScope>
      </MenuLeaving.Provider>
      <PresenceShield present={!leaving} />
    </div>
  );
};
