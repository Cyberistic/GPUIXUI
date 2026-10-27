/**
 * The browser glue between a range drag and the slider's own arithmetic.
 *
 * A press on two coincident thumbs cannot say which end it grabbed — every
 * direction is a tie — so the pair opens around the press instead of dragging a
 * thumb that has nowhere to go. Once the ends differ, the grab is ordinary: the
 * end the reader pressed follows the pointer and the other stays pinned. That
 * rule is `spanFrom`'s and `moveSpanEnd`'s in the primitive; this module only
 * decides which one the gesture is.
 */

import {
  moveSpanEnd,
  normalizeSpan,
  spanFrom,
  type ValueRange,
  type ValueSpan,
} from "@gpuixui/primitives/core";

/** The end a press grabbed, and the value it landed on. */
export interface SpanDrag {
  readonly end: "start" | "end";
  readonly point: number;
}

/** The span a pointer at `value` draws from a grabbed pair. */
export const dragSpan = (
  drag: SpanDrag,
  span: ValueSpan,
  value: number,
  range: ValueRange,
): ValueSpan => {
  const current = normalizeSpan(span, range);
  return current.start === current.end
    ? spanFrom(drag.point, value, range)
    : moveSpanEnd(current, drag.end, value, range);
};
