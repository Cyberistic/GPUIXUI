/**
 * The user menu drawing's anchor and its stage's geometry.
 *
 * `user-menu.tsx` opens the menu with `side="right"`: it sits beside the row,
 * over the page rather than over the panel it lives in, and `align="end"` reads
 * on the vertical axis. A browser drawing cannot measure the floating layer, so
 * the page states the anchor as the row's right edge plus the menu's offset and
 * `user-menu-preview.test.tsx` holds the stage wide enough to keep the menu
 * inside it. The row sits at the stage's left for that reason: a footer on the
 * right would open the menu past the stage's own edge, which is how the drawing
 * once hid it.
 */

/** The menu's width, as `user-menu.tsx` declares it. */
export const MENU_WIDTH = 224;

/** The account row's width, as the footer's style sheet declares it. */
export const ANCHOR_WIDTH = 240;

/** The stage: the window whose footer holds the account row. */
export const STAGE_WIDTH = 520;

/** The footer's inset, measured from the stage's edges. */
export const STAGE_INSET = 8;

/** The gap the component's `sideOffset` puts between the row and the menu. */
export const SIDE_OFFSET = 4;

/** The account row's right edge: the row is the footer's first child. */
export const TRIGGER_RIGHT = STAGE_INSET + ANCHOR_WIDTH;

/** Where a right-side menu starts: the row's right edge plus the offset. */
export const menuLeft = (triggerRight: number): number =>
  triggerRight + SIDE_OFFSET;

/** The menu's left edge on this page's stage. */
export const STAGE_MENU_LEFT = menuLeft(TRIGGER_RIGHT);
