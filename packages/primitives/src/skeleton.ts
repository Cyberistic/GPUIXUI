/**
 * The skeleton route: `@gpuixui/primitives/skeleton`.
 *
 * The package root re-exports every primitive, so a package that needs one
 * placeholder would load all of Tier 1 to paint it. This entry publishes the
 * block on its own, the route `./button`, `./hint` and `./scroll-area` take. It
 * is a re-export seam, not a second implementation.
 */

export { Skeleton, renderSkeleton } from "./components/Skeleton.js";
export type { SkeletonProps } from "./components/Skeleton.js";
export type { SkeletonSpec } from "./core/loading.js";
