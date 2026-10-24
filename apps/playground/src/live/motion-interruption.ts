/**
 * What a window says when an animation's target changes mid-flight, and the
 * arithmetic the `motion-interruption` probe reads it with.
 *
 * `motion-geometry` measured a run start to end; it never changed the target
 * while the box was moving. The capability record's **Animation interruption**
 * row nevertheless says "a target change starts the next transition from the
 * current visible value", and nothing measured that sentence — while two
 * inventory rows depend on it: a collapsible sidebar a reader reopens before it
 * closed, and a split pane dragged while its width is still travelling. If the
 * runtime restarted every run from the initial value instead, the box would
 * jump backwards under the reader; if it finished the abandoned run first, the
 * drag would fight the animation. Both look like a slow click, not a bug.
 *
 * The three widths are far enough apart that one frame of travel cannot be
 * mistaken for either failure: the interrupted run's start is a whole 120 or
 * 140 points from the value it was cut at, and `CONTINUATION_TOLERANCE` stays
 * well under half of that.
 */
import * as Match from "effect/Match";

/** Every id the probe mounts or presses, one per painted box and control. */
export const MOTION_INTERRUPT_IDS = {
  probe: "motion-interrupt-probe",
  box: "motion-interrupt-box",
  rest: "motion-interrupt-rest",
  mid: "motion-interrupt-mid",
  far: "motion-interrupt-far",
  readout: "motion-interrupt-readout",
} as const;

/** Where the box rests: its `initial` width and the target on mount. */
export const MOTION_REST_WIDTH = 120;

/** The near target a rising run is interrupted toward. */
export const MOTION_MID_WIDTH = 240;

/** The far target a run is interrupted back toward. */
export const MOTION_FAR_WIDTH = 400;

/**
 * How far into a run the target is cut, in points of travel.
 *
 * A fraction of the travel rather than a time: the same declaration has
 * painted a run in a fraction of a second and in seconds, and a fixed cut
 * landed past the end of a fast one. A quarter keeps the first reading of a
 * 20ms poll well inside `isTravelling`'s band, and the cut is still 80–200
 * points clear of both failure shapes.
 */
export const MOTION_TRAVEL_CUT = (MOTION_FAR_WIDTH - MOTION_REST_WIDTH) * 0.25;

/**
 * The most a painted width may move in the frame a retarget lands in.
 *
 * A frame of travel at the measured pace is well under ten points; the
 * smallest failure is a restart, which paints the interrupted run's own start
 * — 120 points below the rising cut and 140 above the falling one. The
 * tolerance is deliberately nearer a frame than half a failure, so an
 * interrupted run that restarted from its start cannot pass by a slow frame.
 */
export const CONTINUATION_TOLERANCE = 60;

/** The target a readout names, from the box's current state. */
export type MotionTarget = "rest" | "mid" | "far";

/** A state's target width, the value the caller's own state holds. */
export const motionTargetWidth = (target: MotionTarget): number =>
  Match.value(target).pipe(
    Match.when("rest", () => MOTION_REST_WIDTH),
    Match.when("mid", () => MOTION_MID_WIDTH),
    Match.when("far", () => MOTION_FAR_WIDTH),
    Match.exhaustive,
  );

/** What the probe's own state reads after one press. */
export interface MotionInterruptState {
  readonly target: MotionTarget;
}

/** The readout's one spelling, so the probe and its record print the same line. */
export const motionInterruptReadout = (state: MotionInterruptState): string =>
  `target=${state.target}`;

/** The state before any press: at rest. */
export const MOTION_INTERRUPT_REST: MotionInterruptState = {
  target: "rest",
} as const;

/**
 * Whether a width the box paints is **between** two targets, with clearance.
 *
 * The clearance is what makes a sample evidence of travel rather than of a
 * settled endpoint: a capture one frame late still reads as travelling, while
 * a box that jumped to its target does not.
 */
export const isTravellingBetween = (
  width: number,
  from: number,
  to: number,
): boolean =>
  width > from + CONTINUATION_TOLERANCE && width < to - CONTINUATION_TOLERANCE;

/**
 * Whether a width painted after a retarget continues from the width painted
 * before it.
 *
 * `before` is the last sample of the interrupted run; `after` is the first
 * sample of the run that replaced it. The two numbers are one frame apart, so
 * the tolerance is allowed to be a frame's worth of travel — but the two
 * failure shapes are far outside it: restarting paints the interrupted run's
 * initial value and finishing the abandoned run paints its old target.
 */
export const continuesFrom = (before: number, after: number): boolean =>
  Math.abs(after - before) <= CONTINUATION_TOLERANCE;
