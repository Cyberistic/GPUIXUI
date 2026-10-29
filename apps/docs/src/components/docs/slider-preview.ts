/**
 * The browser glue between a range drag and the slider's own arithmetic.
 *
 * A drag holds the end it is **not** moving: the press names the nearer end to
 * the pointer, and the other end's value is the anchor. Every move draws the
 * span around that anchor with `spanFrom`, so the ends are ordered by
 * construction. That is also what makes a crossing continuous: the dragged end
 * passes the anchor, `spanFrom` puts it on the far side, and the thumb the
 * pointer is now dragging is the other one — no clamp, no collapsed pair and no
 * stale press point to jump back to.
 */

import {
  spanFrom,
  type ValueRange,
  type ValueSpan,
} from "@gpuixui/primitives/core";

/** The end a press pinned: the one the pointer is not moving. */
export interface SpanDrag {
  readonly anchor: number;
}

/** The span a pointer at `value` draws from a grabbed pair. */
export const dragSpan = (
  drag: SpanDrag,
  value: number,
  range: ValueRange,
): ValueSpan => spanFrom(drag.anchor, value, range);
