/**
 * The scroll route: `@gpuixui/primitives/scroll-area`.
 *
 * The package root re-exports every primitive, so a package that needs one
 * scroll box would load all of Tier 1 to paint it — the hint seam measured that
 * route at 52 modules / 416 KiB against a subpath's 5 / 49. This entry publishes
 * the two scroll parts and their prop types on their own, so a scroll reading
 * in another package can compose the keyboard contract instead of duplicating
 * a viewport without it.
 *
 * It is a re-export seam, not a second implementation: the components, their
 * props and every rule behind them are the ones in `components/ScrollArea.tsx`.
 */

export { ScrollArea, ScrollAreaViewport } from "./components/ScrollArea.js";
export type {
  ScrollAreaProps,
  ScrollAreaViewportProps,
} from "./components/ScrollArea.js";
