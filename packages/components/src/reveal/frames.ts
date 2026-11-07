import type { MotionStyle } from "@gpuix/react";
import { Match } from "effect";
import * as Schema from "effect/Schema";

const RevealEdge = Schema.Literals(["below", "above", "left", "right", "none"]);

export type RevealFrom = typeof RevealEdge.Type;

const revealEdgeOf = (from: unknown): RevealFrom =>
  Schema.is(RevealEdge)(from) ? from : "below";

export interface RevealFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
  readonly exit: MotionStyle;
}

const travelling = (axis: "top" | "left", amount: number): RevealFrames => ({
  initial: { opacity: 0, [axis]: amount },
  animate: { opacity: 1, [axis]: 0 },
  exit: { opacity: 0, [axis]: amount },
});

const still: RevealFrames = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

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
