/**
 * Where a field of stars falls, and how long the fall takes.
 *
 * A gravity field is **radial but inward**: one seeded well sits inside the box,
 * and every star starts on the box's own edge along its own evenly spaced angle,
 * falls toward the well, and is re-keyed onto the edge when it lands. The runtime
 * has no `transform` (upstream issue #102) and no paths, so a fall is two straight
 * legs of inset geometry — an approach that brightens, then a plunge that fades —
 * and the acceleration is the `easeIn` curve the runtime interpolates rather than
 * a simulated force.
 *
 * A star closer to the well lands in less time, so the field never reads as one
 * ring collapsing in unison; each star also waits its own share of the base time
 * before it starts. All of it is arithmetic over one measured box and one seed
 * (`internal/scatter.ts` holds the hash), so the field is checked without a
 * window.
 */

import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "../internal/scatter.js";

/** The house number of stars. */
export const gravityStars = 36;

/** The most stars a field paints, because each is its own native tween. */
export const gravityStarsCap = 160;

/** The smallest and largest star, in pixels. */
export const gravityMinSize = 1;
export const gravityMaxSize = 3;

/** The house base time for one fall, in milliseconds. */
export const gravityFallMs = 3_000;

/** The shortest fall a caller may ask for; below it the motion reads as a blink. */
export const gravityFallFloor = 600;

/** The longest fall, so a field cannot look frozen. */
export const gravityFallCapMs = 20_000;

/** The share of a fall spent approaching the well, before the fade. */
const approachShare = 0.6;

/** Where the well may sit, as a share of the box, so every rim has room. */
const centreFloorShare = 0.3;
const centreCeilingShare = 0.7;

/** How far a star's angle may wander from its slot, as a share of one slot. */
const angleJitterShare = 0.3;

/** The share of the base time a star may wait before it starts. */
const delayShare = 0.8;

/** A fall's duration band, relative to the base time. */
const fallFloorShare = 0.5;
const fallCeilingShare = 1.4;
const nearFallShare = 0.6;
const farFallShare = 1.2;

/** A star's brightness band. */
const peakFloor = 0.35;
const peakCeiling = 0.85;

/** A measurement the field can be laid out in. */
export interface GravityBox {
  readonly width: number;
  readonly height: number;
}

/** The input a field is drawn from. */
export interface GravityFieldInput extends GravityBox {
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly fallMs: number;
}

/** The well every star falls toward. */
export interface GravityCentre {
  readonly x: number;
  readonly y: number;
}

/** One star's place, size and pace. */
export interface GravityStar {
  /** Stable within one field; the identity the renderer re-keys on. */
  readonly key: string;
  readonly size: number;
  /** The star's top-left where it is born: on the box's own edge. */
  readonly x: number;
  readonly y: number;
  /** The frame the approach hands over to the plunge. */
  readonly midX: number;
  readonly midY: number;
  /** The star's top-left with its centre on the well. */
  readonly endX: number;
  readonly endY: number;
  /** The brightness the approach reaches, `0…1`. */
  readonly peak: number;
  /** The whole fall, both legs. */
  readonly durationMs: number;
  /** How long the star waits before it starts. */
  readonly delayMs: number;
}

/** The two legs of a fall. */
export interface GravityPhases {
  readonly approach: {
    readonly left: number;
    readonly top: number;
    readonly opacity: number;
    readonly durationMs: number;
    readonly delayMs: number;
  };
  readonly plunge: {
    readonly left: number;
    readonly top: number;
    readonly opacity: number;
    readonly durationMs: number;
  };
}

/** The well's seeded place inside the box. */
export const gravityCentreOf = (
  box: GravityBox,
  seed: number,
): GravityCentre => ({
  x: tenth(
    box.width *
      (centreFloorShare +
        seededUnit(seed, 0, 9) * (centreCeilingShare - centreFloorShare)),
  ),
  y: tenth(
    box.height *
      (centreFloorShare +
        seededUnit(seed, 0, 10) * (centreCeilingShare - centreFloorShare)),
  ),
});

