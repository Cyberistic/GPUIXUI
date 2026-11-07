import type { MotionStyle, MotionTransition } from "@gpuix/react";
import {
  motionTiming,
  type MotionLevel,
  type MotionPreference,
} from "@gpuixui/motion/timing";
import { Match } from "effect";
import * as Option from "effect/Option";
import { transitionWindowMs } from "@gpuixui/components/authoring";

export type SwapPhase = "rest" | "leaving" | "entering";

export interface SwapState {
  readonly shown: string;

  readonly run: number;
  readonly phase: SwapPhase;

  readonly pending: Option.Option<string>;
}

export const initialSwap = (text: string): SwapState => ({
  shown: text,
  run: 0,
  phase: "rest",
  pending: Option.none(),
});

const jump = (state: SwapState, text: string): SwapState =>
  state.shown === text && state.phase === "rest"
    ? state
    : {
        shown: text,
        run: state.shown === text ? state.run : state.run + 1,
        phase: "rest",
        pending: Option.none(),
      };

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

export const restSwap = (state: SwapState): SwapState =>
  state.phase === "entering" ? { ...state, phase: "rest" } : state;

export type SwapAxis = "left" | "top";

export type Travel = 1 | -1;

export interface SwapFrames {
  readonly enterFrom: MotionStyle;

  readonly rest: MotionStyle;

  readonly exitTo: MotionStyle;
}

const frame = (axis: SwapAxis, offset: number, opacity: number): MotionStyle =>
  axis === "top" ? { opacity, top: offset } : { opacity, left: offset };

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

export interface SwapTiming {
  readonly exit: MotionTransition;
  readonly enter: MotionTransition;

  readonly swapMs: number;
}

const halve = (timing: MotionTransition): MotionTransition => ({
  ...timing,
  duration: (timing.duration ?? 0) / 2,
});

export const swapHalves = (
  level: MotionLevel,
  preference: MotionPreference,
): SwapTiming => {
  const exit = halve(motionTiming(level, { phase: "exit", preference }));
  return {
    exit,
    enter: halve(motionTiming(level, { phase: "enter", preference })),
    swapMs: transitionWindowMs(exit),
  };
};
