/**
 * Guards the clip rule every scrollable surface depends on (plan `820`).
 *
 * The bug being guarded: `overflow`, `overflowX` and `overflowY` resolve with
 * CSS precedence, and only `scroll`/`hidden` clip. A helper that reads only the
 * shorthand, that treats `auto` as clipping, or that reports every style as
 * "both" would make the probe's own expectations wrong — and a component that
 * asks it which axes to clip would clip the wrong ones.
 */
import { describe, expect, it } from "vitest";
import { clippedAxes, paintClip, stripIndexAt } from "./clip-model.js";

describe("clippedAxes", () => {
  it("clips both axes for a scroll viewport", () => {
    expect(clippedAxes({ overflow: "scroll" })).toBe("both");
    expect(clippedAxes({ overflow: "hidden" })).toBe("both");
  });

  it("lets an axis-specific value override the shorthand", () => {
    expect(clippedAxes({ overflow: "hidden", overflowX: "scroll" })).toBe(
      "both",
    );
    expect(clippedAxes({ overflow: "scroll", overflowY: "visible" })).toBe("x");
  });

  it("clips one axis for an x-only viewport", () => {
    expect(clippedAxes({ overflowX: "scroll" })).toBe("x");
    expect(clippedAxes({ overflowY: "hidden" })).toBe("y");
  });

  it("clips nothing for auto and visible", () => {
    expect(clippedAxes({ overflow: "auto" })).toBe("none");
    expect(clippedAxes({ overflow: "visible", overflowY: "auto" })).toBe(
      "none",
    );
    expect(clippedAxes({})).toBe("none");
  });
});

describe("paintClip", () => {
  it("clips both axes for any scroll container", () => {
    expect(paintClip({ overflowX: "scroll" })).toBe("both");
    expect(paintClip({ overflowY: "scroll" })).toBe("both");
    expect(paintClip({ overflow: "scroll" })).toBe("both");
  });

  it("keeps hidden's declared axes", () => {
    expect(paintClip({ overflowX: "hidden" })).toBe("x");
    expect(paintClip({ overflow: "hidden" })).toBe("both");
    expect(paintClip({ overflow: "auto" })).toBe("none");
  });
});

describe("stripIndexAt", () => {
  it("reads later strips as the negative offset grows", () => {
    expect(stripIndexAt(60, 0, 10)).toBe(0);
    expect(stripIndexAt(60, -130, 10)).toBe(2);
    expect(stripIndexAt(60, -130, 70)).toBe(3);
  });

  it("clamps above the content to the first strip", () => {
    expect(stripIndexAt(60, 40, 10)).toBe(0);
    expect(stripIndexAt(0, -130, 70)).toBe(0);
  });
});
