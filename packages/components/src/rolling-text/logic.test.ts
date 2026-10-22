/**
 * The roll's direction, without a renderer.
 *
 * The bugs these guard: a roll whose entry and exit share an edge (the new value
 * would be visible before it arrives), and a distance that cannot be laid out
 * reaching the runtime as `null` instead of no travel. The two-phase state
 * machine and the split timing are shared with the horizontal slide and held by
 * `src/internal/text-swap.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { rollFrames } from "./logic.js";

describe("rollFrames", () => {
  it("enters from below and leaves above when rolling up", () => {
    const frames = rollFrames("up", 20);
    expect(frames.enterFrom).toEqual({ opacity: 0, top: 20 });
    expect(frames.exitTo).toEqual({ opacity: 0, top: -20 });
    expect(frames.rest).toEqual({ opacity: 1, top: 0 });
  });

  it("reverses both edges when rolling down", () => {
    const frames = rollFrames("down", 20);
    expect(frames.enterFrom).toEqual({ opacity: 0, top: -20 });
    expect(frames.exitTo).toEqual({ opacity: 0, top: 20 });
  });

  it("treats a broken distance as no travel rather than as NaN", () => {
    expect(rollFrames("up", Number.NaN).enterFrom).toEqual({
      opacity: 0,
      top: 0,
    });
    expect(rollFrames("up", -8).exitTo).toEqual({ opacity: 0, top: 0 });
  });
});
