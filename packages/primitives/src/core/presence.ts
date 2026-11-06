import type { MotionProps } from "@gpuix/react";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  type PresenceFrames,
  type PresenceSide,
  type PresenceTiming,
} from "@gpuixui/motion/presence";

export { exitWindowMs, fadeFromAnchor, presenceStyle };

export type AnchorSide = PresenceSide;

export type SurfaceFrames = PresenceFrames;

export type SurfaceTiming = PresenceTiming;

export const surfaceTiming = (reducedMotion = false): SurfaceTiming =>
  presenceTiming("fast", reducedMotion ? "reduced" : "animated");

export const surfaceMotion = (
  frames: SurfaceFrames,
  present: boolean,
  timing: SurfaceTiming,
): MotionProps => presenceMotion(frames, present, timing);
