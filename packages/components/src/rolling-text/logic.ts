/**
 * How a rolling value leaves, when the next one appears, and which way it
 * travels.
 *
 * A roll is two halves, not one tween: the runtime can tween a mounted host from
 * where it is, but it has no way to swap a string and continue from the far edge
 * in the same run. So the outgoing value travels out of the clip, the swap
 * happens while the clip is empty, and the incoming value travels in from the
 * opposite edge. The rules here are pure, so the renderer suite only has to
 * prove the clock and the paint call them.
 */

import type { MotionStyle, MotionTransition } from "@gpuix/react";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";
import { Match } from "effect";
import * as Option from "effect/Option";

/** Which way the value travels: upwards (a counter) or downwards. */
export type RollDirection = "up" | "down";

/** Where a roll is in its two halves. */
export type RollPhase = "rest" | "leaving" | "entering";

/** What a rolling value is doing at one frame. */
export interface RollState {
  /** The value painted now. */
  readonly shown: string;
  /** The host identity: a new run is a new `<text>` host. */
  readonly run: number;
  readonly phase: RollPhase;
  /** The value waiting for the swap, `None` outside the leaving half. */
  readonly pending: Option.Option<string>;
}

/** A value painted at rest, with no run behind it. */
export const initialRoll = (text: string): RollState => ({
  shown: text,
  run: 0,
  phase: "rest",
  pending: Option.none(),
});

/** Paint `text` at once, with no roll: the reduced preference and a mount. */
const jump = (state: RollState, text: string): RollState =>
  state.shown === text && state.phase === "rest"
    ? state
    : {
        shown: text,
        run: state.shown === text ? state.run : state.run + 1,
        phase: "rest",
        pending: Option.none(),
      };

/**
 * Ask the roll to show `text`.
 *
 * A value that arrives during the exit **replaces** the pending one instead of
 * queueing, so a clock that ticks faster than a roll lands on the newest value
 * rather than replaying every step. A value that arrives during the entry starts
 * a new exit from where the incoming host has got to. Asking for the value
 * already on screen changes nothing, and asking for it again mid-exit travels it
 * back instead of finishing the swap.
 */
export const requestRoll = (
  state: RollState,
  text: string,
  reduced: boolean,
): RollState =>
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
export const settleRoll = (state: RollState): RollState =>
  Option.match(state.pending, {
    onNone: () => state,
    onSome: (text) => ({
      shown: text,
      run: state.run + 1,
      phase: "entering",
      pending: Option.none(),
    }),
  });

/** The three frames a roll paints, at one travel distance. */
export interface RollFrames {
  /** Where the incoming value starts: beyond the clip's far edge. */
  readonly enterFrom: MotionStyle;
  /** The resting frame both halves head for. */
  readonly rest: MotionStyle;
  /** Where the outgoing value goes: beyond the clip's near edge. */
  readonly exitTo: MotionStyle;
}

/**
 * A fade plus a travel of `distance` on the vertical axis.
 *
 * The distance is the role's line height, so each frame is exactly one clipped
 * line away from the other: a shorter travel would paint both values at once
 * inside the clip.
 */
export const rollFrames = (
  direction: RollDirection,
  distance: number,
): RollFrames => {
  const travel = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const up = direction === "up";
  // A zero travel must read as `0`, not `-0`: a frame is compared as a value.
  const signed = (value: number): number => (value === 0 ? 0 : value);
  return {
    enterFrom: { opacity: 0, top: signed(up ? travel : -travel) },
    rest: { opacity: 1, top: 0 },
    exitTo: { opacity: 0, top: signed(up ? -travel : travel) },
  };
};

/** The two half-tweens a roll runs, and the instant between them. */
export interface RollTiming {
  readonly exit: MotionTransition;
  readonly enter: MotionTransition;
  /** How long the exit half runs, in milliseconds. */
  readonly swapMs: number;
}

/** Halve a level's timing so the exit and the entry share one roll's budget. */
const halve = (timing: MotionTransition): MotionTransition => ({
  ...timing,
  duration: (timing.duration ?? 0) / 2,
});

/**
 * The level split across the two halves: a `normal` roll is 200 ms end to end,
 * so each value travels for 100 ms. Under the reduced preference both halves are
 * zero and the swap is immediate.
 */
export const rollHalves = (
  level: MotionLevel,
  preference: MotionPreference,
): RollTiming => {
  const exit = halve(motionTiming(level, { phase: "exit", preference }));
  return {
    exit,
    enter: halve(motionTiming(level, { phase: "enter", preference })),
    swapMs: Math.round((exit.duration ?? 0) * 1000),
  };
};
