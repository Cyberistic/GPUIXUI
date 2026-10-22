/**
 * Where a field of drifting motes sits, and how far each one travels.
 *
 * A mote is an absolutely positioned circle inside a clipped box, and the
 * runtime has no `transform` (upstream issue #102), so the drift is a tween of
 * `left`/`top` — inset geometry rather than a translate. The layout is a pure
 * function of the box and one seed, which is what makes the field:
 *
 * - **deterministic** — the same seed paints the same field, so a release does
 *   not reshuffle a decorative background on every mount;
 * - **bounded** — every mote starts and travels inside the box, so nothing is
 *   clipped at the edge and no mote ever sits half outside its own surface;
 * - **desynced** — each leg runs `0.75…1.25` of the base drift time, so a field
 *   never breathes in unison;
 * - **out of phase in weight** — each mote carries its own opacity, so a field
 *   reads as depth rather than as a dotted grid.
 *
 * All of it is arithmetic over one measured box, so the field is checked without
 * a window. The seeded hash and the caller-facing clamps live in
 * `internal/scatter.ts`, beside the starfield's.
 */

import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "../internal/scatter.js";

/** The house number of motes. */
export const particleCount = 24;

/** The most a field paints, because each mote is its own native tween. */
export const particleCountCap = 120;

/** The smallest and largest mote, in pixels. */
export const particleMinSize = 2;
export const particleMaxSize = 5;

/** The house time for one leg of the drift, in milliseconds. */
export const particleDriftMs = 14_000;

/** The shortest leg a caller may ask for; below it the movement is a jitter. */
export const particleDriftFloor = 320;

/** The longest leg, so a field cannot sit still for minutes at a time. */
export const particleDriftCap = 120_000;

/** The shares of the base drift time a leg may run. */
const durationFloorShare = 0.75;
const durationCeilingShare = 1.25;

/** The share of the box's shorter side a mote travels, and the pixel bounds. */
const driftShare = 0.08;
const driftFloor = 2;
const driftCeiling = 40;

/** The opacity a mote paints at, so a field reads as depth. */
const opacityFloor = 0.2;
const opacityCeiling = 0.55;

/** One mote's place and journey, as arithmetic. */
export interface ParticleSpec {
  /** Stable within one field; the DOM-free identity a suite can name. */
  readonly key: string;
  /** The seeded resting place, in pixels from the box's top-left. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** How far the mote travels on its forward leg, in pixels. */
  readonly driftX: number;
  readonly driftY: number;
  /** How long one leg takes, in milliseconds. */
  readonly durationMs: number;
  /** The opacity this mote paints at, `0…1`. */
  readonly opacity: number;
}

/** The box a field is laid out in, plus the policy a caller may override. */
export interface ParticleFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly driftMs: number;
}

/** Which leg a mote is on: `1` travelling out, `-1` returning. */
export type ParticleDirection = 1 | -1;

/** Where one mote paints on the leg it is running. */
export interface ParticleTravel {
  readonly left: number;
  readonly top: number;
}

/**
 * How far a mote travels: a share of the shorter side, within the pixel bounds.
 *
 * The bound is what keeps a small badge from throwing its motes off the box and
 * a full-window hero from painting streaks.
 */
export const particleAmplitude = (width: number, height: number): number => {
  const shorter = Math.min(width, height);
  if (!paintable(shorter)) return driftFloor;
  return Math.min(Math.max(shorter * driftShare, driftFloor), driftCeiling);
};

/**
 * The field for one measured box.
 *
 * An unmeasured or empty box paints nothing rather than guessing a size; `count:
 * 0` is the caller's "off" switch.
 */
export const particleField = (
  input: ParticleFieldInput,
): ReadonlyArray<ParticleSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(
    Math.max(Math.round(input.count), 0),
    particleCountCap,
  );
  if (count === 0) return [];
  const amplitude = particleAmplitude(input.width, input.height);
  const maxSize = Math.max(input.maxSize, input.minSize);
  // A mote starts at least its own size plus one amplitude from the edge, so its
  // journey out never leaves the box. A box too small for that inset centres them.
  const originX = Math.min(maxSize + amplitude, input.width / 2);
  const originY = Math.min(maxSize + amplitude, input.height / 2);
  const spanX = Math.max(input.width - originX * 2, 0);
  const spanY = Math.max(input.height - originY * 2, 0);

  return Arr.makeBy(count, (index) => {
    const angle = seededUnit(input.seed, index, 3) * Math.PI * 2;
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    return {
      key: String(index),
      x: tenth(originX + seededUnit(input.seed, index, 0) * spanX),
      y: tenth(originY + seededUnit(input.seed, index, 1) * spanY),
      size: Math.max(size, 1),
      driftX: tenth(Math.cos(angle) * amplitude),
      driftY: tenth(Math.sin(angle) * amplitude),
      durationMs: Math.round(
        input.driftMs *
          (durationFloorShare +
            seededUnit(input.seed, index, 4) *
              (durationCeilingShare - durationFloorShare)),
      ),
      opacity: tenth(
        opacityFloor +
          seededUnit(input.seed, index, 5) * (opacityCeiling - opacityFloor),
      ),
    };
  });
};

/**
 * Where a mote paints on its current leg.
 *
 * The forward leg is the seeded place plus the drift; the return leg is the
 * seeded place, so a field that reverses twice ends exactly where it began
 * rather than accumulating rounding error.
 */
export const particleTravel = (
  spec: ParticleSpec,
  direction: ParticleDirection,
): ParticleTravel =>
  direction === 1
    ? { left: tenth(spec.x + spec.driftX), top: tenth(spec.y + spec.driftY) }
    : { left: spec.x, top: spec.y };
