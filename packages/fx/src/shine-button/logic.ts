import type { LinearGradientBackground, MotionStyle } from "@gpuix/react";

export type SheenHalf = "lead" | "trail";

export const sheenOpacity = 0.2;

export interface SheenFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
}

export const sheenHalf = (controlWidth: number): number =>
  Math.max(16, Math.round(controlWidth / 4));

export const sheenFrames = (
  half: number,
  controlWidth: number,
  side: SheenHalf,
): SheenFrames => {
  const offset = side === "lead" ? 0 : half;
  return {
    initial: { left: -2 * half + offset },
    animate: { left: controlWidth + offset },
  };
};

export const sheenGradient = (
  lit: string,
  clear: string,
  side: SheenHalf,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: 90,
  stops:
    side === "lead"
      ? [
          { color: clear, position: 0 },
          { color: lit, position: 1 },
        ]
      : [
          { color: lit, position: 0 },
          { color: clear, position: 1 },
        ],
});
