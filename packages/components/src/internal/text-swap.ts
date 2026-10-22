/**
 * The two halves every text swap shares.
 *
 * The runtime can tween a mounted host from where it is, but it has no way to
 * swap a string and continue from the far edge in the same run, and no
 * `aria-hidden` to keep the outgoing value out of the accessibility tree
 * (`0.11.0`). So a swap is always two halves — the outgoing value leaves, the
 * value is replaced while the clip is empty, the incoming value arrives — and
 * only one value is ever mounted.
 *
 * This module owns the half that is the same for every axis: which phase the
 * swap is in, what a value arriving mid-run does, and the frames a travel on
 * `left` or `top` produces. `RollingText` (vertical) and `SlidingText`
 * (horizontal) name their direction, and nothing else.
 */

import type { MotionStyle, MotionTransition } from "@gpuix/react";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";
import { Match } from "effect";
import * as Option from "effect/Option";

/** Where a swap is in its two halves. */
export type SwapPhase = "rest" | "leaving" | "entering";

/** What a swapping value is doing at one frame. */
export interface SwapState {
  /** The value painted now, which is also the accessible name. */
  readonly shown: string;
  /** The host identity: a new run is a new `<text>` host. */
  readonly run: number;
  readonly phase: SwapPhase;
  /** The value waiting for the swap, `None` outside the leaving half. */
  readonly pending: Option.Option<string>;
}

/** A value painted at rest, with no run behind it. */
export const initialSwap = (text: string): SwapState => ({
  shown: text,
  run: 0,
  phase: "rest",
  pending: Option.none(),
});

/** Paint `text` at once, with no swap: the reduced preference and a mount. */
const jump = (state: SwapState, text: string): SwapState =>
  state.shown === text && state.phase === "rest"
    ? state
    : {
        shown: text,
        run: state.shown === text ? state.run : state.run + 1,
        phase: "rest",
        pending: Option.none(),
      };

/**
 * Ask the swap to show `text`.
 *
 * A value that arrives during the exit **replaces** the pending one instead of
 * queueing, so a clock that ticks faster than a swap lands on the newest value
 * rather than replaying every step. A value that arrives during the entry starts
 * a new exit from where the incoming host has got to. Asking for the value
 * already on screen changes nothing, and asking for it again mid-exit travels it
 * back instead of finishing the swap.
 */
export const requestSwap = (
  state: SwapState,
  text: string,
  reduced: boolean,
): SwapState =>
  reduced
    ? jump(state, text)
    : Match.value(state.phase).pipe(
        Match.when("leaving", () =>
          state.shown === text
            ? { ...state, phase: "entering" as const, pending: Option.none() }
            : { ...state, pending: Option.some(text) },
        ),
        Match.when("entering", () =>
          state.shown === text
            ? state
            : {
                ...state,
                phase: "leaving" as const,
                pending: Option.some(text),
              },
        ),
        Match.when("rest", () =>
          state.shown === text
            ? state
            : {
                ...state,
                phase: "leaving" as const,
                pending: Option.some(text),
              },
        ),
        Match.exhaustive,
      );

/** Swap in the pending value once the exit has run. */
export const settleSwap = (state: SwapState): SwapState =>
  Option.match(state.pending, {
    onNone: () => state,
    onSome: (text) => ({
      shown: text,
      run: state.run + 1,
      phase: "entering",
      pending: Option.none(),
    }),
  });

/** The inset a swap travels on. */
export type SwapAxis = "left" | "top";

/** Which way along {@link SwapAxis} the incoming value comes from. */
export type Travel = 1 | -1;

/** The three frames a swap paints, at one travel distance. */
export interface SwapFrames {
  /** Where the incoming value starts: beyond the clip's far edge. */
  readonly enterFrom: MotionStyle;
  /** The resting frame both halves head for. */
  readonly rest: MotionStyle;
  /** Where the outgoing value goes: beyond the clip's near edge. */
  readonly exitTo: MotionStyle;
}

/** One frame on the named axis. */
const frame = (axis: SwapAxis, offset: number, opacity: number): MotionStyle =>
  axis === "top" ? { opacity, top: offset } : { opacity, left: offset };

/**
 * A fade plus a travel of `distance` from the named edge.
 *
 * `travel` is `1` when the incoming value comes from the increasing edge and
 * `-1` otherwise, so the same rule serves a roll (`top`) and a slide (`left`).
 * A distance that cannot be laid out travels nothing, and a zero is written as
 * `0` rather than `-0` because a frame is compared as a value.
 */
export const swapFrames = (
  axis: SwapAxis,
  travel: Travel,
  distance: number,
): SwapFrames => {
  const length = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const offset = (sign: Travel): number => (length === 0 ? 0 : sign * length);
  return {
    enterFrom: frame(axis, offset(travel), 0),
    rest: frame(axis, 0, 1),
    exitTo: frame(axis, offset(travel === 1 ? -1 : 1), 0),
  };
};

/** The two half-tweens a swap runs, and the instant between them. */
export interface SwapTiming {
  readonly exit: MotionTransition;
  readonly enter: MotionTransition;
  /** How long the exit half runs, in milliseconds. */
  readonly swapMs: number;
}

/** Halve a level's timing so the exit and the entry share one swap's budget. */
const halve = (timing: MotionTransition): MotionTransition => ({
  ...timing,
  duration: (timing.duration ?? 0) / 2,
});

/**
 * The level split across the two halves: a `normal` swap is 200 ms end to end,
 * so each value travels for 100 ms. Under the reduced preference both halves are
 * zero and the swap is immediate.
 */
export const swapHalves = (
  level: MotionLevel,
  preference: MotionPreference,
): SwapTiming => {
  const exit = halve(motionTiming(level, { phase: "exit", preference }));
  return {
    exit,
    enter: halve(motionTiming(level, { phase: "enter", preference })),
    swapMs: Math.round((exit.duration ?? 0) * 1000),
  };
};
