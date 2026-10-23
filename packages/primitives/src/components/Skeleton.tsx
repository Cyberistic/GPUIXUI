/**
 * `Skeleton` — a loading placeholder.
 *
 * The runtime's `motion` animates opacity but nothing else useful here, so the
 * pulse is a discrete step the component advances and `opacity` follows
 * `core/loading.ts`'s `pulseOpacity`. It reads as absence because it paints the
 * skeleton role, never the surface it stands in for.
 *
 * `reducedMotion` is the caller's answer to a preference the runtime does not
 * expose: the block keeps the skeleton role but paints one frame and schedules
 * no interval.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { useMotionPreference } from "@gpuixui/motion/react";
import { cn } from "@gpuixui/tw";
import {
  PULSE_INTERVAL_MS,
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  type SkeletonSpec,
} from "../core/loading.js";
import { reducedMotionOf, stillFrame } from "../core/motion.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { skeletonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SkeletonProps extends SkeletonSpec {
  /**
   * Paint one frame and schedule no interval. Defaults to the motion
   * provider's preference (`MotionProvider`); the runtime exposes none of its
   * own.
   */
  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

export const renderSkeleton = (
  { style, className, testId, reducedMotion, ...spec }: SkeletonProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => (
  <div
    testId={testId}
    style={mergeStyle(
      mergeStyle(
        recipeTw.classesToStyle(cn(skeletonClass(spec), className), theme)
          .style,
        {
          ...skeletonSize(spec, theme),
          opacity: pulseOpacity(stillFrame(step, reducedMotion)),
        },
      ),
      style,
    )}
  />
);

/** A pulsing placeholder block. */
export const Skeleton = (props: SkeletonProps): ReactElement => {
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSkeleton(
    { ...props, reducedMotion },
    useTheme(),
    // The pulse has its own cadence: no level names a placeholder that
    // alternates while it is on screen (see `core/loading.ts`).
    useStep(PULSE_STEPS, PULSE_INTERVAL_MS, !reducedMotion),
  );
};
