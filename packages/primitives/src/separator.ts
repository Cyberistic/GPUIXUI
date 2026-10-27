/**
 * The separator route: `@gpuixui/primitives/separator`.
 *
 * The package root re-exports every primitive, so a package that needs one rule
 * would load all of Tier 1 to paint it. This entry publishes the rule on its
 * own, the route `./button`, `./hint` and `./scroll-area` take. It is a
 * re-export seam, not a second implementation.
 */

export { Separator } from "./components/Separator.js";
export type { SeparatorProps } from "./components/Separator.js";
