import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  imageZoomFrame,
  imageZoomMaxScale,
  imageZoomScale,
  sameZoom,
  zoomFollow,
  zoomFrames,
  zoomGeometry,
  zoomRest,
  type ZoomBox,
  type ZoomGeometry,
} from "./logic.js";

const frame = { x: 40, y: 20, width: 200, height: 120 };

const geometry = (scale: number = imageZoomScale): ZoomGeometry =>
  zoomGeometry({
    width: Option.some(frame.width),
    height: Option.some(frame.height),
    scale: Option.some(scale),
  });

const at = (across: number, down: number): ZoomBox =>
  zoomFollow(geometry(), frame, {
    x: frame.x + frame.width * across,
    y: frame.y + frame.height * down,
  });

describe("the zoom's frame and magnification", () => {
  it("resolves the house frame and magnification when given nothing", () => {
    expect(
      zoomGeometry({
        width: Option.none(),
        height: Option.none(),
        scale: Option.none(),
      }),
    ).toEqual({
      frameWidth: imageZoomFrame.width,
      frameHeight: imageZoomFrame.height,
      scale: imageZoomScale,
    });
  });

  it("keeps a frame and scale it can paint", () => {
    expect(geometry(2)).toEqual({
      frameWidth: 200,
      frameHeight: 120,
      scale: 2,
    });
    expect(geometry(imageZoomMaxScale).scale).toBe(imageZoomMaxScale);
  });

  it("falls back for a frame below one pixel", () => {
    Arr.forEach(
      [0, -40, Number.NaN, Number.POSITIVE_INFINITY] as const,
      (size) => {
        expect(
          zoomGeometry({
            width: Option.some(size),
            height: Option.some(size),
            scale: Option.none(),
          }),
        ).toMatchObject({
          frameWidth: imageZoomFrame.width,
          frameHeight: imageZoomFrame.height,
        });
      },
    );
  });

  it("holds the magnification to one and the ceiling", () => {
    expect(geometry(0.4).scale).toBe(1);
    expect(geometry(9).scale).toBe(imageZoomMaxScale);
    expect(geometry(Number.NaN).scale).toBe(imageZoomScale);
    expect(geometry(-2).scale).toBe(1);
  });
});

describe("the box the picture paints", () => {
  it("covers the frame exactly at rest", () => {
    expect(zoomRest(geometry())).toEqual({
      left: 0,
      top: 0,
      width: 200,
      height: 120,
    });
  });

  it("keeps the pointed share of the frame under the pointer", () => {
    expect(at(0.5, 0.5)).toEqual({
      left: -60,
      top: -36,
      width: 320,
      height: 192,
    });
    expect(at(0.25, 0.75)).toEqual({
      left: -30,
      top: -54,
      width: 320,
      height: 192,
    });
  });

  it("pins an edge the pointer points at, never revealing the page", () => {
    expect(at(0, 0)).toEqual({ left: 0, top: 0, width: 320, height: 192 });
    expect(at(1, 1)).toEqual({
      left: -120,
      top: -72,
      width: 320,
      height: 192,
    });
  });

  it("clamps a point outside the frame to the nearest edge", () => {
    const beyond = zoomFollow(geometry(), frame, { x: -400, y: 900 });

    expect(beyond.left).toBe(0);
    expect(beyond.top).toBe(-72);
  });

  it("rounds to a tenth of a pixel, so a held pointer paints one value", () => {
    const odd = zoomGeometry({
      width: Option.some(201),
      height: Option.some(121),
      scale: Option.some(1.6),
    });
    const box = zoomFollow(
      odd,
      { x: 0, y: 0, width: 201, height: 121 },
      { x: 100.5, y: 60.5 },
    );

    expect(box).toEqual({
      left: -60.3,
      top: -36.3,
      width: 321.6,
      height: 193.6,
    });
  });

  it("has nowhere to pan when the magnification is one", () => {
    const still = zoomGeometry({
      width: Option.some(frame.width),
      height: Option.some(frame.height),
      scale: Option.some(1),
    });

    expect(
      zoomFollow(still, frame, { x: frame.x + 150, y: frame.y + 90 }),
    ).toEqual(zoomRest(still));
  });
});

describe("the motion target and comparisons", () => {
  it("paints the four fields the runtime tweens", () => {
    expect(zoomFrames(at(0.5, 0.5))).toEqual({
      left: -60,
      top: -36,
      width: 320,
      height: 192,
    });
  });

  it("compares every field of two boxes", () => {
    const box = at(0.5, 0.5);

    expect(sameZoom(box, at(0.5, 0.5))).toBe(true);
    Arr.forEach(
      [
        { ...box, left: box.left - 1 },
        { ...box, top: box.top - 1 },
        { ...box, width: box.width + 1 },
        { ...box, height: box.height + 1 },
      ],
      (different) => {
        expect(sameZoom(box, different)).toBe(false);
      },
    );
  });
});
