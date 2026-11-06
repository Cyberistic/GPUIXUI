import { swapFrames, type SwapFrames } from "../internal/text-swap.js";

export type SlideDirection = "forward" | "back";

export const slideFrames = (
  direction: SlideDirection,
  width: number,
): SwapFrames => swapFrames("left", direction === "forward" ? 1 : -1, width);
