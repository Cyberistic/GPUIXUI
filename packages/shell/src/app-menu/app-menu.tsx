/**
 * AppMenu: the in-window application menu bar.
 *
 * The pinned runtime installs a fixed macOS menu bar and publishes no API to add
 * to it (`COMPONENTS.md`, "Application menus"), so the chrome is caller-drawn:
 * a `role="menubar"` row of buttons whose dropdowns are `FloatingLayer`s
 * anchored below the button that opened them. The navigation rules — Left/Right
 * between menus, Up/Down within a dropdown, Escape closing and returning focus
 * to the trigger — live in `logic.ts`; the component maps `KeyEvent`s onto those
 * actions and renders the accelerator label with `@gpuixui/keyboard`.
 */

import type { KeyEvent, Props, PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  FloatingLayer,
  floatingRootStyle,
  mergeStyles,
} from "@gpuix/react/floating";
import { formatSymbols, type Platform } from "@gpuixui/keyboard";
import { isPlainKey } from "@gpuixui/primitives";
import {
  cn,
  KEYBOARD_SHORTCUT_KEYS,
  KEYCAP,
  KEYCAP_TEXT,
  MENU_CONTENT,
  MENU_ITEM,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { recipeStyle } from "../recipe.js";
import { currentPlatform, disabledOpacity, useTheme } from "../theme.js";
import type { Theme } from "../theme.js";
import {
  dismiss,
  initial,
  step,
  type AppMenuSpec,
  type MenuBarState,
} from "./logic.js";

const MENU_BAR = "flex flex-row items-center";
const MENU_TRIGGER =
  "flex flex-row items-center rounded-md px-2 py-1 text-sm font-medium font-sans text-foreground";
const MENU_ITEM_LABEL = "text-sm font-medium font-sans";

/** One runnable entry in a menu's dropdown. */
export interface AppMenuItem {
  readonly id: string;
  readonly label: string;
  /** Display-only accelerator, e.g. `"mod+s"`. The app binds the chord. */
  readonly accelerator?: string;
  readonly disabled?: boolean;
}

/** One top-level menu: a labelled button and its dropdown rows. */
export interface AppMenuEntry {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly items: ReadonlyArray<AppMenuItem>;
}

/** {@link AppMenu} props. */
export interface AppMenuProps extends Omit<Props, "children"> {
  /** The menubar's accessible name. */
  readonly label?: string;
  readonly menus: ReadonlyArray<AppMenuEntry>;
  /** Render accelerators with another platform's glyphs. Default: the host. */
  readonly platform?: Platform;
  /** Called when a runnable item is selected. */
  readonly onSelect?: (menuId: string, itemId: string) => void;
  readonly className?: string;
}

/** The resting box of a menu-bar button, with its open/highlight wash. */
const triggerStyle = (
  theme: Theme,
  highlighted: boolean,
  disabled: boolean,
): StyleDesc => ({
  ...recipeStyle(MENU_TRIGGER, theme),
  ...(disabled
    ? { opacity: disabledOpacity }
    : highlighted
      ? { backgroundColor: theme.colors.hover }
      : { hover: { backgroundColor: theme.colors.hover } }),
});

/** The resting box of a dropdown row, with its highlight wash. */
const itemStyle = (
  theme: Theme,
  active: boolean,
  disabled: boolean,
): StyleDesc => ({
  ...recipeStyle(cn(MENU_ITEM, "justify-between"), theme),
  ...(disabled
    ? { opacity: disabledOpacity }
    : active
      ? { backgroundColor: theme.colors.hover }
      : { hover: { backgroundColor: theme.colors.hover } }),
  cursor: disabled ? "not-allowed" : "pointer",
});

/**
 * The application menu bar.
 *
 * The bar is one keyboard surface: its buttons share a tab stop and the open
 * dropdown's rows are highlighted (not focused), the same "highlight, not focus"
 * rule the command palette uses, so arrow keys keep working while the bar owns
 * the focus.
 */
export const AppMenu = ({
  label,
  menus,
  platform,
  onSelect,
  className,
  style,
  ...rest
}: AppMenuProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [state, setState] = useState<MenuBarState>(initial);

  const triggerRefs = useRef<Array<PublicInstance | null>>([]);
  const surfaceRef = useRef<PublicInstance | null>(null);

  const specs: ReadonlyArray<AppMenuSpec> = Arr.map(menus, (menu) => ({
    id: menu.id,
    disabled: menu.disabled === true,
    items: Arr.map(menu.items, (item) => ({
      id: item.id,
      disabled: item.disabled === true,
    })),
  }));

  // A keyboard-open moves focus into the dropdown; the bar's own key handler
  // drives it from there because key events bubble to the bar root.
  useLayoutEffect(() => {
    if (Option.isSome(state.openMenu) && surfaceRef.current !== null) {
      renderer?.focusElement?.(surfaceRef.current.id);
    }
  }, [state.openMenu, renderer]);

  const firstEnabled = Arr.findFirstIndex(
    menus,
    (menu) => menu.disabled !== true,
  );

  // The bar is one tab stop; it follows the highlight, falling back to the
  // first menu before the bar is entered.
  const stopIndex = Option.getOrElse(
    Option.orElse(state.activeMenu, () => firstEnabled),
    () => 0,
  );

  const openHighlighted = (): void => {
    Option.match(
      Option.orElse(state.activeMenu, () => firstEnabled),
      {
        onNone: () => undefined,
        onSome: (menu) => setState(step(state, specs, { _tag: "Open", menu })),
      },
    );
  };

  const runActive = (): void => {
    Option.match(state.openMenu, {
      onNone: () => undefined,
      onSome: (menu) =>
        Option.match(Arr.get(menus, menu), {
          onNone: () => undefined,
          onSome: (entry) =>
            Option.match(
              Option.flatMap(state.activeItem, (i) => Arr.get(entry.items, i)),
              {
                onNone: () => undefined,
                onSome: (item) => {
                  if (item.disabled === true) return;
                  onSelect?.(entry.id, item.id);
                  setState(dismiss(state).state);
                },
              },
            ),
        }),
    });
  };

  const handleKeyDown = (event: KeyEvent): void => {
    const key = event.key ?? "";
    if (!isPlainKey(event.modifiers)) return;

    if (key === "escape") {
      const result = dismiss(state);
      setState(result.state);
      Option.match(result.refocus, {
        onNone: () => undefined,
        onSome: (menu) => {
          const trigger = triggerRefs.current[menu];
          if (trigger !== null && trigger !== undefined) {
            renderer?.focusElement?.(trigger.id);
          }
        },
      });
      return;
    }

    if (key === "tab") {
      setState(initial);
      return;
    }

    if (key === "left" || key === "right") {
      setState(
        step(state, specs, {
          _tag: "MoveBar",
          delta: key === "right" ? 1 : -1,
        }),
      );
      return;
    }

    if (key === "down") {
      if (Option.isSome(state.openMenu)) {
        setState(step(state, specs, { _tag: "MoveItem", delta: 1 }));
      } else {
        openHighlighted();
      }
      return;
    }

    if (key === "up" && Option.isSome(state.openMenu)) {
      setState(step(state, specs, { _tag: "MoveItem", delta: -1 }));
      return;
    }

    if (key === "enter" || key === "space") {
      if (Option.isSome(state.openMenu)) runActive();
      else openHighlighted();
    }
  };

  return (
    <div
      role="menubar"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      onKeyDown={handleKeyDown}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(MENU_BAR, className), theme),
          floatingRootStyle(),
        ),
        style,
      )}
    >
      {Arr.map(menus, (menu, index) => {
        const open = Option.contains(state.openMenu, index);
        const highlighted = open || Option.contains(state.activeMenu, index);
        const disabled = menu.disabled === true;
        return (
          <Fragment key={menu.id}>
            <div
              role="menuitem"
              tabIndex={index === stopIndex ? 0 : -1}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-disabled={disabled}
              testId={`app-menu-trigger-${menu.id}`}
              ref={(instance) => {
                triggerRefs.current[index] = instance;
              }}
              onClick={() => {
                if (disabled) return;
                setState(step(state, specs, { _tag: "Open", menu: index }));
              }}
              style={triggerStyle(theme, highlighted, disabled)}
            >
              {menu.label}
            </div>
            {open ? (
              <FloatingLayer
                role="menu"
                aria-label={menu.label}
                tabIndex={-1}
                side="bottom"
                align="start"
                sideOffset={2}
                ref={(instance) => {
                  surfaceRef.current = instance;
                }}
                style={recipeStyle(cn(MENU_CONTENT, "min-w-40"), theme)}
              >
                {Arr.map(menu.items, (item, itemIndex) => {
                  const active = Option.contains(state.activeItem, itemIndex);
                  const itemDisabled = item.disabled === true;
                  return (
                    <div
                      key={item.id}
                      role="menuitem"
                      aria-selected={active}
                      aria-disabled={itemDisabled}
                      testId={`app-menu-item-${item.id}`}
                      onClick={() => {
                        if (itemDisabled) return;
                        onSelect?.(menu.id, item.id);
                        setState(dismiss(state).state);
                      }}
                      style={itemStyle(theme, active, itemDisabled)}
                    >
                      <text
                        style={{
                          ...recipeStyle(MENU_ITEM_LABEL, theme),
                          color: itemDisabled
                            ? theme.colors.disabledForeground
                            : theme.colors.popoverForeground,
                        }}
                      >
                        {item.label}
                      </text>
                      {item.accelerator === undefined ? null : (
                        <div style={recipeStyle(KEYBOARD_SHORTCUT_KEYS, theme)}>
                          {Arr.map(
                            formatSymbols(
                              item.accelerator,
                              platform ?? currentPlatform,
                            ),
                            (glyph, keyIndex) => (
                              <div
                                key={keyIndex}
                                style={recipeStyle(KEYCAP, theme)}
                              >
                                <text style={recipeStyle(KEYCAP_TEXT, theme)}>
                                  {glyph}
                                </text>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </FloatingLayer>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
};
