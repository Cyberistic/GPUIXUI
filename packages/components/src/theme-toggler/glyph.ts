import type { MotionStyle } from "@gpuix/react";

export const recededShare = 0.55;

export const incomingDelayShare = 0.15;

export const glyphFrame = (box: number, shown: boolean): MotionStyle => {
  const side = shown ? box : box * recededShare;
  const inset = (box - side) / 2;
  return {
    width: side,
    height: side,
    left: inset,
    top: inset,
    opacity: shown ? 1 : 0,
  };
};
