/**
 * The liquid flood's arithmetic.
 *
 * The bugs these guard: a pointer inside the left half entering from the right;
 * a flood born across the control instead of empty at its edge; a right-edge
 * flood that grows the wrong way; a width of `NaN` reaching the runtime; and a
 * drain that empties toward the edge the pointer entered from rather than the
 * one it left through.
 */

import { describe, expect, it } from "vitest";
import {
  liquidAcross,
  liquidEdge,
  liquidEmpty,
  liquidFrame,
  liquidOpacity,
} from "./logic.js";

/** A 240-wide control at x = 100. */
const box = { x: 100, width: 240 };

describe("liquidEdge", () => {
  it("enters from the half the pointer is on", () => {
    expect(liquidEdge(150, box)).toBe("left");
    expect(liquidEdge(300, box)).toBe("right");
  });

  it("names the side a pointer that has left the control went through", () => {
    expect(liquidEdge(-20, box)).toBe("left");
    expect(liquidEdge(400, box)).toBe("right");
  });
});

describe("the frames a flood paints", () => {
  it("is born empty at the left edge", () => {
    expect(liquidEmpty("left", 240)).toEqual({ left: 0, width: 0 });
  });

  it("is born empty at the right edge", () => {
    expect(liquidEmpty("right", 240)).toEqual({ left: 240, width: 0 });
  });

  it("covers the control", () => {
    expect(liquidAcross(240)).toEqual({ left: 0, width: 240 });
  });

  it("picks the empty or the across frame from its phase", () => {
    expect(liquidFrame("right", 240, true)).toEqual(liquidAcross(240));
    expect(liquidFrame("right", 240, false)).toEqual(liquidEmpty("right", 240));
  });

  it("spans nothing for a width that cannot be painted", () => {
    expect(liquidEmpty("right", Number.NaN)).toEqual({ left: 0, width: 0 });
    expect(liquidAcross(-4)).toEqual({ left: 0, width: 0 });
  });
});

describe("the wash", () => {
  it("is a light share of the ink, not a second colour", () => {
    expect(liquidOpacity).toBeGreaterThan(0);
    expect(liquidOpacity).toBeLessThan(0.3);
  });
});
