import { swapFrames, type SwapFrames } from "../internal/text-swap.js";

export type RollDirection = "up" | "down";

export const rollFrames = (
  direction: RollDirection,
  lineHeight: number,
): SwapFrames => swapFrames("top", direction === "up" ? 1 : -1, lineHeight);
