/**
 * The toggle route: `@gpuixui/primitives/toggle`.
 *
 * The package root re-exports every primitive, so a package that needs one
 * pressed mode would load all of Tier 1 to paint it. This entry publishes the
 * toggle and the two readers a caller words it with, the route `./button`,
 * `./hint` and `./scroll-area` take. It is a re-export seam, not a second
 * implementation.
 */

export { Toggle, pressedValueText } from "./components/Toggle.js";
export type { ToggleProps, ToggleState } from "./components/Toggle.js";
export type { ToggleVariant } from "./core/variants.js";
