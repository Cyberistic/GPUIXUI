/**
 * Placement rules for GPUix's anchored layer.
 *
 * The bugs these guard (plan 156 §8, re-measured in plan 323): the runtime puts a
 * centred surface's end on the anchor's centre line, and `fit="snap"` moves a
 * bottom surface up over its trigger instead of flipping it.
 */

import { describe, expect, it } from "vitest";
import {
  offsetOf,
  resolvePlacement,
  resolveSide,
  type PlacementInput,
} from "./placement.js";

const trigger = { x: 200, y: 120, width: 120, height: 40 } as const;
const window = { width: 1280, height: 800 } as const;

const input = (overrides: Partial<PlacementInput>): PlacementInput => ({
  side: "bottom",
  align: "start",
  trigger,
  surface: { x: 200, y: 166, width: 160, height: 80 },
  window,
  margin: 8,
  ...overrides,
});

describe("resolvePlacement", () => {
  it("centres a bottom surface from a start placement", () => {
    expect(resolvePlacement(input({ align: "center" }))).toEqual({
      side: "bottom",
      align: "start",
      alignOffset: -20,
    });
  });

  it("centres a side surface on the vertical axis", () => {
    expect(resolvePlacement(input({ side: "right", align: "center" }))).toEqual(
      {
        side: "right",
        align: "start",
        alignOffset: -20,
      },
    );
  });

  it("leaves start and end unshifted", () => {
    expect(resolvePlacement(input({ align: "start" }))).toEqual({
      side: "bottom",
      align: "start",
      alignOffset: 0,
    });
    expect(resolvePlacement(input({ align: "end" }))).toEqual({
      side: "bottom",
      align: "end",
      alignOffset: 0,
    });
  });

  it("keeps the requested side when it does not cover the trigger", () => {
    expect(resolvePlacement(input({ side: "bottom" })).side).toBe("bottom");
  });

  it("opens above a bottom surface that snapping moved over its trigger", () => {
    const snapped = input({
      trigger: { x: 200, y: 730, width: 120, height: 40 },
      surface: { x: 200, y: 712, width: 160, height: 80 },
    });

    expect(resolveSide(snapped)).toBe("top");
  });

  it("opens below a top surface that snapping moved over its trigger", () => {
    const snapped = input({
      side: "top",
      trigger: { x: 200, y: 0, width: 120, height: 40 },
      surface: { x: 200, y: -40, width: 160, height: 80 },
    });

    expect(resolveSide(snapped)).toBe("bottom");
  });

  it("opens on the roomier horizontal side when a right surface covers its trigger", () => {
    const snapped = input({
      side: "right",
      trigger: { x: 1200, y: 120, width: 60, height: 40 },
      surface: { x: 1112, y: 120, width: 160, height: 80 },
    });

    expect(resolveSide(snapped)).toBe("left");
  });

  it("chooses the roomier side when neither side fits", () => {
    const tall = input({
      trigger: { x: 200, y: 400, width: 120, height: 40 },
      surface: { x: 200, y: 52, width: 160, height: 740 },
    });

    expect(resolveSide(tall)).toBe("top");
  });

  it("keeps the surface's axis when a centred surface flips", () => {
    const flipped = resolvePlacement(
      input({
        align: "center",
        trigger: { x: 200, y: 730, width: 120, height: 40 },
        surface: { x: 200, y: 712, width: 160, height: 80 },
      }),
    );

    expect(flipped).toEqual({
      side: "top",
      align: "start",
      alignOffset: -20,
    });
  });
});

describe("offsetOf", () => {
  it("keeps a caller's finite offset, including zero and a negative one", () => {
    expect(offsetOf(0, 6)).toBe(0);
    expect(offsetOf(-4, 6)).toBe(-4);
    expect(offsetOf(2.5, 6)).toBe(2.5);
  });

  it("falls back to each surface's documented default for a non-finite offset", () => {
    expect(offsetOf(Number.NaN, 6)).toBe(6);
    expect(offsetOf(Number.POSITIVE_INFINITY, 0)).toBe(0);
    expect(offsetOf(Number.NEGATIVE_INFINITY, 8)).toBe(8);
  });
});
