/**
 * `Skeleton` — a loading placeholder.
 *
 * The runtime's `motion` animates opacity but nothing else useful here, so the
 * pulse is a discrete step the component advances and `opacity` follows
 * `core/loading.ts`'s `pulseOpacity`. It reads as absence because it paints the
 * skeleton role, never the surface it stands in for.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import {
  PULSE_STEPS,
  pulseOpacity,
  type SkeletonSpec,
} from "../core/loading.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { skeletonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SkeletonProps extends SkeletonSpec {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

export const renderSkeleton = (
  { style, className, testId, ...spec }: SkeletonProps,
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
          width: spec.width ?? "100%",
          height: spec.height ?? theme.typography.body.lineHeight,
          opacity: pulseOpacity(step),
        },
      ),
      style,
    )}
  />
);

/** A pulsing placeholder block. */
export const Skeleton = (props: SkeletonProps): ReactElement =>
  renderSkeleton(props, useTheme(), useStep(PULSE_STEPS, 700));
