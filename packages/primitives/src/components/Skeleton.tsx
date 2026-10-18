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
import {
  PULSE_STEPS,
  pulseOpacity,
  skeletonStyle,
  type SkeletonSpec,
} from "../core/loading.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SkeletonProps extends SkeletonSpec {
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The element tree `Skeleton` renders at the given pulse opacity. */
export const renderSkeleton = (
  { style, testId, ...spec }: SkeletonProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => (
  <div
    testId={testId}
    style={mergeStyle(
      { ...skeletonStyle(spec, theme), opacity: pulseOpacity(step) },
      style,
    )}
  />
);

/** A pulsing placeholder block. */
export const Skeleton = (props: SkeletonProps): ReactElement =>
  renderSkeleton(props, useTheme(), useStep(PULSE_STEPS, 700));
