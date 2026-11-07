import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Match } from "effect";
import { decideMove } from "@gpuixui/primitives";

export interface AppMenuItemSpec {
  readonly id: string;
  readonly disabled: boolean;
}

export interface AppMenuSpec {
  readonly id: string;
  readonly disabled: boolean;
  readonly items: ReadonlyArray<AppMenuItemSpec>;
}

export interface MenuBarState {
  readonly activeMenu: Option.Option<number>;

  readonly openMenu: Option.Option<number>;

  readonly activeItem: Option.Option<number>;
}

export const initial: MenuBarState = {
  activeMenu: Option.none(),
  openMenu: Option.none(),
  activeItem: Option.none(),
};

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

export interface MenuBarDismiss {
  readonly state: MenuBarState;

  readonly refocus: Option.Option<number>;
}

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

export const hoverOpen = (
  state: MenuBarState,
  menus: ReadonlyArray<AppMenuSpec>,
  menu: number,
): MenuBarState =>
  Option.exists(state.openMenu, (open) => open !== menu) &&
  Option.exists(Arr.get(menus, menu), (spec) => !spec.disabled)
    ? step(state, menus, { _tag: "Open", menu })
    : state;
