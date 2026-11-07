import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  starAt,
  starField,
  starMaxSize,
  starMinSize,
  starTwinkleMs,
  type StarFieldInput,
  type StarSpec,
} from "./logic.js";

const sky = (
  overrides: Partial<StarFieldInput> = {},
): ReadonlyArray<StarSpec> =>
  starField({
    width: 360,
    height: 240,
    count: 12,
    seed: 7,
    minSize: starMinSize,
    maxSize: starMaxSize,
    twinkleMs: 2_000,
    ...overrides,
  });

const first = (specs: ReadonlyArray<StarSpec>): StarSpec => {
  const spec = specs[0];
  if (spec === undefined) throw new Error("logic: the sky is empty");
  return spec;
};

describe("starField", () => {
  it("paints the same sky for the same seed and a different one otherwise", () => {
    expect(sky()).toEqual(sky());
    expect(sky({ seed: 8 })).not.toEqual(sky());
  });

  it("keeps every star inside the box it measured, at a paintable size", () => {
    const problems = Arr.flatMap([1, 2, 3, 11, 97], (seed) =>
      Arr.flatMap(
        [
          { width: 360, height: 240 },
          { width: 120, height: 400 },
        ],
        (box) =>
          Arr.flatMap(sky({ ...box, seed, count: 48 }), (spec) => {
            const inside =
              spec.x >= 0 &&
              spec.y >= 0 &&
              spec.x + spec.size <= box.width &&
              spec.y + spec.size <= box.height &&
              spec.size >= starMinSize &&
              spec.size <= starMaxSize;
            return inside
              ? []
              : [`${seed}/${box.width}x${box.height}: ${spec.key} is outside`];
          }),
      ),
    );

    expect(problems).toEqual([]);
  });

  it("draws a dim floor below the peak it brightens to", () => {
    Arr.forEach(sky({ count: 48 }), (spec) => {
      expect(spec.dim).toBeGreaterThanOrEqual(0.15);
      expect(spec.dim).toBeLessThan(spec.glow);
      expect(spec.glow).toBeLessThanOrEqual(1);
    });
  });

  it("gives every star its own twinkle time", () => {
    const durations = Arr.map(sky({ count: 48 }), (spec) => spec.durationMs);

    expect(Arr.every(durations, (ms) => ms >= 1_400)).toBe(true);
    expect(Arr.every(durations, (ms) => ms <= 2_600)).toBe(true);

    expect(Arr.length(Arr.dedupe(durations))).toBeGreaterThan(1);
  });

  it("waits a share of its own twinkle before it starts", () => {
    const delays = Arr.map(sky({ count: 48 }), (spec) => spec.delayMs);

    Arr.forEach(sky({ count: 48 }), (spec) => {
      expect(spec.delayMs).toBeGreaterThanOrEqual(0);
      expect(spec.delayMs).toBeLessThanOrEqual(
        Math.round(spec.durationMs * 0.6),
      );
    });

    expect(Arr.some(delays, (ms) => ms > 0)).toBe(true);
  });

  it("paints nothing for an empty or unmeasured box", () => {
    expect(sky({ width: 0 })).toEqual([]);
    expect(sky({ height: Number.NaN })).toEqual([]);
    expect(sky({ count: 0 })).toEqual([]);
  });

  it("hands the runtime the peak on one run and the floor on the next", () => {
    const spec = first(sky());
    expect(starAt(spec, 1)).toBe(spec.glow);
    expect(starAt(spec, -1)).toBe(spec.dim);
  });

  it("uses the house twinkle time when the caller names none", () => {
    expect(starTwinkleMs).toBeGreaterThanOrEqual(1_000);
  });
});
