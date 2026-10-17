/**
 * Guards the divider's resize arithmetic.
 *
 * The bug: a divider that applies the pointer delta without clamping can
 * invert a pane — a large negative drag yields a negative width and the layout
 * collapses. `nextSize` must clamp `[min, max]` inclusively, so these tests
 * fail if the clamp is dropped or made exclusive.
 */
import { describe, expect, it } from "vitest";
import { nextSize } from "./resize.js";

describe("nextSize", () => {
  it("applies the pointer delta in both directions", () => {
    expect(nextSize({ start: 320, pointerDelta: 80, min: 80, max: 600 })).toBe(
      400,
    );
    expect(nextSize({ start: 320, pointerDelta: -40, min: 80, max: 600 })).toBe(
      280,
    );
  });

  it("clamps inclusively at both bounds", () => {
    expect(
      nextSize({ start: 320, pointerDelta: 1000, min: 80, max: 600 }),
    ).toBe(600);
    expect(
      nextSize({ start: 320, pointerDelta: -1000, min: 80, max: 600 }),
    ).toBe(80);
    expect(nextSize({ start: 80, pointerDelta: 0, min: 80, max: 600 })).toBe(
      80,
    );
    expect(nextSize({ start: 600, pointerDelta: 0, min: 80, max: 600 })).toBe(
      600,
    );
  });

  it("never returns a width below the minimum for a huge negative drag", () => {
    const width = nextSize({
      start: 320,
      pointerDelta: -10_000,
      min: 80,
      max: 600,
    });
    expect(width).toBe(80);
    expect(width).toBeGreaterThan(0);
  });
});
