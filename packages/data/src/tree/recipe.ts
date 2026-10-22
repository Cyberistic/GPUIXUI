/**
 * The tree's resting appearance, as Tailwind class strings.
 *
 * Like the table's recipes these compile against `@gpuixui/tw`'s default
 * registry. Only chrome is here: a row's depth inset, its fixed height and the
 * chevron's slot are geometry the runtime exposes as behaviour, so they are set
 * in `style`.
 */

/** The tree frame: a column of rows, clipped to its radius. */
export const TREE_ROOT = "flex flex-col overflow-hidden rounded-md";

/** One row the pointer can choose. */
export const TREE_ROW =
  "flex flex-row items-center shrink-0 pr-2 text-sm text-foreground hover:bg-hover cursor-pointer";

/**
 * The row the keyboard stands on: the selection wash, and — because a chosen
 * row must still answer the pointer — the `accent` wash under it.
 */
export const TREE_ROW_ACTIVE =
  "flex flex-row items-center shrink-0 pr-2 text-sm bg-selected text-selected-foreground hover:bg-accent cursor-pointer";

/** The slot the chevron sits in, so a leaf's label lines up with a branch's. */
export const TREE_CHEVRON =
  "flex flex-row items-center justify-center shrink-0";
