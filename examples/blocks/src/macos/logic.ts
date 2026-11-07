import type { Menu } from "./data.js";

/** The menu a press on `title` leaves open; pressing the open one closes it. */
export const nextMenu = (
  open: string | undefined,
  title: string,
): string | undefined => (open === title ? undefined : title);

/** The menu an open state names, when it names one the bar carries. */
export const openMenu = (
  open: string | undefined,
  menus: ReadonlyArray<Menu>,
): Menu | undefined => menus.find((menu) => menu.title === open);

/** The menu-bar app name after pressing a dock app. */
export const focusedApp = (current: string, pressed: string): string =>
  current === pressed ? current : pressed;
