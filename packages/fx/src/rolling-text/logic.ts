/**
 * Which edge a rolling value leaves through.
 *
 * The state machine and the timing are `internal/text-swap.ts` (a slide shares
 * them on the other axis); this module names the vertical direction as the
 * shared frame rule expects it. `up` is a counter: the incoming value comes from
 * below and the outgoing one leaves above.
 */

import { swapFrames, type SwapFrames } from "../internal/text-swap.js";

/** Which way the value travels: upwards (a counter) or downwards. */
export type RollDirection = "up" | "down";

/** The three frames a roll paints, at one line of travel. */
export const rollFrames = (
  direction: RollDirection,
  lineHeight: number,
): SwapFrames => swapFrames("top", direction === "up" ? 1 : -1, lineHeight);
