/**
 * The user menu drawing's anchor and its stage's geometry.
 *
 * `user-menu.tsx` opens the menu with `align="end"`: its right edge is the
 * trigger's, so a footer on the right opens leftward. A browser drawing cannot
 * measure the floating layer, so the page states the anchor as its right edge
 * and `user-menu-preview.test.tsx` holds the stage wide enough to keep the
 * anchored menu inside it.
 */

/** The menu's width, as `user-menu.tsx` declares it. */
export const MENU_WIDTH = 224;

/** The stage: the window whose right-hand footer holds the account row. */
export const STAGE_WIDTH = 480;

/** The footer's inset, measured from the stage's edges. */
export const STAGE_INSET = 8;

/** The account row's right edge: the footer hands the row to the stage's right. */
export const TRIGGER_RIGHT = STAGE_WIDTH - STAGE_INSET;

/** Where an end-anchored menu starts: one menu width back from that edge. */
export const menuLeft = (triggerRight: number): number =>
  triggerRight - MENU_WIDTH;

/** The menu's left edge on this page's stage. */
export const STAGE_MENU_LEFT = menuLeft(TRIGGER_RIGHT);
