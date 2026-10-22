/**
 * The sheen's arithmetic, without a renderer.
 *
 * The bugs these guard: a band wider or thinner than the control's quarter; a
 * lead that starts inside the control (a pop on hover); halves that drift apart
 * as they travel (a seam opens in the sheen); a trail that stops before the lead;
 * and a gradient whose halves are the wrong way round, painting a hard edge where
 * the brightest line should be.
 */

import { describe, expect, it } from "vitest";
import { sheenFrames, sheenGradient, sheenHalf } from "./logic.js";

describe("sheenHalf", () => {
  it("is a quarter of the control", () => {
    expect(sheenHalf(240)).toBe(60);
  });

  it("rounds to a whole pixel", () => {
    expect(sheenHalf(250)).toBe(63);
  });

  it("never draws a line instead of a band", () => {
    expect(sheenHalf(20)).toBe(16);
  });
});

describe("sheenFrames", () => {
  it("starts with the sheen outside the control's left edge", () => {
    expect(sheenFrames(60, 240, "lead").initial).toEqual({ left: -120 });
    expect(sheenFrames(60, 240, "trail").initial).toEqual({ left: -60 });
  });

  it("ends with the lead past the control's right edge", () => {
    expect(sheenFrames(60, 240, "lead").animate).toEqual({ left: 240 });
    expect(sheenFrames(60, 240, "trail").animate).toEqual({ left: 300 });
  });

  it("moves both halves the same distance, so the seam cannot open", () => {
    const lead = sheenFrames(60, 240, "lead");
    const trail = sheenFrames(60, 240, "trail");
    expect((lead.animate.left ?? 0) - (lead.initial.left ?? 0)).toBe(
      (trail.animate.left ?? 0) - (trail.initial.left ?? 0),
    );
  });

  it("centres the band on the control half way across", () => {
    const half = 60;
    const width = 240;
    const { initial, animate } = sheenFrames(half, width, "lead");
    const middle =
      (initial.left ?? 0) + ((animate.left ?? 0) - (initial.left ?? 0)) / 2;

    expect(middle + half).toBe(width / 2);
  });
});

describe("sheenGradient", () => {
  it("brightens the lead and dims the trail", () => {
    expect(sheenGradient("#FFFFFF33", "#FFFFFF00", "lead")).toEqual({
      type: "linear-gradient",
      angle: 90,
      stops: [
        { color: "#FFFFFF00", position: 0 },
        { color: "#FFFFFF33", position: 1 },
      ],
    });
    expect(sheenGradient("#FFFFFF33", "#FFFFFF00", "trail")).toEqual({
      type: "linear-gradient",
      angle: 90,
      stops: [
        { color: "#FFFFFF33", position: 0 },
        { color: "#FFFFFF00", position: 1 },
      ],
    });
  });
});
