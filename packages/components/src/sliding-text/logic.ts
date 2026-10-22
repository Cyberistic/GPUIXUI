/**
 * Which way a sliding value travels, and how far.
 *
 * The frames and the timing are `internal/text-swap.ts` (a roll shares them on
 * the vertical axis); this module names the horizontal direction and is where the
 * distance is decided. A slide has no known distance until its clip box has been
 * laid out — the runtime keeps every inset a number, never a percentage of the
 * parent — so the caller passes the width it measured, and an unmeasured box
 * (`0`) fades the value in place instead of throwing a `NaN` at the runtime.
 */

import { swapFrames, type SwapFrames } from "../internal/text-swap.js";

/**
 * Which way the value travels: `"forward"` reads left to right (the next value
 * arrives from the right), `"back"` mirrors it.
 */
export type SlideDirection = "forward" | "back";

/** The three frames a slide paints, across one clip width. */
export const slideFrames = (
  direction: SlideDirection,
  width: number,
): SwapFrames => swapFrames("left", direction === "forward" ? 1 : -1, width);
