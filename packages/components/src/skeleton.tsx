/** @jsxImportSource @gpuix/react */
import {
  Skeleton as PrimitiveSkeleton,
  type SkeletonProps as PrimitiveSkeletonProps,
} from "@gpuixui/primitives/skeleton";

export interface SkeletonProps extends Omit<
  PrimitiveSkeletonProps,
  "reducedMotion"
> {
  readonly animate?: boolean;
}

export const Skeleton = ({ animate, ...rest }: SkeletonProps) => (
  <PrimitiveSkeleton
    {...rest}
    reducedMotion={animate === false ? true : undefined}
  />
);

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
