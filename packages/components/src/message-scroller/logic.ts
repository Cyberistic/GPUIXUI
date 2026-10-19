/**
 * MessageScroller's pin and unread rules, without React or GPUix.
 *
 * The component only has three questions to answer: is the reader at the end,
 * how many rows arrived while they were not, and what does "jump to latest"
 * mean. Keeping them here is what makes the "do not yank the reader" contract
 * testable without a window (plan 206 §Steps).
 */

/** Whether the viewport follows new content, and how much arrived unseen. */
export interface MessageScrollerState {
  /** Following the newest row. */
  readonly pinned: boolean;
  /** Rows that arrived while the reader was not pinned. */
  readonly unread: number;
}

/** A fresh scroller follows the end and has seen everything. */
export const initialMessageScrollerState: MessageScrollerState = {
  pinned: true,
  unread: 0,
};

/**
 * The pin distance: a finite caller value clamped at zero, or the fallback
 * token when the value is absent or not a distance. A malformed threshold must
 * not disable following the end.
 */
export const pinThreshold = (
  value: number | undefined,
  fallback: number,
): number =>
  value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(0, value);

/** One measurement of the viewport's distance from its newest row. */
export interface ScrollObservation {
  /** Pixels between the bottom of the viewport and the tail sentinel. */
  readonly distanceFromEnd: number;
  /** How close to the tail still counts as "at the end"; a layout token. */
  readonly threshold: number;
}

/**
 * Fold one scroll observation. A pinned reader clears the unread count because
 * the end is visible again; leaving the end keeps the count untouched. An
 * unchanged state is returned by identity so React does not re-render.
 */
export const observeScroll = (
  state: MessageScrollerState,
  { distanceFromEnd, threshold }: ScrollObservation,
): MessageScrollerState => {
  const pinned = distanceFromEnd <= Math.max(0, threshold);
  const unread = pinned ? 0 : state.unread;
  return pinned === state.pinned && unread === state.unread
    ? state
    : { pinned, unread };
};

/**
 * Fold rows appended to the viewport. A pinned reader sees them, so only the
 * unpinned case counts; a non-positive count is not an arrival.
 */
export const addItems = (
  state: MessageScrollerState,
  count: number,
): MessageScrollerState =>
  state.pinned || count <= 0
    ? state
    : { pinned: false, unread: state.unread + count };

/** The state "jump to latest" produces: pinned, with nothing unseen. */
export const requestLatest = (
  state: MessageScrollerState,
): MessageScrollerState =>
  state.pinned && state.unread === 0 ? state : { pinned: true, unread: 0 };
