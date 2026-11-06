import { crc32, deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "@effect/vitest";
import {
  PngDecodeError,
  PngEncodeError,
  PixelRegion,
  Pixels,
  boundsOfColour,
  countColour,
  countDifferingPixels,
  crop,
  decodePng,
  encodePng,
  hexToRgba,
  pixelAt,
  Rgba,
} from "./pixels.js";

const inflate = (bytes: Uint8Array): Uint8Array => inflateSync(bytes);
const deflate = (bytes: Uint8Array): Uint8Array => deflateSync(bytes);

const uint32 = (value: number): Uint8Array => {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, false);
  return out;
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  out.set(uint32(data.length), 0);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  out.set(uint32(crc32(crcInput)), 8 + data.length);
  return out;
};

const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

const png = (
  width: number,
  height: number,
  colourType: number,
  rows: ReadonlyArray<Uint8Array>,
): Uint8Array => {
  const header = concat([
    uint32(width),
    uint32(height),
    new Uint8Array([8, colourType, 0, 0, 0]),
  ]);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(concat(rows))),
    chunk("IEND", new Uint8Array()),
  ]);
};

const decode = (bytes: Uint8Array) => {
  const frame = decodePng(bytes, inflate);
  if (frame instanceof PngDecodeError) throw new Error(frame.message);
  return frame;
};

const red = new Rgba({ r: 255, g: 0, b: 0, a: 255 });
const blue = new Rgba({ r: 0, g: 0, b: 255, a: 255 });

describe("decodePng", () => {
  it("decodes RGBA rows with the None filter", () => {
    const frame = decode(
      png(2, 1, 6, [new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255])]),
    );
    expect(frame.width).toBe(2);
    expect(frame.height).toBe(1);
    expect(pixelAt(frame, 0, 0)).toEqual(red);
    expect(pixelAt(frame, 1, 0)).toEqual(blue);
  });

  it("applies the Sub filter per channel, not per pixel", () => {
    const frame = decode(
      png(2, 1, 6, [new Uint8Array([1, 255, 0, 0, 255, 1, 0, 255, 0])]),
    );
    expect(pixelAt(frame, 1, 0)).toEqual(blue);
  });

  it("expands RGB rows to RGBA with an opaque alpha", () => {
    const frame = decode(png(1, 1, 2, [new Uint8Array([0, 10, 20, 30])]));
    expect(pixelAt(frame, 0, 0)).toEqual(
      new Rgba({ r: 10, g: 20, b: 30, a: 255 }),
    );
  });

  const twoRows = (filter: number, row: ReadonlyArray<number>) =>
    png(2, 2, 6, [
      new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255]),
      new Uint8Array([filter, ...row]),
    ]);
  const secondRow = new Rgba({ r: 10, g: 20, b: 30, a: 255 });
  const secondPixel = new Rgba({ r: 40, g: 50, b: 60, a: 255 });

  it("applies the Up filter against the decoded row above", () => {
    const frame = decode(twoRows(2, [1, 255, 0, 0, 255, 255, 1, 0]));
    expect(pixelAt(frame, 0, 1)).toEqual(
      new Rgba({ r: 0, g: 255, b: 0, a: 255 }),
    );
    expect(pixelAt(frame, 1, 1)).toEqual(
      new Rgba({ r: 255, g: 255, b: 0, a: 255 }),
    );
  });

  it("applies the Average filter against the left and above neighbours", () => {
    const frame = decode(twoRows(3, [139, 20, 30, 128, 35, 40, 174, 0]));
    expect(pixelAt(frame, 0, 1)).toEqual(secondRow);
    expect(pixelAt(frame, 1, 1)).toEqual(secondPixel);
  });

  it("applies the Paeth filter against its predicted neighbour", () => {
    const frame = decode(twoRows(4, [11, 20, 30, 0, 40, 30, 61, 0]));
    expect(pixelAt(frame, 0, 1)).toEqual(secondRow);
    expect(pixelAt(frame, 1, 1)).toEqual(secondPixel);
  });

  it("refuses a filter byte the specification does not define", () => {
    const decoded = decodePng(twoRows(5, [0, 0, 0, 0, 0, 0, 0, 0]), inflate);
    expect(decoded).toBeInstanceOf(PngDecodeError);
  });

  it("refuses a byte array that is not a PNG", () => {
    const decoded = decodePng(new Uint8Array(40), inflate);
    expect(decoded).toBeInstanceOf(PngDecodeError);
  });

  it("refuses 16-bit channels instead of guessing", () => {
    const header = concat([
      uint32(1),
      uint32(1),
      new Uint8Array([16, 6, 0, 0, 0]),
    ]);
    const decoded = decodePng(
      concat([
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(new Uint8Array([0, 0, 0, 0, 0, 0, 0]))),
        chunk("IEND", new Uint8Array()),
      ]),
      inflate,
    );
    expect(decoded).toBeInstanceOf(PngDecodeError);
  });
});

