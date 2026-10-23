/**
 * The crop area's arithmetic — the bounds, the mask, the drag and the keyboard.
 *
 * The bug guarded: a crop restored from storage, or a drag past the picture's
 * edge, must never paint a hole outside the frame or narrower than the handle
 * that grabs it. Every edge keeps the frame's bound and the minimum side, and
 * the four bars are the hole's complement, so a mask that overlaps the hole or
 * leaves a strip of the picture bare fails here.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  clampCrop,
  cornerLabel,
  cropBars,
  cropLabel,
  gestureCrop,
  CropRect,
  handleBox,
  keyboardCrop,
  moveCrop,
  resizeCrop,
} from "./logic.js";

const bounds = { width: 240, height: 160 };
const opening = new CropRect({ x: 60, y: 40, width: 100, height: 70 });
const boxes = (rect: CropRect) => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
});

describe("clampCrop", () => {
  it("pulls a restored crop inside the frame and up to the minimum", () => {
    expect(
      boxes(
        clampCrop(
          new CropRect({ x: -40, y: 200, width: 900, height: 4 }),
          bounds,
        ),
      ),
    ).toStrictEqual({ x: 0, y: 136, width: 240, height: 24 });
  });

  it("takes the floor a frame smaller than the minimum can offer", () => {
    expect(
      boxes(
        clampCrop(new CropRect({ x: 4, y: 4, width: 10, height: 10 }), {
          width: 20,
          height: 18,
        }),
      ),
    ).toStrictEqual({ x: 2, y: 0, width: 18, height: 18 });
  });
});

describe("cropBars", () => {
  it("covers the whole frame but the hole", () => {
    const bars = cropBars(opening, bounds);
    expect(bars.map((bar) => [bar.side, boxes(bar.box)])).toStrictEqual([
      ["top", { x: 0, y: 0, width: 240, height: 40 }],
      ["right", { x: 160, y: 40, width: 80, height: 70 }],
      ["bottom", { x: 0, y: 110, width: 240, height: 50 }],
      ["left", { x: 0, y: 40, width: 60, height: 70 }],
    ]);
    const area = bars.reduce(
      (total, bar) => total + bar.box.width * bar.box.height,
      0,
    );
    expect(area).toBe(240 * 160 - 100 * 70);
  });

  it("drops a bar the hole leaves no room for", () => {
    const bars = cropBars(
      new CropRect({ x: 0, y: 0, width: 240, height: 160 }),
      bounds,
    );
    expect(bars).toStrictEqual([]);
  });
});

describe("handleBox", () => {
  it("centres each handle on its corner", () => {
    expect(boxes(handleBox(opening, "nw", 10))).toStrictEqual({
      x: 55,
      y: 35,
      width: 10,
      height: 10,
    });
    expect(boxes(handleBox(opening, "se", 10))).toStrictEqual({
      x: 155,
      y: 105,
      width: 10,
      height: 10,
    });
    expect(boxes(handleBox(opening, "ne", 10))).toStrictEqual({
      x: 155,
      y: 35,
      width: 10,
      height: 10,
    });
    expect(boxes(handleBox(opening, "sw", 10))).toStrictEqual({
      x: 55,
      y: 105,
      width: 10,
      height: 10,
    });
  });
});

describe("resizeCrop", () => {
  it("grows from the bottom-right corner inside the frame", () => {
    expect(boxes(resizeCrop(opening, "se", 40, 30, bounds))).toStrictEqual({
      x: 60,
      y: 40,
      width: 140,
      height: 100,
    });
  });

  it("stops at the picture's edges", () => {
    expect(boxes(resizeCrop(opening, "se", 900, 900, bounds))).toStrictEqual({
      x: 60,
      y: 40,
      width: 180,
      height: 120,
    });
  });

  it("stops at the minimum side", () => {
    expect(boxes(resizeCrop(opening, "se", -900, -900, bounds))).toStrictEqual({
      x: 60,
      y: 40,
      width: 24,
      height: 24,
    });
  });

  it("moves only the corner that was dragged", () => {
    expect(boxes(resizeCrop(opening, "nw", 20, 10, bounds))).toStrictEqual({
      x: 80,
      y: 50,
      width: 80,
      height: 60,
    });
    expect(boxes(resizeCrop(opening, "nw", -900, -900, bounds))).toStrictEqual({
      x: 0,
      y: 0,
      width: 160,
      height: 110,
    });
  });

  it("reads an unreadable delta as no movement", () => {
    expect(
      boxes(
        resizeCrop(opening, "se", Number.NaN, Number.POSITIVE_INFINITY, bounds),
      ),
    ).toStrictEqual(boxes(opening));
  });
});

describe("moveCrop", () => {
  it("translates the hole and keeps its size", () => {
    expect(boxes(moveCrop(opening, 30, -20, bounds))).toStrictEqual({
      x: 90,
      y: 20,
      width: 100,
      height: 70,
    });
  });

  it("stops the hole at the frame's edges", () => {
    expect(boxes(moveCrop(opening, -900, 900, bounds))).toStrictEqual({
      x: 0,
      y: 90,
      width: 100,
      height: 70,
    });
  });
});

describe("keyboardCrop", () => {
  it("resizes the named corner by one step per arrow", () => {
    expect(
      Option.map(keyboardCrop(opening, "se", "right", 1, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 60, y: 40, width: 101, height: 70 }));
    expect(
      Option.map(keyboardCrop(opening, "nw", "up", 1, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 60, y: 39, width: 100, height: 71 }));
  });

  it("reads a negative step as its magnitude", () => {
    expect(
      Option.map(keyboardCrop(opening, "se", "down", -8, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 60, y: 40, width: 100, height: 78 }));
  });

  it("ignores a key that is not an arrow", () => {
    expect(Option.isNone(keyboardCrop(opening, "se", "enter", 1, bounds))).toBe(
      true,
    );
  });
});

describe("labels", () => {
  it("announces the rectangle and the corner", () => {
    expect(cropLabel(opening)).toBe("60, 40, 100 × 70");
    expect(cornerLabel("nw")).toBe("top left");
    expect(cornerLabel("se")).toBe("bottom right");
  });
});

describe("gestureCrop", () => {
  it("moves the hole when the picture was pressed", () => {
    expect(
      boxes(
        gestureCrop(
          { kind: "move", start: opening, x: 100, y: 60 },
          { x: 130, y: 40 },
          bounds,
        ),
      ),
    ).toStrictEqual({ x: 90, y: 20, width: 100, height: 70 });
  });

  it("resizes from the pressed corner", () => {
    expect(
      boxes(
        gestureCrop(
          { kind: "corner", corner: "se", start: opening, x: 160, y: 110 },
          { x: 200, y: 140 },
          bounds,
        ),
      ),
    ).toStrictEqual({ x: 60, y: 40, width: 140, height: 100 });
  });
});
