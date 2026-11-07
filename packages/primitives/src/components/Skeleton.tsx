/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
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
import { mergeStyle, useStep, type ElementHostProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SkeletonProps extends SkeletonSpec, ElementHostProps {
  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const renderSkeleton = (
  {
    style,
    className,
    testId,
    reducedMotion,
    ref,
    "aria-id": controlId,
    onLayout,
    ...spec
  }: SkeletonProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => (
  <div
    ref={ref}
    aria-id={controlId}
    onLayout={onLayout}
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

export const Skeleton = (props: SkeletonProps): ReactElement => {
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSkeleton(
    { ...props, reducedMotion },
    useTheme(),

    useStep(PULSE_STEPS, PULSE_INTERVAL_MS, !reducedMotion),
  );
};
