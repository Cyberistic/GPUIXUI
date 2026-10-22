/**
 * Where a burst of sparks flies from, and how it fades.
 *
 * A firework is a **radial** field: every spark of a burst leaves one seeded
 * centre at an evenly spaced angle with a little jitter, and travels to a point
 * on that burst's own ring. The runtime has no `transform` (upstream issue #102)
 * and no canvas, so a spark is an absolutely positioned dot whose `left`/`top`
 * the runtime tweens and whose fade is the `opacity` value it animates natively.
 *
 * A spark's life is two phases, because one tween cannot brighten and dim:
 *
 * - **fly** — the first `0.7` of the time, out to the ring, brightening to its
 *   own peak;
 * - **fade** — the rest, out to the last pixel and back to nothing.
 *
 * The ring is capped by the distance to the nearest wall, so a burst seeded near
 * an edge shrinks instead of clipping. Bursts are staggered by their index, so a
 * field is a sequence of small explosions rather than one ring of light.
 *
 * All of it is arithmetic over one measured box, so the field is checked without
 * a window. The seeded hash and the caller-facing clamps live in
 * `internal/scatter.ts`, beside the mote, star and bubble fields'.
 */

import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "../internal/scatter.js";

/** The house number of bursts. */
export const fireworkBursts = 3;

/** The most bursts a field paints; each is a sequence of its own. */
export const fireworkBurstCap = 6;

/** The house number of sparks in one burst. */
export const fireworkSparks = 18;

/** The most sparks one burst paints, because each is its own native tween. */
export const fireworkSparksCap = 40;

/** The smallest and largest spark, in pixels. */
export const fireworkMinSize = 2;
export const fireworkMaxSize = 4;

/** The house time for one burst, in milliseconds. */
export const fireworkBurstMs = 1_400;

/** The shortest burst a caller may ask for; below it the flash reads as noise. */
export const fireworkBurstFloor = 400;

/** The longest burst, so a field cannot look frozen. */
export const fireworkBurstCapMs = 12_000;

/** The share of a burst a spark spends travelling out, before it fades. */
const flyShare = 0.7;

/** The opacity a spark reaches at the ring, `0…1`. */
const peakFloor = 0.5;
const peakCeiling = 0.95;

/** The share of the box's short side a burst's ring may reach. */
const ringFloorShare = 0.55;
const ringCeilingShare = 0.95;

/** Where a centre may sit, as a share of the box, so a ring has room. */
const centreFloorShare = 0.25;
const centreCeilingShare = 0.75;

/** Each later burst waits this share of the base time for its turn. */
const burstStaggerShare = 0.4;

/** The share of the base time a spark may jitter past its burst's turn. */
const sparkJitterShare = 0.08;

/** One spark's place and two-phase life, as arithmetic. */
export interface FireworkSpark {
  /** Stable within one field; the DOM-free identity a suite can name. */
  readonly key: string;
  /** Which burst the spark belongs to; its angle is that burst's share. */
  readonly burst: number;
  /** The burst's centre. */
  readonly x: number;
  readonly y: number;
  /** The two ends of the phase that fades out. */
  readonly midLeft: number;
  readonly midTop: number;
  readonly toLeft: number;
  readonly toTop: number;
  readonly size: number;
  /** The opacity at the end of the fly phase. */
  readonly peak: number;
  /** How long the two phases together run, in milliseconds. */
  readonly durationMs: number;
  /** How long the spark waits before its burst starts, in milliseconds. */
  readonly delayMs: number;
}

/** The box a field is laid out in, plus the policy a caller may override. */
export interface FireworkFieldInput {
  readonly width: number;
  readonly height: number;
  readonly bursts: number;
  readonly sparks: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly burstMs: number;
}

/** The target one phase of a spark's life hands the runtime. */
export interface SparkPhase {
  readonly left: number;
  readonly top: number;
  readonly opacity: number;
  /** This phase's own duration, in milliseconds. */
  readonly durationMs: number;
  /** The wait before this phase starts; only the fly phase waits. */
  readonly delayMs: number;
}

