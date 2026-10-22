import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  atEdge,
  controlDisabled,
  describeSlide,
  dotActiveWidth,
  dotHeight,
  dotLabel,
  dotRestWidth,
  dotTarget,
  dotWidth,
  firstIndex,
  goToIndex,
  lastIndex,
  resolveActive,
  rovingStop,
  stepIndex,
} from "./carousel-preview";

/**
 * The carousel preview's arithmetic.
 *
 * The component keeps **one** clamp and **one** loop rule behind three routes
 * to a slide (controls, arrow keys, dots). A preview that wraps on a dot but
 * stops at a control shows a carousel nobody ships, and a preview whose active
 * dot is only a different hue tells a reader who cannot separate the two hues
 * nothing. The drawing's numbers are the component's constants, read from its
 * source rather than trusted, so the preview cannot lose the pill or grow past
 * the 24px press floor.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const source = readFileSync(
  new URL(
    "../../../../../packages/components/src/carousel.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("the carousel preview", () => {
  it("clamps the active slide into the set it has", () => {
    // A controlled value outlives a slide being removed, and the component
    // resolves it into the range before painting. An empty track paints no
    // slide, so the index it resolves to is the only one that cannot point at
    // one.
    expect([resolveActive(2, 4), resolveActive(9, 4), resolveActive(-3, 4)]).toEqual([
      2, 3, 0,
    ]);
    expect(resolveActive(3, 0)).toBe(0);
  });

  it("steps one slide and stays inside the set", () => {
    const step = (active: number, delta: 1 | -1): number =>
      stepIndex({ active, count: 4, delta, loop: false });

    expect(step(1, 1)).toBe(2);
    expect(step(2, -1)).toBe(1);
  });

  it("stops at both ends when the carousel does not loop", () => {
    // This is why the control at an edge is disabled: the step is a no-op, and
    // a live control that does nothing reads as a broken one.
    expect(stepIndex({ active: 3, count: 4, delta: 1, loop: false })).toBe(3);
    expect(stepIndex({ active: 0, count: 4, delta: -1, loop: false })).toBe(0);
    expect(atEdge(3, 4, 1)).toBe(true);
    expect(atEdge(0, 4, -1)).toBe(true);
    expect(atEdge(1, 4, 1)).toBe(false);
  });

  it("wraps past both ends when the carousel loops", () => {
    expect(stepIndex({ active: 3, count: 4, delta: 1, loop: true })).toBe(0);
    expect(stepIndex({ active: 0, count: 4, delta: -1, loop: true })).toBe(3);
  });

  it("jumps to the slide a dot names, clamped like the root's value", () => {
    expect(goToIndex(2, 4)).toBe(2);
    expect(goToIndex(9, 4)).toBe(3);
    expect(goToIndex(-1, 4)).toBe(0);
  });

  it("reaches both ends with Home and End", () => {
    expect(firstIndex()).toBe(0);
    expect(lastIndex(4)).toBe(3);
    expect(lastIndex(0)).toBe(0);
  });

  it("disables a control at an edge, unless the carousel loops or is empty", () => {
    const disabled = (active: number, delta: 1 | -1, loop: boolean): boolean =>
      controlDisabled({ active, count: 3, delta, loop });

    expect(disabled(0, -1, false)).toBe(true);
    expect(disabled(2, 1, false)).toBe(true);
    expect(disabled(1, 1, false)).toBe(false);
    expect(disabled(0, -1, true)).toBe(false);
    expect(disabled(2, 1, true)).toBe(false);
    // An empty track has nothing to step to at either end.
    expect(
      controlDisabled({ active: 0, count: 0, delta: 1, loop: true }),
    ).toBe(true);
  });

  it("keeps one roving stop, on the slide the reader is looking at", () => {
    expect(rovingStop(0)).toBe(0);
    expect(rovingStop(2)).toBe(2);
  });

  it("draws the active dot as a wider pill, inside the shared press floor", () => {
    // Both facts are read off the component: a state carried only by colour is
    // a state a colour-blind reader cannot see, and a 6px dot is not a target
    // until something reserves the floor around it.
    expect(source).toContain("const DOT_HEIGHT = 6;");
    expect(source).toContain("const DOT_REST_WIDTH = 6;");
    expect(source).toContain("const DOT_ACTIVE_WIDTH = 18;");
    expect(source).toContain("width: targetSize.minimum");
    expect(source).toContain("height: targetSize.minimum");

    expect(dotHeight).toBe(6);
    expect(dotRestWidth).toBe(6);
    expect(dotActiveWidth).toBe(18);
    expect(dotTarget).toBeGreaterThanOrEqual(24);
    expect(dotWidth(true)).toBeGreaterThan(dotWidth(false));
    expect(dotWidth(false)).toBe(dotRestWidth);
  });

  it("names every dot and says where the carousel is in its set", () => {
    expect([dotLabel(0), dotLabel(3)]).toEqual([
      "Go to slide 1",
      "Go to slide 4",
    ]);
    expect(describeSlide(0, 4, false)).toBe("Slide 1 of 4 · stops at the ends");
    expect(describeSlide(3, 4, true)).toBe("Slide 4 of 4 · wraps at both ends");
    expect(describeSlide(0, 0, false)).toBe("No slides");
  });
});
