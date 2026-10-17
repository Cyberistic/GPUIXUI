/**
 * The pointer points for a live drag-select.
 *
 * Mirrors `Native.selectText`'s measured geometry (plan `163` §8): start just
 * inside the first box, end **past** the last box's right edge and near its
 * bottom. Ending inside the last glyph truncates it, which would make the check
 * pass against a partial copy.
 */
import type { Smoke } from "@gpuixui/testing";

/** Where a drag starts and ends to select `from` through `to`. */
export const selectionDrag = (
  from: Smoke.Bounds,
  to: Smoke.Bounds,
): {
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
} => ({
  start: { x: from.x + 2, y: from.y + 2 },
  end: { x: to.x + to.width, y: to.y + to.height - 2 },
});
