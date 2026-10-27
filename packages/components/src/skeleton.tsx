/** @jsxImportSource @gpuix/react */
/**
 * Skeleton: a placeholder block for content that has not arrived.
 *
 * The primitive owns the paint — the theme's `skeleton` role, a corner step, the
 * body-line default and the two-frame opacity pulse. This component adds
 * shadcn's `animate` switch and keeps the reduced-motion rule honest: `false`
 * paints the still frame and schedules no timer, while leaving `animate` out
 * lets the app's `MotionProvider` decide, because a reduced-motion preference
 * is the reader's, not a default a component may overrule.
 *
 * The pulse is a two-state step rather than a shimmer sweep: 0.11.0 animates
 * opacity and size, not a translated gradient (`docs/gpuix-capabilities.md`).
 */

import {
  Skeleton as PrimitiveSkeleton,
  type SkeletonProps as PrimitiveSkeletonProps,
} from "@gpuixui/primitives/skeleton";

/** {@link Skeleton} props. */
export interface SkeletonProps extends Omit<
  PrimitiveSkeletonProps,
  "reducedMotion"
> {
  /**
   * Pulse between the two skeleton frames. Defaults to the motion provider's
   * preference; `false` paints one frame and schedules no timer, which is the
   * still image a reduced-motion preference asks for.
   */
  readonly animate?: boolean;
}

/**
 * A pulsing placeholder block.
 *
 * ```tsx
 * <Skeleton width="45%" height={14} />
 * <Skeleton width={40} height={40} circle animate={false} />
 * ```
 */
export const Skeleton = ({ animate, ...rest }: SkeletonProps) => (
  <PrimitiveSkeleton
    {...rest}
    reducedMotion={animate === false ? true : undefined}
  />
);

/** Inventory record, mirrored into `COMPONENTS.md`'s Skeletons row. */
export const skeletonMeta = {
  name: "Skeletons",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No shimmer sweep: the runtime animates opacity, so the pulse is a two-frame step",
    "The reduced-motion preference comes from the app's `MotionProvider`; the runtime exposes no query of its own",
    "A side that is not a paintable length (a `NaN` measurement, a stored blank) takes its default rather than painting no box",
  ],
  docs: "docs/skeleton.mdx",
  example: "examples/skeleton.example.tsx",
  testFile: "src/behaviour/skeleton.test.tsx",
} as const;
