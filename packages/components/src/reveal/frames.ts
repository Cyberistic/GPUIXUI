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
import * as Schema from "effect/Schema";

/** The edges a reveal can arrive from, read from a value a caller stores. */
const RevealEdge = Schema.Literals(["below", "above", "left", "right", "none"]);

/** Where the content comes from. `"none"` is a plain fade. */
export type RevealFrom = typeof RevealEdge.Type;

/**
 * The edge the frames travel from, read from a value that may be a stored
 * choice.
 *
 * `RevealFrom` is a compile-time guarantee, but `from` can arrive from persisted
 * UI state the library never type-checked. A name the union does not carry is
 * the house edge, `"below"` — the direction a reveal that asked for nothing
 * arrives from — rather than a `Match.exhaustive` that throws out of the render
 * and takes the surface with it.
 */
const revealEdgeOf = (from: unknown): RevealFrom =>
  Schema.is(RevealEdge)(from) ? from : "below";

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
 * `NaN`, and an edge the union does not name is the house `below` arrival
 * ({@link revealEdgeOf}).
 */
export const revealFrames = (from: unknown, distance: number): RevealFrames => {
  const travel =
    Number.isFinite(distance) && distance > 0 ? Math.round(distance) : 8;

  return Match.value(revealEdgeOf(from)).pipe(
    Match.when("none", () => still),
    Match.when("below", () => travelling("top", travel)),
    Match.when("above", () => travelling("top", -travel)),
    Match.when("right", () => travelling("left", travel)),
    Match.when("left", () => travelling("left", -travel)),
    Match.exhaustive,
  );
};
