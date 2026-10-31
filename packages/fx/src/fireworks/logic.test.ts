/**
 * The firework field's arithmetic, without a renderer.
 *
 * The bugs these guard: a field that reshuffles between mounts; a burst whose
 * sparks all leave on one angle, so it reads as a jet rather than an explosion;
 * a spark that ends outside the box, or a ring that clips on the wall its centre
 * sits nearest; a fly phase that is already at the ring, so the spark never
 * travels; a fade phase that starts bright or waits, so the burst twinkles
 * instead of going dark; and an unmeasured box painting a field anyway.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  fireworkBurstMs,
  fireworkBursts,
  fireworkField,
  fireworkMaxSize,
  fireworkMinSize,
  fireworkSparks,
  sparkPhases,
  sparkRest,
  type FireworkFieldInput,
  type FireworkSpark,
} from "./logic.js";

/** A 360×240 field of three bursts of twelve sparks on a 1 second burst. */
const field = (
  overrides: Partial<FireworkFieldInput> = {},
): ReadonlyArray<FireworkSpark> =>
  fireworkField({
    width: 360,
    height: 240,
    bursts: 3,
    sparks: 12,
    seed: 7,
    minSize: fireworkMinSize,
    maxSize: fireworkMaxSize,
    burstMs: 1_000,
    ...overrides,
  });

const sparksOf = (
  specs: ReadonlyArray<FireworkSpark>,
  burst: number,
): ReadonlyArray<FireworkSpark> =>
  Arr.filter(specs, (spec) => spec.burst === burst);

describe("fireworkField", () => {
  it("paints the same sequence for the same seed and a different one otherwise", () => {
    expect(field()).toEqual(field());
    expect(field({ seed: 8 })).not.toEqual(field());
  });

  it("paints the bursts and sparks it is asked for, up to the caps", () => {
    expect(field()).toHaveLength(36);
    expect(field({ bursts: 10_000, sparks: 10_000 })).toHaveLength(240);
    expect(field({ bursts: 0 })).toEqual([]);
    expect(field({ sparks: 0 })).toEqual([]);
    expect(
      field({ bursts: fireworkBursts, sparks: fireworkSparks }),
    ).toHaveLength(54);
  });

  it("shares one centre per burst and radiates into every quadrant", () => {
    const problems = Arr.flatMap([0, 1, 2], (burst) => {
      const sparks = sparksOf(field(), burst);
      const centre = sparks[0];
      if (centre === undefined) return [`${burst}: empty`];
      const quadrants = Arr.dedupe(
        Arr.map(sparks, (spec) => {
          const right = spec.toLeft >= spec.x;
          const down = spec.toTop >= spec.y;
          return `${right}:${down}`;
        }),
      );
      const offCentre = Arr.filter(
        sparks,
        (spec) => spec.x !== centre.x || spec.y !== centre.y,
      );
      return [
        ...(quadrants.length === 4
          ? []
          : [`${burst}: ${quadrants.length} quadrants`]),
        ...Arr.map(offCentre, () => `${burst}: off-centre`),
      ];
    });

    expect(problems).toEqual([]);
  });

  it("keeps every spark at rest inside the box and at a paintable size", () => {
    const problems = Arr.flatMap([1, 2, 3, 11, 97], (seed) =>
      Arr.flatMap(
        [
          { width: 360, height: 240 },
          { width: 120, height: 400 },
        ],
        (box) =>
          Arr.flatMap(field({ ...box, seed, bursts: 6, sparks: 40 }), (spec) =>
            spec.toLeft < 0 ||
            spec.toTop < 0 ||
            spec.toLeft + spec.size > box.width + 0.1 ||
            spec.toTop + spec.size > box.height + 0.1 ||
            spec.size < fireworkMinSize ||
            spec.size > fireworkMaxSize
              ? [`${seed}:${box.width}x${box.height}:${spec.key}`]
              : [],
          ),
      ),
    );

    expect(problems).toEqual([]);
  });

  it("shrinks a burst seeded near a corner instead of clipping it", () => {
    const corner = field({
      width: 60,
      height: 60,
      bursts: 1,
      sparks: 8,
      minSize: 2,
      maxSize: 2,
      seed: 3,
    });
    const outside = Arr.filter(
      corner,
      (spec) =>
        spec.toLeft < 0 ||
        spec.toTop < 0 ||
        spec.toLeft + spec.size > 60.1 ||
        spec.toTop + spec.size > 60.1,
    );

    expect(corner).toHaveLength(8);
    expect(outside).toEqual([]);
  });

  it("gives each spark its own brightness and a two-phase life", () => {
    const peaks = Arr.map(field(), (spec) => spec.peak);
    expect(Math.min(...peaks)).toBeGreaterThan(0.4);
    expect(Math.max(...peaks)).toBeLessThanOrEqual(1);

    const odd = Arr.filter(
      field(),
      (spec) =>
        spec.durationMs < 1_000 * 0.6 ||
        spec.durationMs > 1_000 ||
        sparkPhases(spec).fly.durationMs + sparkPhases(spec).fade.durationMs !==
          spec.durationMs,
    );

    expect(odd).toEqual([]);
  });

  it("staggers bursts in time and jitters each spark past its own turn", () => {
    const specs = field();
    const firsts = Arr.flatMap([0, 1, 2], (burst) => {
      const spec = sparksOf(specs, burst)[0];
      return spec === undefined ? [] : [spec];
    });
    const [zero, one, two] = firsts;
    if (zero === undefined || one === undefined || two === undefined) {
      throw new Error("logic: the field is missing a burst");
    }

    expect(one.delayMs).toBeGreaterThan(zero.delayMs);
    expect(two.delayMs).toBeGreaterThan(one.delayMs);

    const beyond = Arr.filter(
      specs,
      (spec) => spec.delayMs > spec.burst * 1_000 * 0.4 + 1_000 * 0.08,
    );
    expect(beyond).toEqual([]);
  });

  it("splits the life into a fly phase and a fade that starts at the ring", () => {
    const spec = field()[0];
    if (spec === undefined) throw new Error("logic: the field is empty");
    const phases = sparkPhases(spec);

    expect(phases.fly).toMatchObject({
      left: spec.midLeft,
      top: spec.midTop,
      opacity: spec.peak,
      delayMs: spec.delayMs,
    });
    expect(phases.fade).toMatchObject({
      left: spec.toLeft,
      top: spec.toTop,
      opacity: 0,
      delayMs: 0,
    });
    expect(phases.fly.durationMs).toBeGreaterThan(phases.fade.durationMs);
    expect(sparkRest(spec)).toEqual({
      left: spec.midLeft,
      top: spec.midTop,
    });
  });

  it("paints nothing for an unmeasured box", () => {
    expect(field({ width: 0 })).toEqual([]);
    expect(field({ height: Number.NaN })).toEqual([]);
    expect(field({ width: -360 })).toEqual([]);
    expect(field({ burstMs: fireworkBurstMs })).toHaveLength(36);
  });
});
