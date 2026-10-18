import { describe, expect, it } from "vitest";
import {
  describeCrop,
  describeRect,
  initialCrop,
  maskRects,
  moveCrop,
  paints,
  resizeCrop,
} from "./crop-model.js";

const STAGE = { width: 320, height: 200 } as const;
const MIN = 16;
const REST = { x: 64, y: 40, width: 192, height: 120 } as const;

describe("initialCrop", () => {
  it("centres 60 % of the 320 × 200 stage at exact integers", () => {
    expect(initialCrop(STAGE)).toEqual(REST);
  });

  it("stays inside a square stage", () => {
    expect(initialCrop({ width: 300, height: 300 })).toEqual({
      x: 60,
      y: 60,
      width: 180,
      height: 180,
    });
  });
});

describe("moveCrop", () => {
  it("moves both axes without resizing", () => {
    expect(moveCrop(REST, STAGE, 10, -6)).toEqual({
      x: 74,
      y: 34,
      width: 192,
      height: 120,
    });
  });

  it("clamps at the stage's top-left", () => {
    expect(moveCrop(REST, STAGE, -400, -400)).toEqual({
      x: 0,
      y: 0,
      width: 192,
      height: 120,
    });
  });

  it("clamps at the stage's bottom-right", () => {
    expect(moveCrop(REST, STAGE, 400, 400)).toEqual({
      x: 128,
      y: 80,
      width: 192,
      height: 120,
    });
  });

  it("does not mutate its input", () => {
    const input = { ...REST };
    moveCrop(input, STAGE, 10, 10);
    expect(input).toEqual(REST);
  });
});

describe("resizeCrop", () => {
  it("grows from the SE corner and keeps NW fixed", () => {
    expect(resizeCrop(REST, STAGE, "se", 40, 20, MIN)).toEqual({
      x: 64,
      y: 40,
      width: 232,
      height: 140,
    });
  });

  it("moves only the NW origin from the north-west corner", () => {
    expect(resizeCrop(REST, STAGE, "nw", 20, 10, MIN)).toEqual({
      x: 84,
      y: 50,
      width: 172,
      height: 110,
    });
  });

  it("moves the right edge from the north-east corner", () => {
    expect(resizeCrop(REST, STAGE, "ne", 20, -10, MIN)).toEqual({
      x: 64,
      y: 30,
      width: 212,
      height: 130,
    });
  });

  it("moves the left edge from the south-west corner", () => {
    expect(resizeCrop(REST, STAGE, "sw", -20, 10, MIN)).toEqual({
      x: 44,
      y: 40,
      width: 212,
      height: 130,
    });
  });

  it("clamps the SE corner to the stage", () => {
    expect(resizeCrop(REST, STAGE, "se", 400, 400, MIN)).toEqual({
      x: 64,
      y: 40,
      width: 256,
      height: 160,
    });
  });

  it("clamps the NW corner to the stage's origin", () => {
    expect(resizeCrop(REST, STAGE, "nw", -400, -400, MIN)).toEqual({
      x: 0,
      y: 0,
      width: 256,
      height: 160,
    });
  });

  it("stops at the minimum size from SE", () => {
    expect(resizeCrop(REST, STAGE, "se", -400, -400, MIN)).toEqual({
      x: 64,
      y: 40,
      width: MIN,
      height: MIN,
    });
  });

  it("stops at the minimum size from NW", () => {
    expect(resizeCrop(REST, STAGE, "nw", 400, 400, MIN)).toEqual({
      x: 240,
      y: 144,
      width: MIN,
      height: MIN,
    });
  });
});

describe("maskRects", () => {
  it("covers the four regions outside the crop", () => {
    expect(maskRects(REST, STAGE)).toEqual({
      top: { x: 0, y: 0, width: 320, height: 40 },
      left: { x: 0, y: 40, width: 64, height: 120 },
      right: { x: 256, y: 40, width: 64, height: 120 },
      bottom: { x: 0, y: 160, width: 320, height: 40 },
    });
  });

  it("complements a crop that touches the stage edges", () => {
    const full = { x: 0, y: 0, width: 320, height: 200 };
    const masks = maskRects(full, STAGE);
    expect([
      masks.top.height,
      masks.left.width,
      masks.right.width,
      masks.bottom.height,
    ]).toEqual([0, 0, 0, 0]);
    expect(paints(masks.top)).toBe(false);
  });

  it("gives the top band the crop's y and the bottom band the rest", () => {
    const masks = maskRects({ x: 0, y: 24, width: 192, height: 120 }, STAGE);
    expect(masks.top.height).toBe(24);
    expect(masks.bottom.y).toBe(144);
    expect(masks.bottom.height).toBe(56);
    expect(masks.left.width).toBe(0);
    expect(masks.right.x).toBe(192);
    expect(masks.right.width).toBe(128);
  });
});

describe("paints", () => {
  it("paints a positive rect in both dimensions", () => {
    expect(paints({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
  });

  it("skips a rect with a zero dimension", () => {
    expect(paints({ x: 0, y: 0, width: 0, height: 10 })).toBe(false);
    expect(paints({ x: 0, y: 0, width: 10, height: 0 })).toBe(false);
  });
});

describe("describe", () => {
  it("prints the rect as key=value fields", () => {
    expect(describeRect(REST)).toBe("x=64 y=40 w=192 h=120");
  });

  it("prints the fit, the mask mode and both counters", () => {
    expect(
      describeCrop(REST, "contain", "none", { image: 2, blocked: 1 }),
    ).toBe("x=64 y=40 w=192 h=120 fit=contain mask=none image=2 blocked=1");
  });
});
