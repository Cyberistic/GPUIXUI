import type { MotionTransition } from "@gpuix/react";

export { reducedMotionOf } from "@gpuixui/motion/timing";

export const stillFrame = (step: number, reducedMotion?: boolean): number =>
  reducedMotion === true ? 0 : step;

export const stillTransition = (
  transition: MotionTransition,
  reducedMotion?: boolean,
): MotionTransition => (reducedMotion === true ? { duration: 0 } : transition);
