/**
 * The pure window maths a wide, pinned grid needs.
 *
 * GPUix 0.10.0 ignores `position: "sticky"` (`packages/native/src/style.rs`
 * maps only `absolute`/`fixed`/`relative`), so a grid derives its header, its
 * frozen column and its body from **one** scroll offset and keeps only the
 * visible rows and columns in the element tree. These helpers decide which
 * indices that is; the `grid-wide-table` scenario proves the runtime agrees.
 *
 * An offset is the runtime's scroll offset: `0` at the start, negative after
 * scrolling right or down.
 */

/** A scroll offset on both axes, in the runtime's sign convention. */
export interface Scroll {
  readonly x: number;
  readonly y: number;
}

/** An inclusive index range; `last < first` means nothing is rendered. */
export interface WindowRange {
  readonly first: number;
  readonly last: number;
}

/** A window over an empty collection. */
export const EMPTY_RANGE: WindowRange = { first: 0, last: -1 };

/**
 * Clamps a desired offset to what the content allows: never positive, never
 * past the end, and `0` when the content fits inside the viewport.
 */
export const clampScroll = (
  desired: number,
  total: number,
  viewport: number,
): number => {
  const clamped = Math.min(0, Math.max(desired, viewport - total));
  // A reveal from the first item yields `-0`; report a plain zero so an offset
  // is never printed or compared as `-0`.
  return clamped === 0 ? 0 : clamped;
};

/**
 * The index range the viewport shows at `offset`, plus `overdraw` items on
 * each side so a scroll paints its next row/column before it is needed.
 *
 * Both ends clamp: the first window starts at `0` and the last ends at
 * `count - 1`, so a window never asks for an item that does not exist.
 */
export const visibleWindow = (
  offset: number,
  viewport: number,
  size: number,
  count: number,
  overdraw = 1,
): WindowRange => {
  if (count <= 0 || size <= 0 || viewport <= 0) return EMPTY_RANGE;
  const first = Math.max(0, Math.floor(-offset / size) - overdraw);
  const lastVisible = Math.ceil((-offset + viewport) / size) - 1;
  const last = Math.min(count - 1, lastVisible + overdraw);
  return { first, last: Math.max(first, last) };
};

/**
 * The offset that reveals the item at `index` with the least movement.
 *
 * An item already fully inside the viewport keeps `current`, so a keyboard
 * move within the window does not jitter the grid; a move past either edge
 * pans by exactly the missing distance, then clamps to the content bounds.
 */
export const revealOffset = (
  current: number,
  index: number,
  size: number,
  viewport: number,
  total: number,
): number => {
  const start = index * size;
  const end = start + size;
  const visibleStart = -current;
  const visibleEnd = visibleStart + viewport;
  const desired =
    start >= visibleStart && end <= visibleEnd
      ? current
      : start < visibleStart
        ? -start
        : viewport - end;
  return clampScroll(desired, total, viewport);
};