/**
 * A star's outward distance from the well to the box's edge along `angle`.
 *
 * The rim is the box's own edge, so a star is born where the surface ends; the
 * nearest edge wins, which makes a well near a corner produce a denser field
 * there — the shape of the box, not a circle, is what the stars leave from.
 */
const rimDistance = (
  centre: GravityCentre,
  box: GravityBox,
  angle: number,
): number => {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const alongX =
    dx > 0 ? (box.width - centre.x) / dx : dx < 0 ? -centre.x / dx : Infinity;
  const alongY =
    dy > 0 ? (box.height - centre.y) / dy : dy < 0 ? -centre.y / dy : Infinity;
  return Math.min(alongX, alongY);
};

/** A value inside `[low, high]`. */
const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** A star's pace: nearer the well is a shorter fall, within the recorded band. */
const fallFactor = (distance: number, farthest: number): number =>
  paintable(farthest)
    ? nearFallShare + (farFallShare - nearFallShare) * (distance / farthest)
    : farFallShare;

/** The field: one star per slot, born on the edge and aimed at the well. */
export const gravityField = (
  input: GravityFieldInput,
): ReadonlyArray<GravityStar> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  if (input.count <= 0) return [];

  const centre = gravityCentreOf(input, input.seed);
  const slice = (Math.PI * 2) / input.count;
  const farthest = Arr.reduce(
    Arr.range(0, input.count - 1),
    0,
    (widest, index) =>
      Math.max(
        widest,
        rimDistance(
          centre,
          input,
          index * slice +
            (seededUnit(input.seed, index, 1) - 0.5) * slice * angleJitterShare,
        ),
      ),
  );

  return Arr.map(Arr.range(0, input.count - 1), (index) => {
    const angle =
      index * slice +
      (seededUnit(input.seed, index, 1) - 0.5) * slice * angleJitterShare;
    const distance = rimDistance(centre, input, angle);
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (input.maxSize - input.minSize),
    );
    const startX = tenth(
      clamp(
        centre.x + Math.cos(angle) * distance - size / 2,
        0,
        Math.max(0, input.width - size),
      ),
    );
    const startY = tenth(
      clamp(
        centre.y + Math.sin(angle) * distance - size / 2,
        0,
        Math.max(0, input.height - size),
      ),
    );
    const endX = tenth(centre.x - size / 2);
    const endY = tenth(centre.y - size / 2);
    const speed = clamp(
      fallFactor(distance, farthest) *
        (0.9 + seededUnit(input.seed, index, 3) * 0.2),
      fallFloorShare,
      fallCeilingShare,
    );

    return {
      key: String(index),
      size,
      x: startX,
      y: startY,
      midX: tenth(startX + (endX - startX) * approachShare),
      midY: tenth(startY + (endY - startY) * approachShare),
      endX,
      endY,
      peak: tenth(
        peakFloor +
          seededUnit(input.seed, index, 4) * (peakCeiling - peakFloor),
      ),
      durationMs: Math.round(input.fallMs * speed),
      delayMs: Math.round(
        seededUnit(input.seed, index, 5) * delayShare * input.fallMs,
      ),
    };
  });
};

/** The two legs one star's fall is drawn in. */
export const gravityPhases = (star: GravityStar): GravityPhases => ({
  approach: {
    left: star.midX,
    top: star.midY,
    opacity: star.peak,
    durationMs: Math.round(star.durationMs * approachShare),
    delayMs: star.delayMs,
  },
  plunge: {
    left: star.endX,
    top: star.endY,
    opacity: 0,
    durationMs: Math.round(star.durationMs * (1 - approachShare)),
  },
});

/**
 * The frame a stilled star paints: it holds the approach frame, so the reduced
 * preference shows a gathered field rather than a ring waiting on the edge.
 */
export const gravityRest = (
  star: GravityStar,
): {
  readonly left: number;
  readonly top: number;
  readonly opacity: number;
} => ({
  left: star.midX,
  top: star.midY,
  opacity: star.peak,
});
