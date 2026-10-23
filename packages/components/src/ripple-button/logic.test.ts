/**
 * The ripple's geometry, without a renderer.
 *
 * The bugs these guard: a ripple that starts where the window is rather than
 * where the control is; a keyboard activation that ripples from a corner; a
 * circle too small to cover the control when the press is at an edge; frames
 * whose left/top drift off the press point as the radius grows; a newborn
 * ripple that is already invisible; and a press payload whose axis cannot be
 * read starting the disc at `NaN` instead of the centre.
 */

import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import {
  rippleFrames,
  rippleOpacity,
  ripplePoint,
  rippleReach,
} from "./logic.js";

/** The box a control reports when it sits at (100, 40) and is 80 x 32. */
const box = { x: 100, y: 40, width: 80, height: 32 };

const event = (fields: Partial<EventPayload>): EventPayload => ({
  elementId: 1,
  eventType: "click",
  ...fields,
});

describe("ripplePoint", () => {
  it("re-expresses a pointer's window position inside the control", () => {
    expect(ripplePoint(event({ x: 124, y: 52 }), box)).toEqual({
      x: 24,
      y: 12,
    });
  });

  it("starts a keyboard activation at the centre", () => {
    expect(ripplePoint(event({ eventType: "click" }), box)).toEqual({
      x: 40,
      y: 16,
    });
  });

  it("ignores a lone axis instead of mixing a pointer with the centre", () => {
    expect(ripplePoint(event({ x: 124 }), box)).toEqual({ x: 40, y: 16 });
  });

  it("starts a press it cannot locate at the centre", () => {
    // A payload axis the runtime cannot read is no press point: the ripple it
    // paints would otherwise be born at `NaN` and the disc would vanish. The
    // centre is the same point a keyboard activation uses.
    expect(ripplePoint(event({ x: Number.NaN, y: 52 }), box)).toEqual({
      x: 40,
      y: 16,
    });
  });
});

describe("rippleReach", () => {
  it("covers the farthest corner from a press in the near corner", () => {
    expect(rippleReach({ x: 0, y: 0 }, box)).toBe(
      Math.ceil(Math.hypot(80, 32)),
    );
  });

  it("needs only half the diagonal from the centre", () => {
    expect(rippleReach({ x: 40, y: 16 }, box)).toBe(
      Math.ceil(Math.hypot(40, 16)),
    );
  });
});

describe("rippleFrames", () => {
  it("grows a disc centred on the press point and fades it out", () => {
    const frames = rippleFrames({ x: 24, y: 12 }, 10);

    expect(frames.initial).toEqual({
      width: 0,
      height: 0,
      left: 24,
      top: 12,
      borderRadius: 0,
      opacity: rippleOpacity,
    });
    expect(frames.animate).toEqual({
      width: 20,
      height: 20,
      left: 14,
      top: 2,
      borderRadius: 10,
      opacity: 0,
    });
  });

  it("keeps the centre on the press point at every radius", () => {
    const point = { x: 31, y: 7 };
    const frames = rippleFrames(point, 21);

    expect((frames.animate.left ?? 0) + (frames.animate.width ?? 0) / 2).toBe(
      point.x,
    );
    expect((frames.animate.top ?? 0) + (frames.animate.height ?? 0) / 2).toBe(
      point.y,
    );
  });
});
