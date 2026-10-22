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
import { cn } from "@gpuixui/tw";
import {
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  type SkeletonSpec,
} from "../core/loading.js";
import { stillFrame } from "../core/motion.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { skeletonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SkeletonProps extends SkeletonSpec {
  /**
   * Paint one frame and schedule no interval. The runtime exposes no
   * reduced-motion preference, so the caller passes its own.
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
export const Skeleton = (props: SkeletonProps): ReactElement =>
  renderSkeleton(
    props,
    useTheme(),
    useStep(PULSE_STEPS, 700, props.reducedMotion !== true),
  );