/** A spark's two phases, split at the shared fly share. */
export interface SparkPhases {
  readonly fly: SparkPhase;
  readonly fade: SparkPhase;
}

/**
 * The field for one measured box.
 *
 * An unmeasured or empty box paints nothing rather than guessing a centre; either
 * count at `0` is the caller's "off" switch.
 */ export const fireworkField = (
  input: FireworkFieldInput,
): ReadonlyArray<FireworkSpark> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const bursts = Math.min(
    Math.max(Math.round(input.bursts), 0),
    fireworkBurstCap,
  );
  const sparks = Math.min(
    Math.max(Math.round(input.sparks), 0),
    fireworkSparksCap,
  );
  if (bursts === 0 || sparks === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const step = (Math.PI * 2) / sparks;

  return Arr.flatMap(
    Arr.makeBy(bursts, (index) => index),
    (burst) => {
      const centreX = tenth(
        input.width *
          (centreFloorShare +
            seededUnit(input.seed, burst, 0) *
              (centreCeilingShare - centreFloorShare)),
      );
      const centreY = tenth(
        input.height *
          (centreFloorShare +
            seededUnit(input.seed, burst, 1) *
              (centreCeilingShare - centreFloorShare)),
      );
      const burstDelayMs = burst * input.burstMs * burstStaggerShare;

      return Arr.makeBy(sparks, (index): FireworkSpark => {
        const slot = burst * 64 + index;
        const size = Math.round(
          input.minSize +
            seededUnit(input.seed, slot, 4) * (maxSize - input.minSize),
        );
        const angle =
          step * index + (seededUnit(input.seed, slot, 2) - 0.5) * step * 0.6;
        // The ring stops short of every wall, so a burst seeded near an edge
        // shrinks instead of clipping the sparks on that side.
        const room = Math.max(
          Math.min(
            centreX - size,
            input.width - size - centreX,
            centreY - size,
            input.height - size - centreY,
          ),
          0,
        );
        const radius =
          room *
          (ringFloorShare +
            seededUnit(input.seed, slot, 3) *
              (ringCeilingShare - ringFloorShare));
        const toLeft = tenth(centreX + Math.cos(angle) * radius);
        const toTop = tenth(centreY + Math.sin(angle) * radius);
        const durationMs = Math.round(
          input.burstMs * (0.6 + seededUnit(input.seed, slot, 6) * 0.4),
        );

        return {
          key: `${burst}-${index}`,
          burst,
          x: centreX,
          y: centreY,
          midLeft: tenth(centreX + (toLeft - centreX) * flyShare),
          midTop: tenth(centreY + (toTop - centreY) * flyShare),
          toLeft,
          toTop,
          size: Math.max(size, 1),
          peak: tenth(
            peakFloor +
              seededUnit(input.seed, slot, 5) * (peakCeiling - peakFloor),
          ),
          durationMs,
          delayMs: Math.round(
            burstDelayMs +
              seededUnit(input.seed, slot, 7) *
                input.burstMs *
                sparkJitterShare,
          ),
        };
      });
    },
  );
};

/**
 * The two phases of one spark's life.
 *
 * The fly phase is the only one that waits: once a spark is out at the ring, the
 * fade follows immediately, so a burst goes dark together.
 */
export const sparkPhases = (spec: FireworkSpark): SparkPhases => {
  const flyMs = Math.round(spec.durationMs * flyShare);
  return {
    fly: {
      left: spec.midLeft,
      top: spec.midTop,
      opacity: spec.peak,
      durationMs: flyMs,
      delayMs: spec.delayMs,
    },
    fade: {
      left: spec.toLeft,
      top: spec.toTop,
      opacity: 0,
      durationMs: Math.max(spec.durationMs - flyMs, 0),
      delayMs: 0,
    },
  };
};

/** The point a spark holds when the field is painted still. */
export const sparkRest = (
  spec: FireworkSpark,
): { readonly left: number; readonly top: number } => ({
  left: spec.midLeft,
  top: spec.midTop,
});
