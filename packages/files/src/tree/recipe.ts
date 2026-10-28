/**
 * The file tree's resting appearance, as Tailwind class strings.
 *
 * Only chrome is here. A row's guide cells, height, inset and chevron slot are
 * geometry the runtime exposes as behaviour, and the guides' colour is a token,
 * so they are set in `style`.
 */

/**
 * The frame: the rows' column, with no surface of its own.
 *
 * The reference draws the tree on the host's surface — a card, a sidebar, a
 * sheet — so the tree does not add a second border and background around itself.
 */
export const FILE_TREE_ROOT = "flex flex-col overflow-hidden";

/** One row: the chevron slot and the content on one line. */
export const FILE_TREE_ROW =
  "flex flex-row items-center shrink-0 text-sm cursor-pointer";
