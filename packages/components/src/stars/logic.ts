/**
 * Where a field of stars sits, and how it twinkles.
 *
 * A star is a tiny absolutely positioned circle that **holds its place** and
 * changes brightness: the runtime has no `transform` (upstream issue #102), and a
 * twinkle is an `opacity` tween, which is the one paint value the runtime
 * animates natively. The layout is a pure function of the box and one seed:
 *
 * - **deterministic** — the same seed paints the same sky on every mount;
 * - **inside the box** — a star sits at least its own size from the edge, so no
 *   star is clipped in half;
 * - **out of step** — every star runs `0.7…1.3` of `twinkleMs`, and waits up to
 *   `0.6` of that before it starts, so the sky never blinks in unison;
 * - **two lights** — a star has a dim floor and a bright peak drawn separately,
 *   so the field has small glints in it rather than one uniform glow.
 *
 * All of it is arithmetic over one measured box, so the field is checked without
 * a window. The seeded hash and the caller-facing clamps live in
 * `internal/scatter.ts`, beside the mote field's.
 */

import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "../internal/scatter.js";

/** The house number of stars. */
export const starCount = 48;

/** The most a field paints, because each star is its own native tween. */
export const starCountCap = 200;

/** The smallest and largest star, in pixels. */
export const starMinSize = 1;
export const starMaxSize = 3;

/** The house time for one twinkle, in milliseconds. */
export const starTwinkleMs = 2_400;

/** The shortest twinkle a caller may ask for; below it the field flickers. */
export const starTwinkleFloor = 320;

/** The longest twinkle, so a sky cannot look frozen. */
export const starTwinkleCap = 20_000;

/** The shares of the base time a twinkle may run. */
const durationFloorShare = 0.7;
const durationCeilingShare = 1.3;

/** The share of one twinkle a star may wait before it starts. */
const delayShare = 0.6;

/** The brightness a star rests at, and the peak it reaches. */
const dimFloor = 0.15;
const dimCeiling = 0.4;
const glowFloor = 0.65;
const glowCeiling = 1;

/** One star's place and twinkle, as arithmetic. */
export interface StarSpec {
  /** Stable within one field; the DOM-free identity a suite can name. */
  readonly key: string;
  /** The place, in pixels from the box's top-left. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** The dim floor and the bright peak of the twinkle, `0…1`. */
  readonly dim: number;
  readonly glow: number;
  /** How long one twinkle runs, in milliseconds. */
  readonly durationMs: number;
  /** How long the star waits before this twinkle starts, in milliseconds. */
  readonly delayMs: number;
}

/** The box a field is laid out in, plus the policy a caller may override. */
export interface StarFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly twinkleMs: number;
}

/** Which light a star is heading for: `1` brightening, `-1` dimming. */
export type StarDirection = 1 | -1;

/** The opacity a star paints on the run it is on. */
export const starAt = (spec: StarSpec, direction: StarDirection): number =>
  direction === 1 ? spec.glow : spec.dim;

/**
 * The field for one measured box.
 *
 * An unmeasured or empty box paints nothing rather than guessing a size; `count:
 * 0` is the caller's "off" switch.
 */
export const starField = (input: StarFieldInput): ReadonlyArray<StarSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(Math.max(Math.round(input.count), 0), starCountCap);
  if (count === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const originX = Math.min(maxSize, input.width / 2);
  const originY = Math.min(maxSize, input.height / 2);
  const spanX = Math.max(input.width - originX * 2, 0);
  const spanY = Math.max(input.height - originY * 2, 0);

  return Arr.makeBy(count, (index) => {
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    const durationMs = Math.round(
      input.twinkleMs *
        (durationFloorShare +
          seededUnit(input.seed, index, 4) *
            (durationCeilingShare - durationFloorShare)),
    );
    return {
      key: String(index),
      x: tenth(originX + seededUnit(input.seed, index, 0) * spanX),
      y: tenth(originY + seededUnit(input.seed, index, 1) * spanY),
      size: Math.max(size, 1),
      dim: tenth(
        dimFloor + seededUnit(input.seed, index, 3) * (dimCeiling - dimFloor),
      ),
      glow: tenth(
        glowFloor +
          seededUnit(input.seed, index, 5) * (glowCeiling - glowFloor),
      ),
      durationMs,
      delayMs: Math.round(
        seededUnit(input.seed, index, 6) * durationMs * delayShare,
      ),
    };
  });
};
