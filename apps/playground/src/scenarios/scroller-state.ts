/**
 * The anchor arithmetic behind a message scroller's pin decision.
 *
 * `<virtual-list>` has no `onScroll`, and its `onVisibleRange` payload is a
 * built-window range that includes overdraw and lags one gesture, so it cannot
 * answer "how far is the reader from the end?". The runtime's exact source is
 * `renderer.getListScrollTop(id)` — `[itemIndex, offsetInItemPx,
 * viewportHeightPx]` — read inside the range handler. These pure rules turn
 * that anchor and the known row heights into a distance.
 *
 * Measured facts and the component recipe: plan `300`.
 */
import * as Arr from "effect/Array";

/** A `<virtual-list>`'s logical anchor: the row at the viewport top and the offset inside it. */
export interface ScrollerAnchor {
  readonly index: number;
  readonly offsetInItem: number;
  readonly viewportHeight: number;
}

const sum = (values: ReadonlyArray<number>): number =>
  Arr.reduce(values, 0, (total, value) => total + value);

/** The total height of the list's content. */
export const contentHeight = (heights: ReadonlyArray<number>): number =>
  sum(heights);

/**
 * The scroll position `anchor` names, in pixels.
 *
 * An `index` past the end of `heights` is treated as the end: the runtime
 * reports `itemIndex === item count` as its at-end sentinel.
 */
export const scrollTop = (
  heights: ReadonlyArray<number>,
  anchor: ScrollerAnchor,
): number => sum(Arr.take(heights, anchor.index)) + anchor.offsetInItem;

/**
 * How far the viewport's bottom is from the content's end, in pixels.
 *
 * Clamped at 0: a history shorter than the viewport is always at its end.
 */
export const distanceFromEnd = (
  heights: ReadonlyArray<number>,
  anchor: ScrollerAnchor,
): number =>
  Math.max(
    0,
    contentHeight(heights) - scrollTop(heights, anchor) - anchor.viewportHeight,
  );

/** Whether the reader is close enough to the end to follow new content. */
export const isPinned = (
  heights: ReadonlyArray<number>,
  anchor: ScrollerAnchor,
  threshold: number,
): boolean => distanceFromEnd(heights, anchor) <= threshold;
