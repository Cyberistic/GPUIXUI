/**
 * The mote field's arithmetic, without a renderer.
 *
 * The bugs these guard: a field that reshuffles on every mount (so a decorative
 * background jumps between frames); a mote seeded or drifting outside the box it
 * was measured in (clipped at the edge, or half outside its own surface); every
 * mote turning at the same instant, which reads as a pulse rather than a float;
 * a return leg that drifts away from the seeded place instead of returning to
 * it; and a count or a size the runtime cannot paint.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  particleAmplitude,
  particleField,
  particleMaxSize,
  particleMinSize,
  particleTravel,
  type ParticleFieldInput,
  type ParticleSpec,
} from "./logic.js";

/** A 360×240 field of eight motes on a 2 second leg. */
const field = (
  overrides: Partial<ParticleFieldInput> = {},
): ReadonlyArray<ParticleSpec> =>
  particleField({
    width: 360,
    height: 240,
    count: 8,
    seed: 7,
    minSize: particleMinSize,
    maxSize: particleMaxSize,
    driftMs: 2_000,
    ...overrides,
  });

describe("particleField", () => {
  it("paints the same field for the same seed and a different one otherwise", () => {
    expect(field()).toEqual(field());
    // Comparing whole specs keeps the key, size, drift and weight in the claim.
    expect(field({ seed: 8 })).not.toEqual(field());
  });

  it("keeps every mote and every leg inside the box it measured", () => {
    const problems = Arr.flatMap([1, 2, 3, 11, 97], (seed) =>
      Arr.flatMap(
        [
          { width: 360, height: 240 },
          { width: 120, height: 400 },
        ],
        (box) =>
          Arr.flatMap(field({ ...box, seed, count: 24 }), (spec) => {
            const far = particleTravel(spec, 1);
            const inside = (left: number, top: number): boolean =>
              left >= 0 && top >= 0 && left <= box.width && top <= box.height;
            return inside(spec.x, spec.y) && inside(far.left, far.top)
              ? []
              : [`${seed}/${box.width}x${box.height}: ${spec.key} travels out`];
          }),
      ),
    );

    expect(problems).toEqual([]);
  });

  it("keeps a mote's size within the range the caller named", () => {
    const sizes = Arr.map(field({ count: 40 }), (spec) => spec.size);

    expect(Arr.every(sizes, (size) => size >= particleMinSize)).toBe(true);
    expect(Arr.every(sizes, (size) => size <= particleMaxSize)).toBe(true);
    // A single size would read as a dotted grid rather than a field.
    expect(Arr.length(Arr.dedupe(sizes))).toBeGreaterThan(1);
  });

  it("varies each leg's duration around the base drift time", () => {
    const durations = Arr.map(field({ count: 40 }), (spec) => spec.durationMs);

    expect(Arr.every(durations, (ms) => ms >= 1_500)).toBe(true);
    expect(Arr.every(durations, (ms) => ms <= 2_500)).toBe(true);
    // Two motes on one beat would turn together.
    expect(Arr.length(Arr.dedupe(durations))).toBeGreaterThan(1);
  });

  it("gives the motes their own opacity so the field reads as depth", () => {
    const opacities = Arr.map(field({ count: 40 }), (spec) => spec.opacity);

    expect(Arr.every(opacities, (opacity) => opacity >= 0.2)).toBe(true);
    expect(Arr.every(opacities, (opacity) => opacity <= 0.55)).toBe(true);
    expect(Arr.length(Arr.dedupe(opacities))).toBeGreaterThan(1);
  });

  it("turns a mote around at the place it was seeded", () => {
    const spec = field()[0];
    if (spec === undefined) throw new Error("logic: the field is empty");

    expect(particleTravel(spec, 1)).toEqual({
      left: spec.x + spec.driftX,
      top: spec.y + spec.driftY,
    });
    expect(particleTravel(spec, -1)).toEqual({ left: spec.x, top: spec.y });
  });

  it("paints nothing for an empty or unmeasured box", () => {
    expect(field({ width: 0 })).toEqual([]);
    expect(field({ height: Number.NaN })).toEqual([]);
    expect(field({ count: 0 })).toEqual([]);
  });
});

describe("particleAmplitude", () => {
  it("bounds the travel by the box's shorter side", () => {
    expect(particleAmplitude(1_000, 200)).toBe(16);
    expect(particleAmplitude(20, 20)).toBe(2);
    expect(particleAmplitude(2_000, 1_000)).toBe(40);
  });
});
