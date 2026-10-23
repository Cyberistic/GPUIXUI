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
  cropGuides,
  cropLabel,
  cropKey,
  gestureCrop,
  CROP_HANDLE_SIZE,
  CropRect,
  handleBox,
  keyboardCrop,
  keyboardMove,
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

  it("reads a field it cannot lay out as the origin and the floor", () => {
    expect(
      boxes(
        clampCrop(
          new CropRect({
            x: Number.NaN,
            y: Number.NaN,
            width: Number.NaN,
            height: Number.NaN,
          }),
          bounds,
        ),
      ),
    ).toStrictEqual({ x: 0, y: 0, width: 24, height: 24 });
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

describe("cropGuides", () => {
  it("divides the hole into thirds, inside its bounds", () => {
    const guides = cropGuides(opening);
    expect(guides.map((guide) => guide.name)).toStrictEqual([
      "v1",
      "v2",
      "h1",
      "h2",
    ]);
    const at = (index: number): CropRect => {
      const guide = guides[index];
      if (guide === undefined) {
        throw new Error(`no guide at ${index}`);
      }
      return guide.box;
    };
    const [v1, v2, h1, h2] = [at(0), at(1), at(2), at(3)];
    expect(v1.x).toBeCloseTo(opening.x + opening.width / 3, 6);
    expect(v2.x).toBeCloseTo(opening.x + (opening.width * 2) / 3, 6);
    expect(h1.y).toBeCloseTo(opening.y + opening.height / 3, 6);
    expect(h2.y).toBeCloseTo(opening.y + (opening.height * 2) / 3, 6);
    expect([v1.y, v2.y]).toStrictEqual([opening.y, opening.y]);
    expect([v1.height, v2.height]).toStrictEqual([
      opening.height,
      opening.height,
    ]);
    expect([h1.x, h2.x]).toStrictEqual([opening.x, opening.x]);
    expect([h1.width, h2.width]).toStrictEqual([opening.width, opening.width]);
    expect([v1.width, v2.width, h1.height, h2.height]).toStrictEqual([
      1, 1, 1, 1,
    ]);
  });

  it("keeps every guide inside the hole it divides", () => {
    const wide = new CropRect({ x: 10, y: 20, width: 300, height: 30 });
    expect(
      cropGuides(wide).every(
        (guide) =>
          guide.box.x >= wide.x &&
          guide.box.y >= wide.y &&
          guide.box.right <= wide.right &&
          guide.box.bottom <= wide.bottom,
      ),
    ).toBe(true);
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

  it("reads an unreadable handle side as the default box", () => {
    expect(boxes(handleBox(opening, "se", Number.NaN))).toStrictEqual(
      boxes(handleBox(opening, "se", CROP_HANDLE_SIZE)),
    );
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

  it("reads an unreadable minimum as the default side", () => {
    expect(
      boxes(resizeCrop(opening, "se", -900, -900, bounds, Number.NaN)),
    ).toStrictEqual({
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

describe("aspect ratio", () => {
  const frame = { width: 400, height: 400 };
  const square = new CropRect({ x: 100, y: 100, width: 100, height: 100 });

  it("shapes a stored rectangle to the ratio, keeping its width", () => {
    expect(
      boxes(
        clampCrop(
          new CropRect({ x: 60, y: 40, width: 100, height: 100 }),
          bounds,
          24,
          2,
        ),
      ),
    ).toStrictEqual({ x: 60, y: 40, width: 100, height: 50 });
  });

  it("lets a height-first drag resize a locked square", () => {
    expect(boxes(resizeCrop(square, "se", 0, 50, frame, 24, 1))).toStrictEqual({
      x: 100,
      y: 100,
      width: 150,
      height: 150,
    });
  });

  it("keeps the corner opposite the drag", () => {
    expect(
      boxes(resizeCrop(square, "nw", -50, 0, frame, 24, 1)),
    ).toStrictEqual({ x: 50, y: 50, width: 150, height: 150 });
  });

  it("keeps the ratio through a live gesture", () => {
    expect(
      boxes(
        gestureCrop(
          { kind: "corner", corner: "se", start: square, x: 200, y: 200 },
          { x: 250, y: 200 },
          frame,
          24,
          1,
        ),
      ),
    ).toStrictEqual({ x: 100, y: 100, width: 150, height: 150 });
  });

  it("keeps the ratio on the keyboard path", () => {
    expect(
      Option.map(
        keyboardCrop(square, "se", "down", 10, frame, 24, 1),
        boxes,
      ),
    ).toStrictEqual(
      Option.some({ x: 100, y: 100, width: 110, height: 110 }),
    );
  });

  it("leaves the hole free when the frame cannot hold the minimum at the ratio", () => {
    const small = new CropRect({ x: 10, y: 10, width: 20, height: 12 });
    const tight = { width: 40, height: 30 };
    expect(boxes(clampCrop(small, tight, 24, 100))).toStrictEqual(
      boxes(clampCrop(small, tight)),
    );
  });

  it("reads an unreadable ratio as a free crop", () => {
    const free = boxes(clampCrop(opening, bounds));
    expect(
      [Number.NaN, 0, -2, Number.POSITIVE_INFINITY].map((ratio) =>
        boxes(clampCrop(opening, bounds, 24, ratio)),
      ),
    ).toStrictEqual([free, free, free, free]);
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

describe("keyboardMove", () => {
  it("moves the hole one step per arrow, keeping its size", () => {
    expect(
      Option.map(keyboardMove(opening, "right", 1, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 61, y: 40, width: 100, height: 70 }));
    expect(
      Option.map(keyboardMove(opening, "down", 8, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 60, y: 48, width: 100, height: 70 }));
  });

  it("stops the hole at the frame's edges", () => {
    const atEdge = new CropRect({ x: 0, y: 90, width: 100, height: 70 });
    expect(
      Option.map(keyboardMove(atEdge, "left", 1, bounds), boxes),
    ).toStrictEqual(Option.some(boxes(atEdge)));
    expect(
      Option.map(keyboardMove(atEdge, "down", 1, bounds), boxes),
    ).toStrictEqual(Option.some(boxes(atEdge)));
  });

  it("ignores a key that is not an arrow", () => {
    expect(Option.isNone(keyboardMove(opening, "enter", 1, bounds))).toBe(true);
  });
});

describe("cropKey", () => {
  it("resizes the named corner, by 8 with Shift", () => {
    expect(
      Option.map(cropKey(opening, "se", "right", {}, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 60, y: 40, width: 101, height: 70 }));
    expect(
      Option.map(
        cropKey(opening, "se", "right", { shift: true }, bounds),
        boxes,
      ),
    ).toStrictEqual(Option.some({ x: 60, y: 40, width: 108, height: 70 }));
  });

  it("moves the whole hole with Alt, by 8 with Shift", () => {
    expect(
      Option.map(cropKey(opening, "se", "right", { alt: true }, bounds), boxes),
    ).toStrictEqual(Option.some({ x: 61, y: 40, width: 100, height: 70 }));
    expect(
      Option.map(
        cropKey(opening, "se", "down", { alt: true, shift: true }, bounds),
        boxes,
      ),
    ).toStrictEqual(Option.some({ x: 60, y: 48, width: 100, height: 70 }));
  });

  it("ignores a key that is not an arrow, with or without Alt", () => {
    expect(Option.isNone(cropKey(opening, "se", "enter", {}, bounds))).toBe(
      true,
    );
    expect(
      Option.isNone(cropKey(opening, "se", "enter", { alt: true }, bounds)),
    ).toBe(true);
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
