/**
 * The gravity field's arithmetic, without a renderer.
 *
 * The bugs these guard: a field that reshuffles between mounts; a star born
 * inside the box instead of on its edge, or landing anywhere but the well; a
 * field that collapses in one beat because every star takes the same time; a
 * brightness, duration or delay the renderer cannot paint; a mid frame that is
 * not the hand-over between the two legs; an unmeasured box painting stars
 * anyway; and a stilled star that rests somewhere the fall never visits.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  gravityCentreOf,
  gravityFallMs,
  gravityField,
  gravityMaxSize,
  gravityMinSize,
  gravityPhases,
  gravityRest,
  gravityStars,
  type GravityFieldInput,
  type GravityStar,
} from "./logic.js";

/** A 360×240 field of thirty-six stars on a 3 second fall. */
const field = (
  overrides: Partial<GravityFieldInput> = {},
): ReadonlyArray<GravityStar> =>
  gravityField({
    width: 360,
    height: 240,
    count: gravityStars,
    seed: 3,
    minSize: gravityMinSize,
    maxSize: gravityMaxSize,
    fallMs: gravityFallMs,
    ...overrides,
  });

const starAt = (
  stars: ReadonlyArray<GravityStar>,
  index: number,
): GravityStar => {
  const star = stars[index];
  if (star === undefined) throw new Error("logic: no star at that index");
  return star;
};

describe("gravityField", () => {
  it("paints the same field for the same seed and a different one otherwise", () => {
    expect(field()).toEqual(field());
    expect(field({ seed: 4 })).not.toEqual(field());
  });

  it("paints nothing before it has a box, or when the caller asks for none", () => {
    expect(field({ width: 0 })).toEqual([]);
    expect(field({ height: Number.NaN })).toEqual([]);
    expect(field({ count: 0 })).toEqual([]);
  });

  it("births every star on the box's own edge", () => {
    const problems = Arr.filter(
      field({ count: 60 }),
      (star) =>
        Math.min(
          star.x,
          star.y,
          360 - star.size - star.x,
          240 - star.size - star.y,
        ) > 1,
    );

    expect(problems).toEqual([]);
  });

  it("lands every star in the one well", () => {
    const centre = gravityCentreOf({ width: 360, height: 240 }, 3);
    const problems = Arr.filter(
      field({ count: 60 }),
      (star) =>
        Math.abs(star.endX + star.size / 2 - centre.x) > 0.1 ||
        Math.abs(star.endY + star.size / 2 - centre.y) > 0.1,
    );

    expect(problems).toEqual([]);
  });

  it("hands the approach over at the frame it names", () => {
    Arr.forEach(field({ count: 12 }), (star) => {
      expect(star.midX).toBeCloseTo(star.x + (star.endX - star.x) * 0.6, 0);
      expect(star.midY).toBeCloseTo(star.y + (star.endY - star.y) * 0.6, 0);
    });
  });

  it("reaches every direction of its box, not one jet", () => {
    const centre = gravityCentreOf({ width: 360, height: 240 }, 3);
    const quadrants = Arr.reduce(
      field({ count: 48 }),
      new Set<string>(),
      (seen, star) => {
        const dx = star.x - centre.x;
        const dy = star.y - centre.y;
        return seen.add(`${dx >= 0 ? "e" : "w"}${dy >= 0 ? "s" : "n"}`);
      },
    );

    expect(Arr.length(Arr.fromIterable(quadrants))).toBe(4);
  });

  it("keeps every brightness, fall and delay inside the recorded bands", () => {
    const stars = field({ count: 60 });
    const problems = Arr.filter(
      stars,
      (star) =>
        star.peak < 0.35 ||
        star.peak > 0.85 ||
        star.size < gravityMinSize ||
        star.size > gravityMaxSize ||
        star.durationMs < Math.round(gravityFallMs * 0.5) ||
        star.durationMs > Math.round(gravityFallMs * 1.4) ||
        star.delayMs < 0 ||
        star.delayMs > Math.round(gravityFallMs * 0.8),
    );

    expect(problems).toEqual([]);
  });

  it("does not collapse the field in one beat", () => {
    const stars = field({ count: 60 });
    const durations = Arr.map(stars, (star) => star.durationMs);
    const delays = Arr.map(stars, (star) => star.delayMs);

    expect(new Set(durations).size).toBeGreaterThan(1);
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  it("splits one fall into the two legs the renderer needs", () => {
    const star = starAt(field(), 0);
    const phases = gravityPhases(star);

    expect(phases.approach).toEqual({
      left: star.midX,
      top: star.midY,
      opacity: star.peak,
      durationMs: Math.round(star.durationMs * 0.6),
      delayMs: star.delayMs,
    });
    expect(phases.plunge).toEqual({
      left: star.endX,
      top: star.endY,
      opacity: 0,
      durationMs: star.durationMs - Math.round(star.durationMs * 0.6),
    });
  });

  it("holds a stilled star on the frame its fall visits", () => {
    const star = starAt(field(), 1);

    expect(gravityRest(star)).toEqual({
      left: star.midX,
      top: star.midY,
      opacity: star.peak,
    });
  });

  it("rounds its geometry to the tenth of a pixel the runtime paints", () => {
    Arr.forEach(field({ count: 60 }), (star) => {
      Arr.forEach([star.x, star.y, star.midX, star.midY, star.peak], (value) =>
        expect(Math.round(value * 10) / 10).toBe(value),
      );
    });
  });
});
