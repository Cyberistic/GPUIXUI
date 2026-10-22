/**
 * The mounted window a virtualized table holds.
 *
 * The runtime's `<virtual-list>` in `itemCount` mode paints the children it is
 * given and positions them from `estimatedItemHeight` and `windowStart`; it
 * cannot infer a window the app never moved (`virtual-list-windowed`). The
 * **arithmetic** — which rows are in view, and how many are mounted around
 * them — belongs to **`@tanstack/virtual-core`**: its `Virtualizer` turns a
 * scroll offset and a viewport into a range, and this module hands it the two
 * numbers the runtime reports.
 *
 * Two measured facts shape the seam:
 *
 * - the runtime's `onVisibleRange` **lags the paint by one gesture** (the event
 *   read `20..27` while the paint had reached `40..46`), so the range it
 *   reports cannot be the window's own source — a window built from it paints
 *   blank rows. The window is computed from the runtime's **scroll anchor**
 *   instead (`getListScrollTop`), which is exact even while the row heights
 *   are estimates.
 * - a **reveal moves the window first**, and only then may the caller scroll,
 *   because the runtime cannot build a row outside the window it was given.
 *
 * The core is driven without a DOM: `getScrollElement` answers `null`, so the
 * core never registers its observers, and the scroll offset and the viewport
 * are set on it directly.
 *
 * Rows are fixed height here. A windowed table whose rows vary uses the list's
 * children mode instead — the estimate positions a mounted-but-unpainted row,
 * so a variable row would sit where the estimate put it until it paints
 * (`virtual-list-rows`).
 */

import { Virtualizer } from "@tanstack/virtual-core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** Rows mounted beyond the viewport on each side, against the range's lag. */
export const DEFAULT_OVERDRAW = 4;

/** The rows a window holds: `start` inclusive, `end` exclusive. */
export interface VirtualWindow {
  readonly start: number;
  readonly end: number;
}

/** What a window is computed from. */
export interface WindowSpec {
  /** The logical row count. */
  readonly count: number;
  /** The painted height of one row, in pixels. */
  readonly rowHeight: number;
  /** The list viewport's height, in pixels. */
  readonly viewportHeight: number;
  /** Rows mounted beyond the viewport on each side. Defaults to `4`. */
  readonly overdraw?: number;
}

/**
 * The window calculator over one row shape.
 *
 * The calculator owns the core's virtualizer, so the row set is measured once
 * and a scroll only recomputes the range.
 */
export interface WindowCalculator {
  /** The rows the window mounts at a scroll offset, in paint order. */
  readonly indicesAt: (scrollOffset: number) => ReadonlyArray<number>;
  /** The window the core mounts at a scroll offset, in pixels. */
  readonly at: (scrollOffset: number) => VirtualWindow;
  /** The window that holds a row, for a reveal. */
  readonly around: (index: number) => VirtualWindow;
}

/** A row height that can divide. */
const rowHeightOf = (spec: WindowSpec): number =>
  Number.isFinite(spec.rowHeight) && spec.rowHeight > 0 ? spec.rowHeight : 1;

/** A viewport that can hold a row. */
const viewportOf = (spec: WindowSpec): number =>
  Number.isFinite(spec.viewportHeight) && spec.viewportHeight > 0
    ? spec.viewportHeight
    : rowHeightOf(spec);

/** The row count as a whole number. */
const countOf = (spec: WindowSpec): number =>
  Number.isFinite(spec.count) ? Math.max(0, Math.floor(spec.count)) : 0;

/**
 * The farthest a window may scroll over the rows it is given.
 *
 * A scroll offset belongs to the set it was measured against: when a filter
 * narrows a thousand rows to a hundred, the offset the reader left is past the
 * new content and the runtime clamps its own scroll to the end. The app's
 * window must follow that clamp in the same commit, or it keeps holding rows the
 * set no longer has (`virtual-table-lifecycle`: a row outside the narrowed set
 * still reported its box until the next gesture moved the window).
 */
export const maxScrollOffset = (spec: WindowSpec): number =>
  Math.max(0, countOf(spec) * rowHeightOf(spec) - viewportOf(spec));

/** An offset clamped into the rows a spec holds. */
export const clampScrollOffset = (
  spec: WindowSpec,
  scrollOffset: number,
): number => {
  const offset = Number.isFinite(scrollOffset) ? Math.max(0, scrollOffset) : 0;
  return Math.min(offset, maxScrollOffset(spec));
};

/**
 * A calculator over one row shape.
 *
 * The core is constructed without a scroll element, so it never touches the
 * DOM: the scroll offset and the viewport are the two numbers it is given.
 */
export const createWindowCalculator = (spec: WindowSpec): WindowCalculator => {
  const rowHeight = rowHeightOf(spec);
  const virtualizer = new Virtualizer<never, never>({
    count: countOf(spec),
    estimateSize: () => rowHeight,
    getScrollElement: () => null,
    observeElementRect: () => undefined,
    observeElementOffset: () => undefined,
    scrollToFn: () => undefined,
    overscan: Math.max(0, Math.floor(spec.overdraw ?? DEFAULT_OVERDRAW)),
  });

  const indicesAt = (scrollOffset: number): ReadonlyArray<number> => {
    virtualizer.scrollRect = { width: 0, height: viewportOf(spec) };
    virtualizer.scrollOffset = clampScrollOffset(spec, scrollOffset);
    return Arr.filter(
      virtualizer.getVirtualIndexes(),
      (index) => index >= 0 && index < countOf(spec),
    );
  };

  const at = (scrollOffset: number): VirtualWindow => {
    const indices = indicesAt(scrollOffset);
    const first = Option.getOrUndefined(Arr.head(indices));
    const last = Option.getOrUndefined(Arr.last(indices));
    return first === undefined || last === undefined
      ? { start: 0, end: 0 }
      : { start: first, end: last + 1 };
  };

  return {
    indicesAt,
    at,
    around: (index) =>
      at(
        Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)) * rowHeight,
      ),
  };
};

/**
 * The scroll offset a runtime list is at, in pixels.
 *
 * The runtime's own scroll anchor is `[itemIndex, offsetInItemPx,
 * viewportHeightPx]`: the row at the viewport's top edge and how far into it
 * the edge sits. The offset is that row's own position plus the remainder,
 * which is the pixel the window is computed from.
 */
export const anchorOffset = (
  anchor: Option.Option<ReadonlyArray<number>>,
  rowHeight: number,
): Option.Option<number> =>
  Option.flatMap(anchor, (values) => {
    const index = values[0];
    const offsetInItem = values[1];
    return index === undefined || offsetInItem === undefined
      ? Option.none()
      : Option.some(Math.max(0, index * rowHeight + offsetInItem));
  });
