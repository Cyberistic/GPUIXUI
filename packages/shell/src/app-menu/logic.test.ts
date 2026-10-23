/**
 * Menu bar navigation transitions.
 *
 * The bugs these guard: `ArrowLeft`/`ArrowRight` from the first or last menu
 * stopped instead of wrapping; `ArrowUp`/`ArrowDown` in a dropdown stopped at
 * the ends instead of wrapping; a move landed on a disabled menu or row; a
 * pointer crossing a sibling's title opened nothing while a menu was open (or
 * opened one while the bar was closed); and Escape closed the dropdown without
 * saying where focus should return.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  dismiss,
  hoverOpen,
  initial,
  step,
  type AppMenuSpec,
  type MenuBarState,
} from "./logic.js";

const menus = (
  count: number,
  itemsPer = 3,
  disabledMenus: ReadonlyArray<number> = [],
  disabledItems: ReadonlyArray<number> = [],
): ReadonlyArray<AppMenuSpec> =>
  Arr.map(Arr.range(1, count), (i) => ({
    id: `menu-${i}`,
    disabled: disabledMenus.includes(i - 1),
    items: Arr.map(Arr.range(1, itemsPer), (j) => ({
      id: `item-${i}-${j}`,
      disabled: disabledItems.includes(j - 1),
    })),
  }));

const bar = (activeMenu: number): MenuBarState => ({
  activeMenu: Option.some(activeMenu),
  openMenu: Option.none(),
  activeItem: Option.none(),
});

const open = (menu: number, item = 0): MenuBarState => ({
  activeMenu: Option.some(menu),
  openMenu: Option.some(menu),
  activeItem: Option.some(item),
});

describe("bar traversal", () => {
  it("wraps Right from the last menu to the first", () => {
    expect(
      step(bar(2), menus(3), { _tag: "MoveBar", delta: 1 }).activeMenu,
    ).toEqual(Option.some(0));
  });

  it("wraps Left from the first menu to the last", () => {
    expect(
      step(bar(0), menus(3), { _tag: "MoveBar", delta: -1 }).activeMenu,
    ).toEqual(Option.some(2));
  });

  it("skips a disabled menu (negative control)", () => {
    const next = step(bar(0), menus(3, 3, [1]), { _tag: "MoveBar", delta: 1 });
    expect(next.activeMenu).toEqual(Option.some(2));
  });

  it("moves the open dropdown to the adjacent menu and highlights it", () => {
    const next = step(open(0), menus(3), { _tag: "MoveBar", delta: 1 });
    expect(next.openMenu).toEqual(Option.some(1));
    expect(next.activeMenu).toEqual(Option.some(1));
    expect(next.activeItem).toEqual(Option.none());
  });
});

describe("hover switching", () => {
  it("opens a sibling while a menu is open and closes the previous one", () => {
    const next = hoverOpen(open(0, 1), menus(3), 1);
    expect(next.openMenu).toEqual(Option.some(1));
    expect(next.activeMenu).toEqual(Option.some(1));
    expect(next.activeItem).toEqual(Option.none());
  });

  it("switches back to the menu it came from", () => {
    const there = hoverOpen(open(0), menus(3), 1);
    expect(hoverOpen(there, menus(3), 0).openMenu).toEqual(Option.some(0));
  });

  it("opens nothing while the bar is closed (negative control)", () => {
    expect(hoverOpen(initial, menus(3), 0)).toEqual(initial);
    expect(hoverOpen(bar(1), menus(3), 2)).toEqual(bar(1));
  });

  it("keeps the row highlighted when the open menu's trigger is entered", () => {
    const withRow = open(1, 2);
    expect(hoverOpen(withRow, menus(3), 1)).toEqual(withRow);
  });

  it("does not open a disabled sibling (negative control)", () => {
    expect(hoverOpen(open(0), menus(3, 3, [1]), 1)).toEqual(open(0));
  });
});

describe("item traversal", () => {
  it("wraps Down from the last row to the first", () => {
    expect(
      step(open(0, 2), menus(3), { _tag: "MoveItem", delta: 1 }).activeItem,
    ).toEqual(Option.some(0));
  });

  it("wraps Up from the first row to the last", () => {
    expect(
      step(open(0, 0), menus(3), { _tag: "MoveItem", delta: -1 }).activeItem,
    ).toEqual(Option.some(2));
  });

  it("skips a disabled row (negative control)", () => {
    const next = step(open(0, 0), menus(3, 3, [], [1]), {
      _tag: "MoveItem",
      delta: 1,
    });
    expect(next.activeItem).toEqual(Option.some(2));
  });

  it("does not move a row while no dropdown is open", () => {
    expect(step(bar(0), menus(3), { _tag: "MoveItem", delta: 1 })).toEqual(
      bar(0),
    );
  });
});

describe("dismiss", () => {
  it("returns focus to the trigger when a dropdown is open", () => {
    const result = dismiss(open(1));
    expect(result.refocus).toEqual(Option.some(1));
    expect(result.state.openMenu).toEqual(Option.none());
    expect(result.state.activeMenu).toEqual(Option.some(1));
  });

  it("leaves the bar when nothing is open (negative control)", () => {
    expect(dismiss(bar(0)).refocus).toEqual(Option.none());
    expect(dismiss(initial).state).toEqual(initial);
  });
});
