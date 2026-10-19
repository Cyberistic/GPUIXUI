/**
 * The animated host surface, and the runtime motion props behind it.
 *
 * `@gpuix/react`'s `motion.div` forwards every prop to the native `div` at
 * runtime, but its published `MotionDivProps` omits `testId`, `role` and the
 * `aria-*` props (0.10.0). `MotionSurface` restores the host surface so an
 * animated box can carry the same identity as a plain part (plan 597).
 *
 * A `@gpuixui/tw` recipe's `TwMotion` carries the resolved `MotionProps` plus the
 * classes the runtime cannot animate (`zoom-*`), which must not reach a host
 * element. `motionProps` keeps that bookkeeping out of the JSX (plan 525).
 */

import { motion, type MotionProps, type Props } from "@gpuix/react";
import type { TwMotion } from "@gpuixui/tw";

/** The runtime motion fields plus the full GPUix host surface. */
export interface MotionSurfaceProps
  extends MotionProps, Omit<Props, "motion"> {}

/** An animated `div` that accepts the full GPUix host surface. */
export const MotionSurface = (props: MotionSurfaceProps) => (
  <motion.div {...props} />
);

/** Keep the motion fields, drop the `unsupported` list. */
export const motionProps = (motion: TwMotion): MotionProps => ({
  ...(motion.initial === undefined ? {} : { initial: motion.initial }),
  animate: motion.animate,
  ...(motion.exit === undefined ? {} : { exit: motion.exit }),
  ...(motion.transition === undefined ? {} : { transition: motion.transition }),
});
