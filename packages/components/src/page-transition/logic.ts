import type { MotionStyle } from "@gpuix/react";
import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const ViewDirection = Schema.Literals(["forward", "back"]);

export type PageDirection = typeof ViewDirection.Type;

const directionOf = (direction: unknown): PageDirection =>
  Schema.is(ViewDirection)(direction) ? direction : "forward";

export type PagePhase = "rest" | "leaving" | "entering";

export const PAGE_TRAVEL = 16;

export interface PageFrames {
  readonly enterFrom: MotionStyle;

  readonly rest: MotionStyle;

  readonly exitTo: MotionStyle;
}

export const pageTravel = (distance: number): number =>
  Number.isFinite(distance) && distance > 0
    ? Math.round(distance)
    : PAGE_TRAVEL;

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

export interface PageTransitionState {
  readonly shownKey: string;

  readonly pendingKey: Option.Option<string>;
  readonly phase: PagePhase;
  readonly run: number;
}

export const initialPageTransition = (
  viewKey: string,
): PageTransitionState => ({
  shownKey: viewKey,
  pendingKey: Option.none(),
  phase: "rest",
  run: 0,
});

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

export const finishPage = (state: PageTransitionState): PageTransitionState =>
  state.phase === "entering" ? { ...state, phase: "rest" } : state;
