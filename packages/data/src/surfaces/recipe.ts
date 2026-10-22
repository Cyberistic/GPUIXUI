/**
 * The data surfaces' resting appearance, as Tailwind class strings.
 *
 * They compile against `@gpuixui/tw`'s default registry — shadcn's fixed
 * metrics (`px-3` = 12, `text-sm` = 14/20) — the same seam the table's recipes
 * use. A surface that measures itself (a label column's width, a row's height)
 * sets that number in `style`, because geometry is data rather than a token.
 */

/** A bounded panel: the card fill with one edge. */
export const SURFACE_PANEL =
  "flex flex-col rounded-lg border border-input bg-card text-foreground";

/** The panel's own header row: a title and whatever sits beside it. */
export const SURFACE_HEADER =
  "flex flex-row items-center justify-between gap-2 border-b border-input px-3 py-2";

/** One key-value row: a fixed label column and a value column. */
export const KEY_VALUE_ROW = "flex flex-row items-center gap-2 py-1";

/** The label column's text. */
export const KEY_VALUE_LABEL = "text-xs text-muted-foreground";

/** The value column's text. */
export const KEY_VALUE_VALUE = "text-xs text-foreground";

/** A statistic card: a label, a reading and a hint. */
export const STAT_CARD =
  "flex flex-col gap-1 rounded-lg border border-input bg-card px-3 py-2";

/** The reading itself. */
export const STAT_VALUE = "text-2xl font-semibold text-foreground";

/** The label above a reading. */
export const STAT_LABEL = "text-xs text-muted-foreground";

/** The hint below a reading. */
export const STAT_HINT = "text-xs text-muted-foreground";

/** A toolbar: a row of controls on the muted strip. */
export const DATA_TOOLBAR =
  "flex flex-row items-center gap-2 rounded-md border border-input bg-muted px-2 py-1";

/** One builder clause: a field, a comparison and a value. */
export const FILTER_CLAUSE = "flex flex-row items-center gap-2 py-1";

/** A group of clauses, indented under its combinator. */
export const FILTER_GROUP = "flex flex-col gap-1 border-l border-input pl-2";

/** The builder's own surface: a bounded panel of clauses. */
export const ADVANCED_FILTER =
  "flex flex-col gap-2 rounded-lg border border-input bg-card px-3 py-2";

/** The sentence a tree reads as, above the clauses. */
export const FILTER_SENTENCE = "text-xs text-foreground";
