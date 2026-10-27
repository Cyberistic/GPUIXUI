/**
 * The file tree's resting appearance, as Tailwind class strings.
 *
 * Only chrome is here. A row's guide cells, height, inset and chevron slot are
 * geometry the runtime exposes as behaviour, and the guides' colour is a token,
 * so they are set in `style`.
 */

/** The frame: a clipped card that the rows scroll inside. */
export const FILE_TREE_ROOT =
  "flex flex-col overflow-hidden rounded-md border border-border bg-background";

/** One row: the guides, the chevron slot and the content on one line. */
export const FILE_TREE_ROW =
  "flex flex-row items-center shrink-0 text-sm cursor-pointer";
