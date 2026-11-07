import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  angleOf,
  breathesAtAll,
  gradientBaseAngle,
  gradientBaseShift,
  gradientLegCap,
  gradientLegFloor,
  gradientLegMs,
  legOf,
  oneTurn,
  radiusOf,
  rampOf,
  shiftOf,
  shiftedRampOf,
} from "./logic.js";

const some = Option.some<number>;
const none = Option.none<number>();

describe("rampOf", () => {
  it("paints two stops from the caller's colours in order", () => {
    expect(rampOf("#111111", "#222222", gradientBaseAngle)).toEqual({
      type: "linear-gradient",
      angle: gradientBaseAngle,
      stops: [
        { color: "#111111", position: 0 },
        { color: "#222222", position: 1 },
      ],
    });
  });

  it("wraps an angle into one turn", () => {
    expect(rampOf("#000000", "#FFFFFF", 380).angle).toBe(20);
    expect(rampOf("#000000", "#FFFFFF", -10).angle).toBe(350);
    expect(rampOf("#000000", "#FFFFFF", 720).angle).toBe(0);
  });

  it("is the same ramp for the same colours and angle", () => {
    expect(rampOf("#123456", "#654321", 45)).toEqual(
      rampOf("#123456", "#654321", 45),
    );
  });
});

describe("oneTurn", () => {
  it("puts every angle in [0, 360)", () => {
    expect([0, 90, 359, 360, 361, -1, -360, 1080].map(oneTurn)).toEqual([
      0, 90, 359, 0, 1, 359, 0, 0,
    ]);
  });
});

describe("angleOf", () => {
  it("falls back to the house angle for a value it cannot turn", () => {
    expect(angleOf(none)).toBe(gradientBaseAngle);
    expect(angleOf(some(Number.NaN))).toBe(gradientBaseAngle);
    expect(angleOf(some(Number.POSITIVE_INFINITY))).toBe(gradientBaseAngle);
    expect(angleOf(some(-90))).toBe(270);
  });
});

describe("shiftOf", () => {
  it("takes a wrapped quarter turn as the house shift", () => {
    expect(shiftOf(none)).toBe(gradientBaseShift);
    expect(shiftOf(some(Number.NaN))).toBe(gradientBaseShift);

    expect(shiftOf(some(360))).toBe(0);
  });
});

describe("breathesAtAll", () => {
  it("counts a whole turn as no second ramp at all", () => {
    expect(breathesAtAll(0)).toBe(false);
    expect(breathesAtAll(360)).toBe(false);
    expect(breathesAtAll(-360)).toBe(false);
    expect(breathesAtAll(Number.NaN)).toBe(false);
    expect(breathesAtAll(90)).toBe(true);
    expect(breathesAtAll(-90)).toBe(true);
  });
});

describe("shiftedRampOf", () => {
  it("paints the same stops one shift later", () => {
    const base = rampOf("#111111", "#222222", 40);
    expect(shiftedRampOf("#111111", "#222222", 40, 100)).toEqual({
      ...base,
      angle: 140,
    });
    expect(shiftedRampOf("#111111", "#222222", 40, 320).angle).toBe(0);
  });
});

describe("legOf", () => {
  it("holds one leg of the breath to a duration the runtime can paint", () => {
    expect(legOf(none)).toBe(gradientLegMs);
    expect(legOf(some(Number.NaN))).toBe(gradientLegMs);

    expect(legOf(some(gradientLegFloor - 1))).toBe(gradientLegMs);
    expect(legOf(some(gradientLegCap + 1))).toBe(gradientLegCap);
    expect(legOf(some(2_400))).toBe(2_400);
  });
});

describe("radiusOf", () => {
  it("refuses a radius that is not a shape", () => {
    expect(radiusOf(none)).toBe(0);
    expect(radiusOf(some(Number.NaN))).toBe(0);
    expect(radiusOf(some(-8))).toBe(0);
    expect(radiusOf(some(0))).toBe(0);
    expect(radiusOf(some(12))).toBe(12);
  });
});
