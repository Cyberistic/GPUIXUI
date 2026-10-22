/**
 * Where a field of bubbles rises from, and where each one comes back.
 *
 * A bubble is a small absolutely positioned circle that travels **up** through a
 * clipped box: the runtime has no `transform` (upstream issue #102), so the rise
 * is a tween of `top` plus a horizontal `left` sway, and the only paint value it
 * animates for the fade is `opacity`. The layout is a pure function of the box
 * and one seed:
 *
 * - **deterministic** — the same seed paints the same field on every mount;
 * - **inside the box** — a bubble's rest and the far end of its sway stay within
 *   the measured width, so nothing is born half-clipped;
 * - **out of step** — every bubble runs `0.7…1.3` of `riseMs` and waits up to
 *   `0.9` of that before it starts, so the field never rises in unison;
 * - **off-stage at both ends** — a rise begins with the bubble's top edge at the
 *   box's bottom and ends with its bottom edge above the box, so the lap can
 *   restart without a pop a reader can see.
 *
 * The seeded hash and the caller-facing clamps live in `internal/scatter.ts`,
 * beside the mote and star fields'.
 */

import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "../internal/scatter.js";

/** The house number of bubbles. */
export const bubbleCount = 24;

/** The most a field paints, because each bubble is its own native tween. */
export const bubbleCountCap = 60;

/** The smallest and largest bubble, in pixels. */
export const bubbleMinSize = 6;
export const bubbleMaxSize = 28;

/** The house time for one rise, in milliseconds. */
export const bubbleRiseMs = 7_000;

/** The shortest rise a caller may ask for; below it the field stutters. */
export const bubbleRiseFloor = 1_200;

/** The longest rise, so a field cannot look frozen. */
export const bubbleRiseCap = 60_000;

/** The shares of the base time one rise may run. */
const durationFloorShare = 0.7;
const durationCeilingShare = 1.3;

/** The share of one rise a bubble may wait before it starts. */
const delayShare = 0.9;

/** The opacity a bubble reaches at the top of its rise, `0…1`. */
const peakFloor = 0.06;
const peakCeiling = 0.18;

/** How far a bubble may drift sideways: a share of the width, with a cap. */
const driftShare = 0.08;
const driftCap = 40;

/** One bubble's size, rhythm and the place it rests. */
export interface BubbleSpec {
  /** Stable within one field; the DOM-free identity a suite can name. */
  readonly key: string;
  /** The place a still field paints the bubble, in pixels from the top-left. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** The signed horizontal travel over one rise, in pixels. */
  readonly drift: number;
  /** The opacity at the top of the rise. */
  readonly peak: number;
  /** How long one rise runs, in milliseconds. */
  readonly durationMs: number;
  /** How long the bubble waits before its rise starts, in milliseconds. */
  readonly delayMs: number;
}

/** The box a field is laid out in, plus the policy a caller may override. */
export interface BubbleFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly riseMs: number;
}

/** The box a rise is measured against. */
export interface BubbleBox {
  readonly width: number;
  readonly height: number;
}

/** The two ends of one rise, as the runtime is handed them. */
export interface BubbleJourney {
  readonly fromLeft: number;
  readonly fromTop: number;
  readonly toLeft: number;
  readonly toTop: number;
}

/** A value between a floor and a ceiling. */
const between = (value: number, floor: number, ceiling: number): number =>
  Math.min(Math.max(value, floor), ceiling);

/**
 * The field for one measured box.
 *
 * An unmeasured or empty box paints nothing rather than guessing a size; `count:
 * 0` is the caller's "off" switch.
 */
export const bubbleField = (
  input: BubbleFieldInput,
): ReadonlyArray<BubbleSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(Math.max(Math.round(input.count), 0), bubbleCountCap);
  if (count === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const spanSize = Math.max(input.width - maxSize, 0);
  const spanY = Math.max(input.height - maxSize, 0);
  const sway = Math.min(input.width * driftShare, driftCap);

  return Arr.makeBy(count, (index) => {
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    const durationMs = Math.round(
      input.riseMs *
        (durationFloorShare +
          seededUnit(input.seed, index, 3) *
            (durationCeilingShare - durationFloorShare)),
    );
    return {
      key: String(index),
      x: tenth(seededUnit(input.seed, index, 0) * spanSize),
      y: tenth(
        Math.min(
          seededUnit(input.seed, index, 1) * spanY,
          Math.max(input.height - size, 0),
        ),
      ),
      size: Math.max(size, 1),
      drift: tenth((seededUnit(input.seed, index, 6) - 0.5) * 2 * sway),
      peak: tenth(
        peakFloor +
          seededUnit(input.seed, index, 4) * (peakCeiling - peakFloor),
      ),
      durationMs,
      delayMs: Math.round(
        seededUnit(input.seed, index, 5) * durationMs * delayShare,
      ),
    };
  });
};

/**
 * The rise one bubble makes through `box`.
 *
 * It starts with its top edge at the box's bottom and ends with its bottom edge
 * above the box, so both ends are off-stage: the next lap can begin without a
 * frame a reader would see. The sway is clamped to the measured width, so a
 * bubble never travels out of a box it was laid out in.
 */
export const bubbleJourney = (
  spec: BubbleSpec,
  box: BubbleBox,
): BubbleJourney => ({
  fromLeft: spec.x,
  fromTop: box.height,
  toLeft: tenth(
    between(spec.x + spec.drift, 0, Math.max(box.width - spec.size, 0)),
  ),
  toTop: -spec.size,
});
