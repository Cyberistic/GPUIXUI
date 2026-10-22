/**
 * The bubble field's arithmetic, without a renderer.
 *
 * The bugs these guard: a field that reshuffles between mounts; a bubble born
 * outside the box it was measured in, or travelling out of it on its sway; a
 * rise that starts on-stage or ends on-stage, so the restart shows a pop; a
 * field where every bubble rises on the same beat; a peak so faint the bubble
 * cannot be seen, or so strong it stops reading as decoration; and an unmeasured
 * box painting a field anyway.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  bubbleField,
  bubbleMaxSize,
  bubbleMinSize,
  bubbleRiseMs,
  bubbleJourney,
  type BubbleFieldInput,
  type BubbleSpec,
} from "./logic.js";

/** A 360×240 field of twelve bubbles on a 2 second rise. */
const field = (
  overrides: Partial<BubbleFieldInput> = {},
): ReadonlyArray<BubbleSpec> =>
  bubbleField({
    width: 360,
    height: 240,
    count: 12,
    seed: 7,
    minSize: bubbleMinSize,
    maxSize: bubbleMaxSize,
    riseMs: 2_000,
    ...overrides,
  });

const first = (specs: ReadonlyArray<BubbleSpec>): BubbleSpec => {
  const spec = specs[0];
  if (spec === undefined) throw new Error("logic: the field is empty");
  return spec;
};

describe("bubbleField", () => {
  it("paints the same field for the same seed and a different one otherwise", () => {
    expect(field()).toEqual(field());
    expect(field({ seed: 8 })).not.toEqual(field());
  });

  it("rests every bubble wholly inside the box it measured", () => {
    const problems = Arr.flatMap([1, 2, 3, 11, 97], (seed) =>
      Arr.flatMap(
        [
          { width: 360, height: 240 },
          { width: 120, height: 400 },
        ],
        (box) =>
          Arr.filter(
            field({ ...box, seed, count: 48 }),
            (spec) =>
              spec.x < 0 ||
              spec.y < 0 ||
              spec.x + spec.size > box.width ||
              spec.y + spec.size > box.height,
          ).map((spec) => `${seed}:${box.width}x${box.height}:${spec.key}`),
      ),
    );

    expect(problems).toEqual([]);
  });

  it("starts a rise below the box and ends it above", () => {
    const specs = field();
    const box = { width: 360, height: 240 };
    const problems = Arr.flatMap(specs, (spec) => {
      const journey = bubbleJourney(spec, box);
      return journey.fromTop < box.height || journey.toTop > -spec.size
        ? [spec.key]
        : [];
    });

    expect(problems).toEqual([]);
  });

  it("keeps the sway inside the measured width", () => {
    const specs = field();
    const box = { width: 360, height: 240 };
    const problems = Arr.flatMap(specs, (spec) => {
      const journey = bubbleJourney(spec, box);
      return journey.toLeft < 0 || journey.toLeft + spec.size > box.width + 0.1
        ? [`${spec.key}: ${journey.toLeft}`]
        : [];
    });

    expect(problems).toEqual([]);
  });

  it("keeps a bubble larger than the box at its left edge", () => {
    const spec = first(
      field({ width: 10, height: 10, count: 1, maxSize: 40, minSize: 40 }),
    );
    expect(spec.x).toBe(0);
    expect(bubbleJourney(spec, { width: 10, height: 10 }).toLeft).toBe(0);
  });

  it("peaks above nothing and below full paint, so it is seen but not read", () => {
    const peaks = Arr.map(field({ count: 48 }), (spec) => spec.peak);
    expect(Math.min(...peaks)).toBeGreaterThan(0);
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.2);
  });

  it("gives every bubble its own rise time and its own wait", () => {
    const specs = field();
    const unusual = Arr.filter(
      specs,
      (spec) =>
        spec.durationMs < 2_000 * 0.7 ||
        spec.durationMs > 2_000 * 1.3 ||
        spec.delayMs < 0 ||
        spec.delayMs > spec.durationMs * 0.9,
    );

    expect(unusual).toEqual([]);
    expect(
      new Set(Arr.map(specs, (spec) => spec.delayMs)).size,
    ).toBeGreaterThan(5);
  });

  it("paints nothing for an unmeasured, empty or zero-count field", () => {
    expect(field({ width: 0 })).toEqual([]);
    expect(field({ height: Number.NaN })).toEqual([]);
    expect(field({ width: -360 })).toEqual([]);
    expect(field({ count: 0 })).toEqual([]);
  });

  it("caps a field at the number of tweens one box may run", () => {
    expect(field({ count: 10_000 })).toHaveLength(60);
    expect(field({ riseMs: bubbleRiseMs, count: 3 })).toHaveLength(3);
  });
});
