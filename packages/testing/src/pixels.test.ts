/**
 * The pixel decoder's own rules.
 *
 * The bug this file catches: a live capture is the only evidence of what colour
 * the runtime painted, so a decoder that mishandled a PNG filter, a colour type
 * or the alpha channel would turn a wrong frame into a passing check. Every
 * fixture is hand-encoded from the PNG specification, not from the decoder.
 */
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "@effect/vitest";
import {
  PngDecodeError,
  countColour,
  decodePng,
  hexToRgba,
  pixelAt,
  Rgba,
} from "./pixels.js";

const inflate = (bytes: Uint8Array): Uint8Array => inflateSync(bytes);

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

/** A PNG with one filter byte per row, encoded exactly as the spec says. */
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
      png(2, 1, 6, [
        new Uint8Array([0, 255, 0, 0, 255, 0, 0, 255, 255]),
      ]),
    );
    expect(frame.width).toBe(2);
    expect(frame.height).toBe(1);
    expect(pixelAt(frame, 0, 0)).toEqual(red);
    expect(pixelAt(frame, 1, 0)).toEqual(blue);
  });

  it("applies the Sub filter per channel, not per pixel", () => {
    // Row 1 encodes blue relative to the previous pixel's red: 0-255, 0, 255+1.
    const frame = decode(
      png(2, 1, 6, [
        new Uint8Array([1, 255, 0, 0, 255, 1, 0, 255, 0]),
      ]),
    );
    expect(pixelAt(frame, 1, 0)).toEqual(blue);
  });

  it("expands RGB rows to RGBA with an opaque alpha", () => {
    const frame = decode(png(1, 1, 2, [new Uint8Array([0, 10, 20, 30])]));
    expect(pixelAt(frame, 0, 0)).toEqual(
      new Rgba({ r: 10, g: 20, b: 30, a: 255 }),
    );
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
    // The second blue is translucent, so an exact-alpha match sees one.
    expect(countColour(frame, blue)).toBe(1);
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
  });
});
