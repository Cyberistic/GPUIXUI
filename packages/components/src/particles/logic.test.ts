/**
 * The mote field's arithmetic, without a renderer.
 *
 * The bugs these guard: a field that reshuffles on every mount (so a decorative
 * background jumps between frames); a mote seeded or drifting outside the box it
 * was measured in (clipped at the edge, or half outside its own surface); every
 * mote turning at the same instant, which reads as a pulse rather than a float;
 * a leg so short it is a jitter, or so long the field looks frozen; a count or a
 * size a caller can ask for that the runtime cannot paint; and a return leg that
 * drifts away from the seeded place instead of returning to it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  particleAmplitude,
  particleCount,
  particleCountCap,
  particleCountOf,
  particleDriftCap,
  particleDriftFloor,
  particleDriftMs,
  particleDriftOf,
  particleField,
  particleMaxSize,
  particleMinSize,
  particleSeedOf,
  particleSizeRange,
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

describe("the field's policy", () => {
  it("clamps the count", () => {
    expect(particleCountOf(Option.none())).toBe(particleCount);
    expect(particleCountOf(Option.some(6))).toBe(6);
    expect(particleCountOf(Option.some(0))).toBe(0);
    expect(particleCountOf(Option.some(1_000))).toBe(particleCountCap);
    // An unreadable or negative request is not a smaller field.
    expect(particleCountOf(Option.some(Number.NaN))).toBe(particleCount);
    expect(particleCountOf(Option.some(-4))).toBe(particleCount);
  });

  it("reads an inverted size range low-to-high and an unreadable one as the house pair", () => {
    expect(particleSizeRange(Option.none(), Option.none())).toEqual({
      min: particleMinSize,
      max: particleMaxSize,
    });
    expect(particleSizeRange(Option.some(9), Option.some(3))).toEqual({
      min: 3,
      max: 9,
    });
    // A mote smaller than a pixel cannot be seen, so it is the house size.
    expect(particleSizeRange(Option.some(0), Option.some(Number.NaN))).toEqual({
      min: particleMinSize,
      max: particleMaxSize,
    });
  });

  it("holds the leg time between a jitter and a stare", () => {
    expect(particleDriftOf(Option.none())).toBe(particleDriftMs);
    expect(particleDriftOf(Option.some(particleDriftFloor - 1))).toBe(
      particleDriftMs,
    );
    expect(particleDriftOf(Option.some(2_000.4))).toBe(2_000);
    expect(particleDriftOf(Option.some(10_000_000))).toBe(particleDriftCap);
  });

  it("reads an unreadable seed as the house one", () => {
    expect(particleSeedOf(Option.none())).toBe(1);
    expect(particleSeedOf(Option.some(Number.NaN))).toBe(1);
    expect(particleSeedOf(Option.some(42))).toBe(42);
  });

  it("bounds the travel by the box's shorter side", () => {
    expect(particleAmplitude(1_000, 200)).toBe(16);
    expect(particleAmplitude(20, 20)).toBe(2);
    expect(particleAmplitude(2_000, 1_000)).toBe(40);
  });
});
