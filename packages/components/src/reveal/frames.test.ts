/**
 * The reveal's direction rule, without a renderer.
 *
 * The bugs these guard: an edge that travels the wrong way (content that should
 * rise arriving from above), a horizontal reveal that owns the wrong axis, a
 * "none" that still moves, and a distance that reaches the runtime as `NaN` or
 * as a fractional pixel it cannot paint.
 */

import { describe, expect, it } from "vitest";
import { revealFrames } from "./frames.js";

describe("revealFrames", () => {
  it("rises from below by the distance", () => {
    const frames = revealFrames("below", 12);
    expect(frames.initial).toEqual({ opacity: 0, top: 12 });
    expect(frames.animate).toEqual({ opacity: 1, top: 0 });
    expect(frames.exit).toEqual({ opacity: 0, top: 12 });
  });

  it("drops from above", () => {
    expect(revealFrames("above", 12).initial).toEqual({ opacity: 0, top: -12 });
  });

  it("names the edge the content comes from on the horizontal axis", () => {
    expect(revealFrames("right", 12).initial).toEqual({
      opacity: 0,
      left: 12,
    });
    expect(revealFrames("left", 12).initial).toEqual({
      opacity: 0,
      left: -12,
    });
  });

  it("fades without travelling for none", () => {
    const frames = revealFrames("none", 12);
    expect(frames.initial).toEqual({ opacity: 0 });
    expect(frames.animate).toEqual({ opacity: 1 });
    expect(frames.exit).toEqual({ opacity: 0 });
  });

  it("falls back to the house offset for a distance that cannot run", () => {
    expect(revealFrames("below", Number.NaN).initial).toEqual({
      opacity: 0,
      top: 8,
    });
    expect(revealFrames("below", 0).initial).toEqual({ opacity: 0, top: 8 });
    expect(revealFrames("below", -4).initial).toEqual({ opacity: 0, top: 8 });
  });

  it("rounds a fractional distance to a whole pixel", () => {
    expect(revealFrames("below", 7.6).initial).toEqual({ opacity: 0, top: 8 });
  });
});
