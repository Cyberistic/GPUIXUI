/**
 * The log viewer's resting appearance, as Tailwind class strings.
 */

/** The viewer frame: a toolbar over the scrolling list. */
export const LOG_VIEWER_ROOT =
  "flex flex-col rounded-md border border-input bg-card text-foreground overflow-hidden";

/** The toolbar: the level filter and the follow-tail toggle. */
export const LOG_TOOLBAR =
  "flex flex-row items-center gap-2 border-b border-input px-2 py-1";

/** One log row: a fixed level column and the message. */
export const LOG_ROW = "flex flex-row items-center gap-2 px-2";
