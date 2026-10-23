/**
 * What a view swap decides before the renderer runs.
 *
 * `@gpuix/native@0.11.0` cannot keep the outgoing view mounted beside the
 * incoming one honestly: it has no `aria-hidden`, so both would sit in the
 * accessibility tree while the exit runs (the rule `RollingText` follows for a
 * value). A page swap therefore runs in two halves — the view on screen leaves,
 * then it is replaced and the new view arrives — and this module is the state
 * machine that orders those halves and survives a change mid-flight.
 *
 * The frames are a fade plus a relative `left`, because the runtime has no
 * `transform` (upstream issue #102): the outgoing view travels toward the edge
 * the reader came from and the incoming one arrives from the far edge.
 */

import type { MotionStyle } from "@gpuix/react";
import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The directions a reader can move through the views. */
const ViewDirection = Schema.Literals(["forward", "back"]);

/** Which way the reader is moving through the views. */
export type PageDirection = typeof ViewDirection.Type;

/**
 * The direction a swap travels, read from a value that may be a stored choice.
 *
 * `PageDirection` is a compile-time guarantee, but `direction` can arrive from
 * persisted UI state the library never type-checked. A name the union does not
 * carry is `forward` — the house direction — rather than a `Match.exhaustive`
 * that throws out of the render and takes the region with it.
 */
const directionOf = (direction: unknown): PageDirection =>
  Schema.is(ViewDirection)(direction) ? direction : "forward";

/** Where a swap is: at rest, holding the outgoing view, or arriving. */
export type PagePhase = "rest" | "leaving" | "entering";

/** The house travel between two views, in pixels. */
export const PAGE_TRAVEL = 16;

/** The three frames a view moves between. */
export interface PageFrames {
  /** Where the incoming view starts: off its resting place on the arrival edge. */
  readonly enterFrom: MotionStyle;
  /** The resting view: home, fully opaque. */
  readonly rest: MotionStyle;
  /** Where the outgoing view goes: off its resting place on the other edge. */
  readonly exitTo: MotionStyle;
}

/** A usable travel distance: positive and finite, else the house step. */
export const pageTravel = (distance: number): number =>
  Number.isFinite(distance) && distance > 0
    ? Math.round(distance)
    : PAGE_TRAVEL;

/**
 * The frames of one swap.
 *
 * `forward` reads as moving right through a document: the outgoing view leaves
 * toward the left and the incoming one arrives from the right. `back` mirrors
 * it, so a reader who goes back sees the movement they came from. A direction
 * the union does not name is `forward` — the house direction — rather than a
 * `Match.exhaustive` that throws out of the render, because `direction` can be
 * a stored setting the library never type-checked.
 */
export const pageFrames = (
  direction: unknown,
  distance: number,
): PageFrames => {
  const travel = pageTravel(distance);

  return Match.value(directionOf(direction)).pipe(
    Match.when("forward", () => ({
      enterFrom: { opacity: 0, left: travel },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: -travel },
    })),
    Match.when("back", () => ({
      enterFrom: { opacity: 0, left: -travel },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: travel },
    })),
    Match.exhaustive,
  );
};

/**
 * One swap at a point in time.
 *
 * `run` counts the views that have been mounted: the renderer keys the view on
 * it, so returning to a view the reader left remounts it instead of reviving a
 * stale subtree.
 */
export interface PageTransitionState {
  /** The view painted now. */
  readonly shownKey: string;
  /** The view waiting for the current exit to finish, if any. */
  readonly pendingKey: Option.Option<string>;
  readonly phase: PagePhase;
  readonly run: number;
}

/** The state a region starts in, painted at rest on its first view. */
export const initialPageTransition = (
  viewKey: string,
): PageTransitionState => ({
  shownKey: viewKey,
  pendingKey: Option.none(),
  phase: "rest",
  run: 0,
});

/**
 * Apply a view change.
 *
 * - at rest: the outgoing view starts leaving and `viewKey` waits behind it;
 * - while leaving: the newest request replaces the waiting view without
 *   restarting the exit (a reader who arrows quickly sees one exit, not a queue);
 * - returning to the view still on screen cancels the swap, so it settles back
 *   instead of leaving and remounting the same content;
 * - `instant` (reduced motion, `level="none"`) swaps in the frame it changes.
 */
export const requestPage = (
  state: PageTransitionState,
  viewKey: string,
  instant: boolean,
): PageTransitionState => {
  if (viewKey === state.shownKey) {
    if (Option.isNone(state.pendingKey)) return state;
    return { ...state, pendingKey: Option.none(), phase: "entering" };
  }

  if (instant) {
    return {
      shownKey: viewKey,
      pendingKey: Option.none(),
      phase: "rest",
      run: state.run + 1,
    };
  }

  return state.phase === "leaving"
    ? { ...state, pendingKey: Option.some(viewKey) }
    : { ...state, pendingKey: Option.some(viewKey), phase: "leaving" };
};

/** The exit has run: mount the waiting view and let it arrive. */
export const settlePage = (state: PageTransitionState): PageTransitionState =>
  state.phase !== "leaving"
    ? state
    : Option.match(state.pendingKey, {
        onNone: () => state,
        onSome: (viewKey) => ({
          shownKey: viewKey,
          pendingKey: Option.none(),
          phase: "entering",
          run: state.run + 1,
        }),
      });

/** The arrival has run: the view is home. */
export const finishPage = (state: PageTransitionState): PageTransitionState =>
  state.phase === "entering" ? { ...state, phase: "rest" } : state;
