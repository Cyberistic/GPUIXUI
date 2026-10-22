/**
 * The action route: `@gpuixui/primitives/button`.
 *
 * The package root re-exports every primitive, so a package that needs one
 * action would load all of Tier 1 to paint it. The `./hint` seam measured that
 * route at 52 modules / 416 KiB against a subpath's 5 / 49, which is why a
 * second implementation of the same button was kept in `@gpuixui/components`
 * rather than pay it (plan 160). This entry publishes `Button`, `IconButton`
 * and their prop types on their own, so the route is one control.
 *
 * It is a re-export seam, not a second implementation: the components, their
 * props and every rule behind them are the ones in `components/`. It lives at
 * `src/button.ts` because `src/components/button.ts` would differ from
 * `Button.tsx` only in case — two such paths collide on a case-insensitive
 * volume — and re-exporting `IconButton` from `Button.tsx` would make the two
 * implementations import each other.
 */

export { Button } from "./components/Button.js";
export type { ButtonProps } from "./components/Button.js";

export { IconButton } from "./components/IconButton.js";
export type { IconButtonProps } from "./components/IconButton.js";
