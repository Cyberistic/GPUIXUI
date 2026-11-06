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
