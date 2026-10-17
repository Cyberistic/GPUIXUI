/**
 * Guards the message scroller's distance-from-end arithmetic.
 *
 * The runtime's own numbers are the fixtures (plan `300` §1): 60 × 30 px rows in
 * a 300 px viewport anchor `[50, 0, 300]` at the tail, a 400 px wheel up lands
 * on `[42, 20, 300]`, and a streamed last row grows 30 → 40 → 50 px. The bugs
 * these catch: ignoring `offsetInItem` (every 10 px scroll looks like a row
 * boundary), forgetting the viewport height (the tail reads 300 px away), and
 * a short history that reports a positive distance (the affordance would show
 * on an empty thread).
 */
import { describe, expect, it } from "@effect/vitest";
import {
  contentHeight,
  distanceFromEnd,
  isPinned,
  scrollTop,
} from "./scroller-state.js";

const ROW = 30;
const VIEWPORT = 300;
const THRESHOLD = 24;

const fixed = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, () => ROW);

describe("scrollTop", () => {
  it("sums the rows before the anchor and adds the in-row offset", () => {
    expect(
      scrollTop(fixed(60), {
        index: 42,
        offsetInItem: 20,
        viewportHeight: VIEWPORT,
      }),
    ).toBe(1280);
  });

  it("treats an index past the end as the end", () => {
    expect(
      scrollTop(fixed(3), {
        index: 9,
        offsetInItem: 0,
        viewportHeight: VIEWPORT,
      }),
    ).toBe(90);
  });
});

describe("distanceFromEnd", () => {
  it("is zero at the tail", () => {
    expect(
      distanceFromEnd(fixed(60), {
        index: 50,
        offsetInItem: 0,
        viewportHeight: VIEWPORT,
      }),
    ).toBe(0);
  });

  it("measures a 400 px scroll up", () => {
    expect(
      distanceFromEnd(fixed(60), {
        index: 42,
        offsetInItem: 20,
        viewportHeight: VIEWPORT,
      }),
    ).toBe(220);
  });

  it("is zero for a history shorter than the viewport", () => {
    expect(
      distanceFromEnd(fixed(3), {
        index: 0,
        offsetInItem: 0,
        viewportHeight: VIEWPORT,
      }),
    ).toBe(0);
  });

  it("grows when the last row streams at a fixed anchor", () => {
    const heights = [...fixed(66), 30];
    const anchor = {
      index: 40,
      offsetInItem: 0,
      viewportHeight: VIEWPORT,
    };
    const before = distanceFromEnd(heights, anchor);
    const after = distanceFromEnd([...fixed(66), 50], anchor);
    expect(after - before).toBe(20);
  });
});

describe("isPinned", () => {
  it("pins at the tail", () => {
    expect(
      isPinned(
        fixed(60),
        { index: 50, offsetInItem: 0, viewportHeight: VIEWPORT },
        THRESHOLD,
      ),
    ).toBe(true);
  });

  it("pins within the threshold", () => {
    expect(
      isPinned(
        [...fixed(66), 50],
        { index: 57, offsetInItem: 10, viewportHeight: VIEWPORT },
        THRESHOLD,
      ),
    ).toBe(true);
  });

  it("unpins a single 400 px scroll up", () => {
    expect(
      isPinned(
        fixed(60),
        { index: 42, offsetInItem: 20, viewportHeight: VIEWPORT },
        THRESHOLD,
      ),
    ).toBe(false);
  });

  it("pins a short history", () => {
    expect(
      isPinned(
        fixed(3),
        { index: 0, offsetInItem: 0, viewportHeight: VIEWPORT },
        THRESHOLD,
      ),
    ).toBe(true);
  });
});

describe("contentHeight", () => {
  it("adds every declared row", () => {
    expect(contentHeight([20, 40, 60])).toBe(120);
  });
});
