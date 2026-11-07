import * as Match from "effect/Match";

export const MOTION_INTERRUPT_IDS = {
  probe: "motion-interrupt-probe",
  box: "motion-interrupt-box",
  rest: "motion-interrupt-rest",
  mid: "motion-interrupt-mid",
  far: "motion-interrupt-far",
  readout: "motion-interrupt-readout",
} as const;

export const MOTION_REST_WIDTH = 120;

export const MOTION_MID_WIDTH = 240;

export const MOTION_FAR_WIDTH = 400;

export const MOTION_TRAVEL_CUT = (MOTION_FAR_WIDTH - MOTION_REST_WIDTH) * 0.25;

export const CONTINUATION_TOLERANCE = 60;

export type MotionTarget = "rest" | "mid" | "far";

export const motionTargetWidth = (target: MotionTarget): number =>
  Match.value(target).pipe(
    Match.when("rest", () => MOTION_REST_WIDTH),
    Match.when("mid", () => MOTION_MID_WIDTH),
    Match.when("far", () => MOTION_FAR_WIDTH),
    Match.exhaustive,
  );

export interface MotionInterruptState {
  readonly target: MotionTarget;
}

export const motionInterruptReadout = (state: MotionInterruptState): string =>
  `target=${state.target}`;

export const MOTION_INTERRUPT_REST: MotionInterruptState = {
  target: "rest",
} as const;

export const isTravellingBetween = (
  width: number,
  from: number,
  to: number,
): boolean =>
  width > from + CONTINUATION_TOLERANCE && width < to - CONTINUATION_TOLERANCE;

export const continuesFrom = (before: number, after: number): boolean =>
  Math.abs(after - before) <= CONTINUATION_TOLERANCE;
