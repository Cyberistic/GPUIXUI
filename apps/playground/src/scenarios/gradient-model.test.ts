/**
 * Guards the gradient expectations (plan `807`).
 *
 * The bug being guarded: `StyleDesc.background` publishes a two-stop linear
 * gradient that neither the library nor the suite ever used, so nothing said
 * whether it paints, which way the angle runs, what `colorSpace: "oklab"` does,
 * or that an out-of-range stop is dropped. The native checks compare the frame
 * with these functions; these tests pin the functions themselves — the sRGB
 * arithmetic, the CSS-Oklab conversion (an independent implementation, not the
 * runtime's shader), the stop-position clamp and the sample mapper — so a frame
 * check cannot agree with a broken expectation.
 */
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import {
  channelDistance,
  colourAt,
  oklabAt,
  pointAt,
  srgbAt,
  type Gradient,
  type GradientColourSpace,
} from "./gradient-model.js";

/** A test fixture colour; a bad literal is a programmer bug, not a domain failure. */
const colour = (hex: string): Pixels.Rgba =>
  Option.getOrElse(Pixels.hexToRgba(hex), () => {
    throw new Error(`test fixture ${hex} is not a colour`);
  });

const BLUE = colour("#0000FF");
const RED = colour("#FF0000");

const gradient = (
  colorSpace?: GradientColourSpace,
  positions: readonly [number, number] = [0, 1],
): Gradient => ({
  angle: 90,
  stops: [
    { color: BLUE, position: positions[0] },
    { color: RED, position: positions[1] },
  ],
  ...(colorSpace === undefined ? {} : { colorSpace }),
});

describe("srgbAt", () => {
  it("returns each endpoint exactly at the ends", () => {
    const g = gradient("srgb");
    expect(srgbAt(g, 0)).toEqual(BLUE);
    expect(srgbAt(g, 1)).toEqual(RED);
  });

  it("mixes the midpoint channel by channel", () => {
    expect(srgbAt(gradient("srgb"), 0.5)).toEqual(colour("#800080"));
  });

  it("clamps a stop pair into flat bands", () => {
    const g = gradient("srgb", [0.25, 0.75]);
    expect(srgbAt(g, 0.05)).toEqual(BLUE);
    expect(srgbAt(g, 0.2)).toEqual(BLUE);
    expect(srgbAt(g, 0.8)).toEqual(RED);
    expect(srgbAt(g, 0.95)).toEqual(RED);
    expect(srgbAt(g, 0.5)).toEqual(colour("#800080"));
  });

  it("mixes alpha with the colour channels", () => {
    const faded: Gradient = {
      angle: 90,
      stops: [
        { color: colour("#FF0000FF"), position: 0 },
        { color: colour("#FF000000"), position: 1 },
      ],
    };
    expect(srgbAt(faded, 0.5).a).toBe(128);
    expect(srgbAt(faded, 1).a).toBe(0);
  });
});

describe("oklabAt", () => {
  it("matches the CSS Oklab midpoint", () => {
    const actual = oklabAt(gradient("oklab"), 0.5);
    expect(Pixels.rgbaNear(actual, colour("#8C53A2"), 1)).toBe(true);
  });

  it("differs from the sRGB midpoint by a wide margin", () => {
    const g = gradient("oklab");
    expect(channelDistance(oklabAt(g, 0.5), srgbAt(g, 0.5))).toBeGreaterThan(
      30,
    );
  });

  it("keeps the measured endpoints", () => {
    const g = gradient("oklab");
    expect(Pixels.rgbaNear(oklabAt(g, 0), BLUE, 1)).toBe(true);
    expect(Pixels.rgbaNear(oklabAt(g, 1), RED, 1)).toBe(true);
  });

  it("mixes identical stops to themselves", () => {
    const g: Gradient = {
      angle: 90,
      colorSpace: "oklab",
      stops: [
        { color: colour("#3BC97F"), position: 0 },
        { color: colour("#3BC97F"), position: 1 },
      ],
    };
    expect(Pixels.rgbaNear(oklabAt(g, 0.5), colour("#3BC97F"), 1)).toBe(true);
  });
});

describe("colourAt", () => {
  it("dispatches on the declared colour space", () => {
    const g = gradient("oklab");
    expect(colourAt(g, 0.5)).toEqual(oklabAt(g, 0.5));
    expect(colourAt(g, 0.5)).not.toEqual(srgbAt(g, 0.5));
  });

  it("defaults to sRGB when the field is absent", () => {
    expect(colourAt(gradient(), 0.5)).toEqual(colour("#800080"));
  });
});

describe("sample helpers", () => {
  it("states a colour band as the largest channel delta", () => {
    expect(channelDistance(colour("#000000"), colour("#010203"))).toBe(3);
    expect(channelDistance(colour("#000000"), colour("#000000"))).toBe(0);
    expect(channelDistance(colour("#000000FF"), colour("#00000000"))).toBe(255);
  });

  it("maps a fraction across the box on either axis", () => {
    const box = { x: 10, y: 20, width: 160, height: 80 };
    expect(pointAt(box, 0.5, "x")).toEqual({ x: 90, y: 60 });
    expect(pointAt(box, 0.25, "y")).toEqual({ x: 90, y: 40 });
    expect(pointAt(box, 0, "x")).toEqual({ x: 10, y: 60 });
    expect(pointAt(box, 1, "y")).toEqual({ x: 90, y: 100 });
  });
});
