/**
 * The reorder rules (plan `391`).
 *
 * A drag gives a pointer position, not an index: the pointer names an insertion
 * **boundary** (`0` = before the first row, `count` = after the last), and
 * removing the dragged item shifts every boundary after it. Getting that
 * conversion wrong is the classic "moving down lands one row early" bug, so it
 * lives here as a pure function with the tests on the same page as the view.
 *
 * `contentOffset` is positive pixels scrolled, while the renderer reports a
 * negative scroll offset; the view negates at the boundary so these rules never
 * have to reason about sign.
 */
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";

/** The only part of a row these rules need: a stable identity. */
export interface ReorderItem {
  readonly id: string;
}

/**
 * The insertion boundary nearest `pointerOffsetY`, clamped to `0…count`.
 *
 * The pointer sits on the boundary between two rows, so rounding splits a row
 * in half: the upper half inserts before it, the lower half after.
 */
export const insertionAt = (
  pointerOffsetY: number,
  contentOffset: number,
  rowHeight: number,
  count: number,
): number =>
  Number.clamp(Number.round((pointerOffsetY + contentOffset) / rowHeight, 0), {
    minimum: 0,
    maximum: count,
  });

/**
 * The index an item ends at when removed from `from` and inserted at
 * `boundary`. Every boundary after the source shifts left by one.
 */
export const dropIndex = (
  from: number,
  boundary: number,
  count: number,
): number =>
  Number.clamp(boundary > from ? boundary - 1 : boundary, {
    minimum: 0,
    maximum: Math.max(0, count - 1),
  });

/**
 * Moves one item to `to`, returning the same array when nothing moves. The
 * result's index is the requested one, which is why the caller passes the
 * already-adjusted `dropIndex`, not the raw boundary.
 */
export const moveItem = <A>(
  items: ReadonlyArray<A>,
  from: number,
  to: number,
): ReadonlyArray<A> => {
  const last = Math.max(0, items.length - 1);
  const source = Number.clamp(from, { minimum: 0, maximum: last });
  const target = Number.clamp(to, { minimum: 0, maximum: last });
  if (source === target) return items;
  return Option.match(Arr.get(items, source), {
    onNone: () => items,
    onSome: (picked) =>
      Option.getOrElse(
        Arr.insertAt(Arr.remove(items, source), target, picked),
        () => items,
      ),
  });
};

/** The drop indicator's y inside the list, in pixels. */
export const indicatorY = (boundary: number, rowHeight: number): number =>
  boundary * rowHeight;

/** One arrow press, clamped at both ends of the list. */
export const nextBoundary = (
  boundary: number,
  delta: number,
  count: number,
): number => Number.clamp(boundary + delta, { minimum: 0, maximum: count });

/** The row index of `id`, or `None` when the list does not hold it. */
export const indexOfId = (
  items: ReadonlyArray<ReorderItem>,
  id: string,
): Option.Option<number> => Arr.findFirstIndex(items, (item) => item.id === id);

/** `alpha,bravo,charlie` — the order readout the steps assert against. */
export const describeOrder = (items: ReadonlyArray<ReorderItem>): string =>
  Arr.join(
    Arr.map(items, (item) => item.id),
    ",",
  );
