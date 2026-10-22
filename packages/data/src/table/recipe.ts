/**
 * The table's resting appearance, as Tailwind class strings.
 *
 * They compile against `@gpuixui/tw`'s default registry — shadcn's fixed
 * metrics (`px-3` = 12, `text-sm` = 14/20) — the same seam the component
 * package uses. Only box chrome is a recipe: a cell's content is the caller's
 * (`Text`, a control, a badge), so no typographic role is forced onto it.
 *
 * Geometry the runtime exposes as behaviour (a scroller's axes, a column's
 * measured width) is set in `style`, not in a class: `overflow-x` and
 * `overflow-y` are only in the primitives' registry, and a column width is
 * data rather than a token.
 */

/** The bounded surface: a card fill with one edge, clipped to its radius. */
export const TABLE_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-card text-foreground";

/** The one horizontal scroller every row, header and body share. */
export const TABLE_VIEWPORT = "flex flex-col flex-1 min-h-0";

/** The header is a sibling of the row scroller, never inside it. */
export const TABLE_HEADER = "flex flex-col shrink-0";

/** The vertical scroller: only this pane moves when the reader wheels. */
export const TABLE_BODY = "flex flex-col flex-1 min-h-0";

/** One row, before the selection or interaction state is known. */
export const TABLE_ROW = "flex flex-row items-center shrink-0";

/** A chosen row paints the selection wash and its own label role. */
export const TABLE_ROW_SELECTED =
  "flex flex-row items-center shrink-0 bg-selected text-selected-foreground";

/** A row the pointer can choose answers the pointer. */
export const TABLE_ROW_INTERACTIVE =
  "flex flex-row items-center shrink-0 hover:bg-hover cursor-pointer";

/** A header cell is a box: a sort control or a `Text` lives inside it. */
export const TABLE_HEADER_CELL =
  "flex flex-row items-center px-3 py-2 text-sm font-medium text-muted-foreground";

/** A body cell is a box with the same inset as its header. */
export const TABLE_CELL = "px-3 py-2 text-sm";

/** The caption below the rows. */
export const TABLE_CAPTION = "px-3 py-2 text-xs text-muted-foreground";

/** The empty set's frame. */
export const TABLE_EMPTY =
  "flex flex-col items-center justify-center gap-1 px-3 py-6";

/** One placeholder bar inside a loading row. */
export const TABLE_SKELETON_BAR = "h-2 rounded-sm bg-skeleton";
