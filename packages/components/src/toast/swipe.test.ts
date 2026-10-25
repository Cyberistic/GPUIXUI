/**
 * The swipe's two rules.
 *
 * The bug these guard: a drag with no threshold either dismissed on the first
 * pixel or never dismissed at all, and a velocity rule with no minimum travel
 * read a one-pixel jitter as a flick. The tests pin the distance rule, the
 * flick rule, the floor that keeps a fast gesture from dismissing nothing, and
 * the arithmetic that keeps a failed measurement from throwing a card off
 * screen.
 */

import { describe, expect, it } from "vitest";
import {
  SWIPE_MIN_TRAVEL,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY,
  swipeEdge,
} from "./swipe.js";

describe("a slow drag", () => {
  it("springs back below the threshold", () => {
    expect(swipeEdge(SWIPE_THRESHOLD - 1, 1_000)).toBe(undefined);
    expect(swipeEdge(-(SWIPE_THRESHOLD - 1), 1_000)).toBe(undefined);
  });

  it("dismisses toward the edge it crossed", () => {
    expect(swipeEdge(SWIPE_THRESHOLD, 1_000)).toBe("right");
    expect(swipeEdge(-SWIPE_THRESHOLD, 1_000)).toBe("left");
    expect(swipeEdge(180, 1_000)).toBe("right");
  });
});

describe("a flick", () => {
  it("dismisses under the distance threshold once it is fast enough", () => {
    const travel = SWIPE_VELOCITY * 40;
    expect(travel).toBeGreaterThanOrEqual(SWIPE_MIN_TRAVEL);
    expect(swipeEdge(travel, 40)).toBe("right");
    expect(swipeEdge(-travel, 40)).toBe("left");
  });

  it("keeps a jitter that never travelled", () => {
    // One pixel in one millisecond is a speed past the rule; it is not a
    // gesture, because the card never moved.
    expect(swipeEdge(1, 1)).toBe(undefined);
    expect(swipeEdge(-(SWIPE_MIN_TRAVEL - 1), 1)).toBe(undefined);
  });
});

describe("a gesture it cannot read", () => {
  it("springs back rather than dismissing on a failed measurement", () => {
    expect(swipeEdge(Number.NaN, 200)).toBe(undefined);
    expect(swipeEdge(120, Number.NaN)).toBe(undefined);
    expect(swipeEdge(Number.POSITIVE_INFINITY, 200)).toBe(undefined);
    expect(swipeEdge(0, 0)).toBe(undefined);
  });
});
