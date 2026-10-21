/**
 * The box model (plan `835`).
 *
 * The bug being guarded: the shipped library insets with `padding` in 144 call
 * sites and places with `margin` (including the slider thumb's negative pair),
 * and no scenario asserted either. A model that ignored an inset, resolved a
 * percentage against the border box, or let vertical margins collapse would
 * move the runtime checks and their expectations together, silently.
 */
import { describe, expect, it } from "vitest";
import {
  allSides,
  centreOffset,
  contentHeight,
  contentOffset,
  contentWidth,
  marginRow,
  near,
  paintedBox,
  percentOf,
  reportedRight,
  stackedStart,
  stretchHeight,
} from "./box-inset-model.js";

const uniform = allSides(16);

describe("contentBox", () => {
  it("subtracts a uniform inset from both axes", () => {
    expect(contentWidth(240, uniform)).toBe(208);
    expect(contentHeight(84, uniform)).toBe(52);
  });

  it("subtracts only each side's own inset", () => {
    expect(contentWidth(240, { top: 4, right: 8, bottom: 24, left: 40 })).toBe(
      192,
    );
    expect(contentHeight(120, { top: 4, right: 8, bottom: 24, left: 40 })).toBe(
      92,
    );
  });

  it("takes the border out of the report before subtracting padding", () => {
    expect(contentWidth(236, uniform)).toBe(204);
  });

  it("places the content origin after the border and padding", () => {
    expect(contentOffset(uniform, 0)).toEqual({ x: 16, y: 16 });
    expect(contentOffset(uniform, 2)).toEqual({ x: 18, y: 18 });
  });
});

describe("percentOf", () => {
  it("resolves against the content box the caller passes", () => {
    expect(percentOf(208, 50)).toBe(104);
    expect(percentOf(60, 100)).toBe(60);
  });
});

describe("paintedBox", () => {
  it("recovers the painted origin and keeps the padding-box size", () => {
    expect(
      paintedBox({ x: 16, y: 16, width: 240, height: 120 }, uniform, 0),
    ).toEqual({ x: 0, y: 0, width: 240, height: 120 });
  });

  it("adds the border back on every side", () => {
    expect(
      paintedBox({ x: 18, y: 18, width: 236, height: 116 }, uniform, 2),
    ).toEqual({ x: 0, y: 0, width: 240, height: 120 });
  });
});

describe("marginRow", () => {
  it("offsets a positive margin and pulls a negative one back", () => {
    expect(marginRow([50, 50, 50], [0, 20, -10])).toEqual([0, 70, 110]);
  });

  it("overlaps a neighbour when the margin is negative", () => {
    const [, , third] = marginRow([50, 50, 50], [0, 20, -10]);
    expect(third).toBeLessThan(120);
    expect(120 - (third ?? 0)).toBe(10);
  });
});

describe("vertical margins", () => {
  it("adds rather than collapses", () => {
    expect(stackedStart(20, 20, 10)).toBe(50);
  });
});

describe("centreOffset", () => {
  it("centres the margin box, not the content box", () => {
    expect(centreOffset(60, 20, 4, 6)).toBe(19);
    expect(centreOffset(60, 20, 0, 0)).toBe(20);
  });

  it("clamps a margin box taller than the row", () => {
    expect(centreOffset(20, 20, 20, 20)).toBe(20);
  });
});

describe("stretchHeight", () => {
  it("subtracts both vertical margins", () => {
    expect(stretchHeight(60, 10, 10)).toBe(40);
  });

  it("never goes negative", () => {
    expect(stretchHeight(20, 20, 20)).toBe(0);
  });
});

describe("the reported rectangle", () => {
  it("overshoots the painted right edge by the leading inset", () => {
    const reported = { x: 12, y: 12, width: 200, height: 60 };
    const painted = paintedBox(reported, allSides(12), 0);
    expect(reportedRight(reported)).toBe(212);
    expect(painted.x + painted.width).toBe(200);
    expect(reportedRight(reported) - (painted.x + painted.width)).toBe(12);
  });
});

describe("near", () => {
  it("accepts a one-pixel drift and rejects two", () => {
    expect(near(300, 299)).toBe(true);
    expect(near(300, 298)).toBe(false);
  });
});
