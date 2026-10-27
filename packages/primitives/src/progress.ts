/**
 * The progress route: `@gpuixui/primitives/progress`.
 *
 * The package root re-exports every primitive, so a package that needs one bar
 * would load all of Tier 1 to paint it. This entry publishes the bar and its
 * four parts on their own, the route `./button`, `./hint` and `./scroll-area`
 * take. It is a re-export seam, not a second implementation.
 */

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "./components/Progress.js";
export type {
  ProgressIndicatorProps,
  ProgressLabelProps,
  ProgressProps,
  ProgressTrackProps,
  ProgressValueProps,
} from "./components/Progress.js";
export type { ProgressSize, ProgressTone } from "./core/style.js";
