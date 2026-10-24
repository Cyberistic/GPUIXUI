/**
 * A size the layout can paint.
 *
 * A size is often computed — a pane's height, a share of a window, a
 * measurement taken before the first layout — and `@gpuix/native@0.11.0` drops a
 * value it cannot lay out: the style batch is serialised with `JSON.stringify`
 * before it reaches native, so `NaN` and the infinities arrive as `null` and the
 * property is dropped. The box then keeps the flex settings the style wrote
 * beside it (`flexGrow: 0`, `flexShrink: 0`) and **no basis**, so it collapses
 * to its content — or to nothing at all.
 *
 * Measured on 0.11.0:
 *
 * - a table's row scroller given a `NaN` height painted **37 points** — the one
 *   row it held — instead of the **280** its measured frame gives it, so the
 *   rows below the first overflowed a scroller that could not scroll;
 * - a windowed table given a `NaN` height painted **no row at all**, against
 *   the **8** the same table paints with a readable height; the same held for
 *   the windowed table's body and for the windowed tree;
 * - a tree given a `NaN` height painted **640 points** inside a **200**-point
 *   pane, so it overflowed its pane instead of scrolling inside it;
 * - a frozen pane given a negative `frozenWidth` painted **no pinned column at
 *   all** (0 points) and handed the data pane the whole 1280-point frame, and a
 *   negative `contentWidth` painted the data pane's column at **0 points**, so
 *   the scrolling header and rows had no box.
 *
 * The rule is the one a cell's width already follows: a width that cannot paint
 * is **no width**, so the cell shares the leftover track and a column's header
 * and its cells keep one track.
 *
 * A size the layout cannot paint therefore reads as **no size**, the reading the
 * prop already has when it is omitted: the caller's layout owns the box, and a
 * table measures its own body. A negative size is no size either — the runtime
 * accepts it and paints nothing usable.
 */

import * as Option from "effect/Option";

/**
 * A size the layout can paint, or none when it cannot.
 *
 * A finite, non-negative size is the caller's; `NaN`, an infinity and a
 * negative are absent, because none of them reaches the runtime as a length.
 * Zero is a size: an empty box is a caller's choice, not an unreadable value.
 */
export const paintableSize = (
  size: number | undefined,
): Option.Option<number> =>
  Option.filter(
    Option.fromNullishOr(size),
    (value) => Number.isFinite(value) && value >= 0,
  );
