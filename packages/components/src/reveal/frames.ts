/**
 * Which edge a reveal enters from, and how far it travels.
 *
 * A reveal only has four honest directions in this runtime: the content fades
 * and travels on `top` or `left`. Zoom would need `transform` and a blur would
 * need a filter — `@gpuix/native@0.11.0`'s `StyleDesc` has neither, so a caller
 * asking for them is given no direction rather than a different effect (plan 600
 * §3, upstream issue #102).
 */

import type { MotionStyle } from "@gpuix/react";
import { Match } from "effect";

/** Where the content comes from. `"none"` is a plain fade. */
export type RevealFrom = "below" | "above" | "left" | "right" | "none";

/** The three frames a reveal paints, at one travel distance. */
export interface RevealFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
  readonly exit: MotionStyle;
}

/** A fade plus a travel of `amount` on `axis`, in both moving frames. */
const travelling = (axis: "top" | "left", amount: number): RevealFrames => ({
  initial: { opacity: 0, [axis]: amount },
  animate: { opacity: 1, [axis]: 0 },
  exit: { opacity: 0, [axis]: amount },
});

/** A fade that travels nowhere. */
const still: RevealFrames = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * A fade plus a travel of `distance` along one axis.
 *
 * `below` starts low and rises (a section arriving under the fold), `above`
 * starts high and drops, and `left`/`right` name the edge the content comes
 * **from**: `right` starts further right and slides left. A broken or negative
 * distance falls back to the house 8 px rather than reaching the runtime as
 * `NaN`.
 */
export const revealFrames = (
  from: RevealFrom,
  distance: number,
): RevealFrames => {
  const travel =
    Number.isFinite(distance) && distance > 0 ? Math.round(distance) : 8;

  return Match.value(from).pipe(
    Match.when("none", () => still),
    Match.when("below", () => travelling("top", travel)),
    Match.when("above", () => travelling("top", -travel)),
    Match.when("right", () => travelling("left", travel)),
    Match.when("left", () => travelling("left", -travel)),
    Match.exhaustive,
  );
};
