/**
 * The spinner route: `@gpuixui/primitives/spinner`.
 *
 * The barrel re-exports every primitive, so a package that needs one activity
 * indicator would load all of Tier 1 to paint it. This entry publishes the mark
 * on its own, the route `./button`, `./hint` and `./scroll-area` take. It is a
 * re-export seam, not a second implementation.
 */

export { Spinner, renderSpinner } from "./components/Spinner.js";
export type { SpinnerProps } from "./components/Spinner.js";
export {
  SPINNER_ARC_TICKS,
  SPINNER_RING_TICKS,
  spinnerTicks,
} from "./core/loading.js";
export type { SpinnerAccent, SpinnerTick } from "./core/loading.js";
