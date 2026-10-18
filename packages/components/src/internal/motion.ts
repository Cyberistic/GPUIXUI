/**
 * The runtime motion props from a `@gpuixui/tw` recipe.
 *
 * `TwMotion` carries the resolved `MotionProps` plus the classes the runtime
 * cannot animate (`zoom-*`), which must not reach a host element. This helper
 * keeps the recipe's bookkeeping out of the JSX (plan 525).
 */

import type { MotionProps } from "@gpuix/react";
import type { TwMotion } from "@gpuixui/tw";

/** Keep the motion fields, drop the `unsupported` list. */
export const motionProps = (motion: TwMotion): MotionProps => ({
  ...(motion.initial === undefined ? {} : { initial: motion.initial }),
  animate: motion.animate,
  ...(motion.exit === undefined ? {} : { exit: motion.exit }),
  ...(motion.transition === undefined ? {} : { transition: motion.transition }),
});