describe("countColour", () => {
  it("counts exact matches and nothing else", () => {
    const frame = decode(
      png(2, 2, 6, [
        new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255]),
        new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 128]),
      ]),
    );
    expect(countColour(frame, red)).toBe(2);

    expect(countColour(frame, blue)).toBe(1);
  });
});

const coloursRow = new Uint8Array([
  0, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 255, 255, 255, 255, 255,
]);

const colourFrame = () => decode(png(4, 2, 6, [coloursRow, coloursRow]));

const at = (x: number, y: number, width: number, height: number) =>
  new PixelRegion({ x, y, width, height });

describe("crop", () => {
  it("cuts the rectangle a comparison names, row for row", () => {
    const cut = crop(colourFrame(), at(1, 0, 2, 1));
    expect(cut?.width).toBe(2);
    expect(cut?.height).toBe(1);
    expect(cut === null ? null : pixelAt(cut, 0, 0)).toEqual(blue);
    expect(cut === null ? null : pixelAt(cut, 1, 0)).toEqual(
      new Rgba({ r: 0, g: 255, b: 0, a: 255 }),
    );
  });

  it("clamps a region the capture's edge cuts", () => {
    const cut = crop(colourFrame(), at(3, 1, 4, 4));
    expect(cut?.width).toBe(1);
    expect(cut?.height).toBe(1);
    expect(cut === null ? null : pixelAt(cut, 0, 0)).toEqual(
      new Rgba({ r: 255, g: 255, b: 255, a: 255 }),
    );
  });

  it("has no frame to compare when the region is off the capture", () => {
    expect(crop(colourFrame(), at(4, 0, 2, 2))).toBeNull();
    expect(crop(colourFrame(), at(-2, -2, 2, 2))).toBeNull();
  });
});

describe("countDifferingPixels", () => {
  it("reports no change for one frame read twice", () => {
    expect(countDifferingPixels(colourFrame(), colourFrame())).toBe(0);
  });

  it("counts a difference in one channel, alpha included", () => {
    const faded = decode(
      png(2, 1, 6, [new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 254])]),
    );
    const opaque = decode(
      png(2, 1, 6, [new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255])]),
    );

    expect(countDifferingPixels(faded, opaque)).toBe(1);
  });

  it("compares two regions of one capture through a crop", () => {
    const frame = colourFrame();
    const left = crop(frame, at(0, 0, 2, 1));
    const right = crop(frame, at(2, 0, 2, 1));
    expect(
      left === null || right === null
        ? null
        : countDifferingPixels(left, right),
    ).toBe(2);
  });

  it("refuses two captures of different shapes", () => {
    const wide = decode(
      png(2, 1, 6, [new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255])]),
    );
    const tall = decode(
      png(1, 2, 6, [
        new Uint8Array([0, 255, 0, 0, 255]),
        new Uint8Array([0, 255, 0, 0, 255]),
      ]),
    );
    expect(countDifferingPixels(wide, tall)).toBeNull();
  });
});

describe("hexToRgba", () => {
  it("accepts the three hex forms a theme uses", () => {
    expect(hexToRgba("#f00")).toEqual(red);
    expect(hexToRgba("#ff0000")).toEqual(red);
    expect(hexToRgba("ff000080")).toEqual(
      new Rgba({ r: 255, g: 0, b: 0, a: 128 }),
    );
  });

  it("refuses a malformed value instead of decoding nonsense", () => {
    expect(hexToRgba("#ff00")).toBeNull();
    expect(hexToRgba("#gggggg")).toBeNull();
    expect(hexToRgba("#12zz56")).toBeNull();
    expect(hexToRgba("ff0000 8")).toBeNull();
  });
});

describe("encodePng", () => {
  it("round-trips a frame through the decoder", () => {
    const frame = colourFrame();
    const bytes = encodePng(frame, deflate);
    expect(bytes).not.toBeInstanceOf(PngEncodeError);
    if (bytes instanceof PngEncodeError) return;
    const decoded = decode(bytes);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(2);
    expect(pixelAt(decoded, 0, 0)).toEqual(red);
    expect(pixelAt(decoded, 3, 1)).toEqual(
      new Rgba({ r: 255, g: 255, b: 255, a: 255 }),
    );
  });

  it("refuses a frame whose bytes do not fill its size", () => {
    const bytes = encodePng(
      new Pixels({
        width: 2,
        height: 2,
        data: new Uint8Array(4),
      }),
      deflate,
    );
    expect(bytes).toBeInstanceOf(PngEncodeError);
  });
});

describe("boundsOfColour", () => {
  it("reports the box a colour paints", () => {
    const bounds = boundsOfColour(colourFrame(), red);
    expect(bounds).toEqual(
      new PixelRegion({ x: 0, y: 0, width: 1, height: 2 }),
    );
  });

  it("has no box for a colour the frame does not carry", () => {
    expect(
      boundsOfColour(colourFrame(), new Rgba({ r: 1, g: 2, b: 3, a: 255 })),
    ).toBeNull();
  });
});
