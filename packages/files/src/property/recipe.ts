/**
 * The property panel's resting appearance, as Tailwind class strings.
 */

/** A bounded panel: the card fill with one edge. */
export const PROPERTY_PANEL =
  "flex flex-col rounded-lg border border-input bg-card text-foreground";

/** The panel's own header row: a title. */
export const PROPERTY_HEADER =
  "flex flex-row items-center justify-between gap-2 border-b border-input px-3 py-2";

/** One property row: a fixed label column and the field column. */
export const PROPERTY_ROW = "flex flex-row items-center gap-2 py-1";

/** The label column's text. */
export const PROPERTY_LABEL = "text-xs text-muted-foreground";
