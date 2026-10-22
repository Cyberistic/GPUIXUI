/**
 * The scroll reading, without a renderer.
 *
 * The bugs these guard: a progress bar that divides by a content box the
 * viewport already covers (`Infinity` or a fraction above 1); an offset past
 * either end painting a value the reader cannot reach; a box with nothing to
 * scroll offering a fade or a non-zero reading; and a `NaN` measurement reaching
 * the runtime as a style value.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { edgeGradient, scrollMetrics, scrollSize } from "./metrics.js";

const sample = (
  offsetY: number,
  viewportHeight: number,
  contentHeight: number,
) => scrollMetrics({ offsetY, viewportHeight, contentHeight });

describe("scrollMetrics", () => {
  it("reads the start, the middle and the end of the travel", () => {
    expect(sample(0, 200, 600).progress).toBe(0);
    expect(sample(-200, 200, 600).progress).toBe(0.5);
    expect(sample(-400, 200, 600).progress).toBe(1);
  });

  it("clamps an offset past either end to what the reader can see", () => {
    expect(sample(40, 200, 600).progress).toBe(0);
    expect(sample(-900, 200, 600).progress).toBe(1);
  });

  it("reads zero and no travel when the content fits", () => {
    const metrics = sample(-40, 200, 120);
    expect(metrics).toMatchObject({
      progress: 0,
      scrollable: false,
      atStart: true,
      atEnd: true,
    });
  });

  it("hides the top edge at the start and the bottom edge at the end", () => {
    expect(sample(0, 200, 600)).toMatchObject({
      scrollable: true,
      atStart: true,
      atEnd: false,
    });
    expect(sample(-200, 200, 600)).toMatchObject({
      atStart: false,
      atEnd: false,
    });
    expect(sample(-400, 200, 600)).toMatchObject({
      atStart: false,
      atEnd: true,
    });
  });

  it("treats a one-pixel difference as rounding, not a scroll", () => {
    expect(sample(-1, 200, 201).scrollable).toBe(false);
  });

  it("ignores a measurement that is not a number", () => {
    expect(sample(Number.NaN, Number.NaN, Number.NaN)).toEqual({
      progress: 0,
      offsetY: 0,
      scrollable: false,
      atStart: true,
      atEnd: true,
    });
    expect(sample(-200, 200, Number.POSITIVE_INFINITY).progress).toBe(0);
  });

  it("keeps the offset a pinned header is positioned from, clamped", () => {
    expect(sample(0, 200, 600).offsetY).toBe(0);
    expect(sample(-240, 200, 600).offsetY).toBe(-240);
    // A bounce past either end reports the end the reader can see.
    expect(sample(40, 200, 600).offsetY).toBe(0);
    expect(sample(-900, 200, 600).offsetY).toBe(-400);
  });
});

describe("edgeGradient", () => {
  const stops = { solid: "#222730", clear: "#22273000" };

  it("paints the top edge opaque at the top", () => {
    expect(edgeGradient("top", stops)).toEqual({
      type: "linear-gradient",
      angle: 180,
      stops: [
        { color: "#222730", position: 0 },
        { color: "#22273000", position: 1 },
      ],
    });
  });

  it("paints the bottom edge opaque at the bottom", () => {
    const bottom = edgeGradient("bottom", stops);
    expect(bottom.angle).toBe(0);
    expect(bottom.stops[0]).toEqual({ color: "#222730", position: 0 });
  });
});

describe("scrollSize", () => {
  it("rounds a usable size and falls back for one that cannot paint", () => {
    expect(scrollSize(Option.some(7.6), 3)).toBe(8);
    expect(scrollSize(Option.some(0), 3)).toBe(3);
    expect(scrollSize(Option.some(Number.NaN), 3)).toBe(3);
    expect(scrollSize(Option.none(), 32)).toBe(32);
  });
});
