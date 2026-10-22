/**
 * The menu bar's navigation: which menu and which item are active.
 *
 * Pure so it is provable without a renderer. `step` folds one keyboard action
 * into the state; the component maps `KeyEvent`s to actions, reads the active
 * item to run it, and uses {@link dismiss} to know where to return focus.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Match } from "effect";
import { decideMove } from "@gpuixui/primitives";

/** One dropdown row, reduced to what navigation needs. */
export interface AppMenuItemSpec {
  readonly id: string;
  readonly disabled: boolean;
}

/** One top-level menu: a labelled button and its dropdown rows. */
export interface AppMenuSpec {
  readonly id: string;
  readonly disabled: boolean;
  readonly items: ReadonlyArray<AppMenuItemSpec>;
}

/** The bar's highlight and open state. */
export interface MenuBarState {
  /** The menu whose button is highlighted; `None` before the bar is entered. */
  readonly activeMenu: Option.Option<number>;
  /** The menu whose dropdown is open. */
  readonly openMenu: Option.Option<number>;
  /** The row highlighted in the open dropdown. */
  readonly activeItem: Option.Option<number>;
}

/** No menu entered, no dropdown open. */
export const initial: MenuBarState = {
  activeMenu: Option.none(),
  openMenu: Option.none(),
  activeItem: Option.none(),
};

/** A keyboard action the bar understands. */
export type MenuBarAction =
  | { readonly _tag: "MoveBar"; readonly delta: 1 | -1 }
  | { readonly _tag: "Open"; readonly menu: number }
  | { readonly _tag: "MoveItem"; readonly delta: 1 | -1 }
  | { readonly _tag: "Dismiss" };

const arrowKey = (
  delta: 1 | -1,
  orientation: "horizontal" | "vertical",
): string =>
  orientation === "horizontal"
    ? delta === 1
      ? "right"
      : "left"
    : delta === 1
      ? "down"
      : "up";

/** Move within a list, wrapping and skipping disabled entries. */
const moveIn = (
  current: Option.Option<number>,
  count: number,
  delta: 1 | -1,
  orientation: "horizontal" | "vertical",
  isDisabled: (index: number) => boolean,
): Option.Option<number> =>
  Option.match(current, {
    onNone: () => {
      const enabled = Arr.filter(
        Arr.range(0, count - 1),
        (i) => !isDisabled(i),
      );
      return Arr.get(enabled, delta === 1 ? 0 : Arr.length(enabled) - 1);
    },
    onSome: (index) =>
      decideMove(
        index,
        count,
        arrowKey(delta, orientation),
        orientation,
        isDisabled,
      ),
  });

const menuIsDisabled = (
  menus: ReadonlyArray<AppMenuSpec>,
  index: number,
): boolean => Option.exists(Arr.get(menus, index), (menu) => menu.disabled);

const itemsOf = (
  menus: ReadonlyArray<AppMenuSpec>,
  menu: number,
): ReadonlyArray<AppMenuItemSpec> =>
  Option.match(Arr.get(menus, menu), {
    onNone: () => [],
    onSome: (entry) => entry.items,
  });

const itemIsDisabled = (
  items: ReadonlyArray<AppMenuItemSpec>,
  index: number,
): boolean => Option.exists(Arr.get(items, index), (item) => item.disabled);

/** The state after Escape: the dropdown closes and focus returns to its trigger. */
export interface MenuBarDismiss {
  readonly state: MenuBarState;
  /** The menu whose trigger should regain focus; `None` leaves the bar. */
  readonly refocus: Option.Option<number>;
}

/** Close the open dropdown and name where focus should return. */
export const dismiss = (state: MenuBarState): MenuBarDismiss =>
  Option.match(state.openMenu, {
    onSome: (menu) => ({
      state: {
        activeMenu: Option.some(menu),
        openMenu: Option.none(),
        activeItem: Option.none(),
      },
      refocus: Option.some(menu),
    }),
    onNone: () => ({ state: initial, refocus: Option.none() }),
  });

/**
 * Apply one keyboard action.
 *
 * `MoveBar` moves the open dropdown's menu while one is open, otherwise the
 * highlight between the bar's buttons; both wrap and skip disabled menus.
 * `MoveItem` moves the highlight within the open dropdown, wrapping and
 * skipping disabled rows. `Open` opens a menu's dropdown; `Dismiss` closes it.
 */
export const step = (
  state: MenuBarState,
  menus: ReadonlyArray<AppMenuSpec>,
  action: MenuBarAction,
): MenuBarState =>
  Match.value(action).pipe(
    Match.when({ _tag: "MoveBar" }, ({ delta }) =>
      Option.match(state.openMenu, {
        onSome: () => {
          const next = moveIn(
            state.openMenu,
            Arr.length(menus),
            delta,
            "horizontal",
            (i) => menuIsDisabled(menus, i),
          );
          return Option.match(next, {
            onNone: () => state,
            onSome: (menu) => ({
              activeMenu: Option.some(menu),
              openMenu: Option.some(menu),
              activeItem: Option.none(),
            }),
          });
        },
        onNone: () => {
          const next = moveIn(
            state.activeMenu,
            Arr.length(menus),
            delta,
            "horizontal",
            (i) => menuIsDisabled(menus, i),
          );
          return Option.match(next, {
            onNone: () => state,
            onSome: (menu) => ({ ...state, activeMenu: Option.some(menu) }),
          });
        },
      }),
    ),
    Match.when({ _tag: "Open" }, ({ menu }) => ({
      activeMenu: Option.some(menu),
      openMenu: Option.some(menu),
      activeItem: Option.none(),
    })),
    Match.when({ _tag: "MoveItem" }, ({ delta }) =>
      Option.match(state.openMenu, {
        onNone: () => state,
        onSome: (menu) => {
          const items = itemsOf(menus, menu);
          const next = moveIn(
            state.activeItem,
            Arr.length(items),
            delta,
            "vertical",
            (i) => itemIsDisabled(items, i),
          );
          return Option.match(next, {
            onNone: () => state,
            onSome: (item) => ({ ...state, activeItem: Option.some(item) }),
          });
        },
      }),
    ),
    Match.when({ _tag: "Dismiss" }, () => dismiss(state).state),
    Match.exhaustive,
  );
