/**
 * The `nested-scroll-lifecycle` fixture, held to the geometry its probe reads.
 *
 * Every claim the probe makes about a wheel needs the layout to be true first:
 * a wheel aimed at the inner scroller must be over the inner and inside the
 * outer, the outer-only wheel must aim below the inner rather than over it, and
 * both scrollers must have travel left when the probe asks. A layout change
 * that breaks any of those would let the probe pass while measuring one
 * scroller instead of two.
 */
import { describe, expect, it } from "vitest";
import {
  FILLER_ROW_HEIGHT,
  INNER_MAX,
  INNER_ROW_HEIGHT,
  INNER_ROWS,
  INNER_STEP,
  INNER_TOP,
  INNER_VIEWPORT,
  OUTER_CONTENT,
  OUTER_MAX,
  OUTER_ONLY_ROW,
  OUTER_VIEWPORT,
  fillerTop,
  innerRowTop,
} from "./nested-scroll.js";

describe("the nested-scroll fixture", () => {
  it("gives both scrollers somewhere to scroll", () => {
    expect(INNER_MAX).toBe(-340);
    expect(OUTER_MAX).toBe(-360);
    expect(INNER_MAX).toBeLessThan(0);
    expect(OUTER_MAX).toBeLessThan(0);
  });

  it("puts the inner scroller wholly inside the outer viewport at rest", () => {
    expect(INNER_TOP + INNER_VIEWPORT.height).toBeLessThanOrEqual(
      OUTER_VIEWPORT.height,
    );
    expect(INNER_VIEWPORT.width).toBeLessThanOrEqual(OUTER_VIEWPORT.width);
  });

  it("keeps the first wheel short of the inner's end", () => {
    expect(Math.abs(INNER_STEP)).toBeLessThan(-INNER_MAX);
  });

  it("aims the outer-only wheel below the inner scroller, inside the outer", () => {
    const top = fillerTop(OUTER_ONLY_ROW);
    expect(top).toBeGreaterThanOrEqual(INNER_TOP + INNER_VIEWPORT.height);
    expect(top + FILLER_ROW_HEIGHT / 2).toBeLessThan(OUTER_VIEWPORT.height);
    expect(top).toBeLessThan(OUTER_CONTENT);
  });

  it("stacks the inner rows past the fold, one row apart", () => {
    expect(innerRowTop(1) - innerRowTop(0)).toBe(INNER_ROW_HEIGHT);
    expect(innerRowTop(INNER_ROWS - 1)).toBeGreaterThanOrEqual(
      INNER_VIEWPORT.height,
    );
    expect(innerRowTop(INNER_ROWS - 1) + INNER_ROW_HEIGHT).toBeLessThanOrEqual(
      -INNER_MAX + INNER_VIEWPORT.height,
    );
  });
});
