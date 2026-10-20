/**
 * The pixel decoder's own rules.
 *
 * The bug this file is written to catch: a native capture is the only evidence
 * of what colour the runtime actually painted, so a decoder that silently
 * mishandles a PNG filter, a colour type or the device scale would turn a wrong
 * frame into a passing check. Every fixture here is hand-encoded, so the
 * expected bytes come from the PNG specification, not from the decoder.
 */
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import {
  blendOver,
  decodePng,
  framePoint,
  frameScale,
  hexToRgba,
  pixelAt,
  Pixels,
  Rgba,
} from "./pixels.js";

/** The decoder takes its inflate, so the package itself stays platform-free. */
const inflate = (compressed: Uint8Array): Uint8Array => inflateSync(compressed);

const uint32 = (value: number): Uint8Array => {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
};

const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(
    parts.reduce((size, part) => size + part.byteLength, 0),
  );
  parts.reduce((at, part) => {
    out.set(part, at);
    return at + part.byteLength;
  }, 0);
  return out;
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const name = new TextEncoder().encode(type);
  return concat([
    uint32(data.length),
    name,
    data,
    uint32(crc32(concat([name, data]))),
  ]);
};

interface Row {
  readonly filter: number;
  readonly bytes: ReadonlyArray<number>;
}

const png = (
  width: number,
  height: number,
  colourType: number,
  rows: ReadonlyArray<Row>,
  options: { readonly bitDepth?: number; readonly interlace?: number } = {},
): Uint8Array =>
  concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk(
      "IHDR",
      concat([
        uint32(width),
        uint32(height),
        new Uint8Array([
          options.bitDepth ?? 8,
          colourType,
          0,
          0,
          options.interlace ?? 0,
        ]),
      ]),
    ),
    chunk(
      "IDAT",
      new Uint8Array(
        deflateSync(
          concat(rows.map((row) => new Uint8Array([row.filter, ...row.bytes]))),
        ),
      ),
    ),
    chunk("IEND", new Uint8Array()),
  ]);

const paeth = (left: number, up: number, upLeft: number): number => {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  return toLeft <= toUp && toLeft <= toUpLeft
    ? left
    : toUp <= toUpLeft
      ? up
      : upLeft;
};

/** Forward-filter one row exactly as a PNG encoder would. */
const encodeRow = (
  filter: number,
  source: ReadonlyArray<number>,
  previous: ReadonlyArray<number>,
  bytesPerPixel: number,
): ReadonlyArray<number> =>
  source.map((byte, index) => {
    const left =
      index >= bytesPerPixel ? (source[index - bytesPerPixel] ?? 0) : 0;
    const up = previous[index] ?? 0;
    const upLeft =
      index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;
    const predictor =
      filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : paeth(left, up, upLeft);
    return (byte - predictor) & 0xff;
  });

const rgba = (r: number, g: number, b: number, a: number) =>
  new Rgba({ r, g, b, a });

describe("decodePng", () => {
  it.effect("unfilters all five PNG filters to the authored bytes", () =>
    Effect.gen(function* () {
      // Two pixels per row: the second makes Sub/Paeth depend on the left
      // neighbour, and each row's filter depends on the row above.
      const source = [
        [10, 20, 30, 255, 40, 50, 60, 200],
        [11, 21, 31, 254, 41, 51, 61, 199],
        [12, 22, 32, 253, 42, 52, 62, 198],
        [13, 23, 33, 252, 43, 53, 63, 197],
        [14, 24, 34, 251, 44, 54, 64, 196],
      ];
      const rows = source.map((pixels, index) => ({
        filter: index,
        bytes: encodeRow(index, pixels, source[index - 1] ?? [], 4),
      }));
      const frame = yield* decodePng(png(2, 5, 6, rows), inflate);
      expect(frame.width).toBe(2);
      expect(frame.height).toBe(5);
      source.forEach((pixels, row) => {
        [0, 1].forEach((column) => {
          const offset = column * 4;
          expect(Option.getOrNull(pixelAt(frame, column, row))).toEqual(
            rgba(
              pixels[offset] ?? 0,
              pixels[offset + 1] ?? 0,
              pixels[offset + 2] ?? 0,
              pixels[offset + 3] ?? 0,
            ),
          );
        });
      });
    }),
  );

  it.effect("expands RGB to opaque RGBA", () =>
    Effect.gen(function* () {
      const frame = yield* decodePng(
        png(1, 1, 2, [{ filter: 0, bytes: [1, 2, 3] }]),
        inflate,
      );
      expect(Option.getOrNull(pixelAt(frame, 0, 0))).toEqual(
        rgba(1, 2, 3, 255),
      );
    }),
  );

  it.effect("rejects data that is not a PNG", () =>
    Effect.gen(function* () {
      const error = yield* decodePng(new Uint8Array(40), inflate).pipe(
        Effect.flip,
      );
      expect(error.reason).toContain("PNG signature");
    }),
  );

  it.effect("rejects a bit depth and an interlace mode it cannot read", () =>
    Effect.gen(function* () {
      const sixteenBit = yield* decodePng(
        png(1, 1, 6, [{ filter: 0, bytes: [1, 2, 3, 4, 5, 6, 7, 8] }], {
          bitDepth: 16,
        }),
        inflate,
      ).pipe(Effect.flip);
      const interlaced = yield* decodePng(
        png(1, 1, 6, [{ filter: 0, bytes: [1, 2, 3, 4] }], { interlace: 1 }),
        inflate,
      ).pipe(Effect.flip);
      expect(sixteenBit.reason).toContain("bit depth 16");
      expect(interlaced.reason).toContain("interlace 1");
    }),
  );
});

describe("pixel lookups", () => {
  it("returns None outside the frame", () => {
    const frame = new Pixels({ width: 2, height: 2, data: new Uint8Array(16) });
    expect(Option.isNone(pixelAt(frame, -1, 0))).toBe(true);
    expect(Option.isNone(pixelAt(frame, 2, 0))).toBe(true);
    expect(Option.isSome(pixelAt(frame, 1, 1))).toBe(true);
  });

  it("maps a window point at the frame's integer device scale", () => {
    const frame = new Pixels({
      width: 2560,
      height: 1600,
      data: new Uint8Array(4),
    });
    expect(
      Option.getOrNull(frameScale(frame, { width: 1280, height: 800 })),
    ).toBe(2);
    expect(
      Option.getOrNull(
        framePoint(frame, { width: 1280, height: 800 }, 100, 50),
      ),
    ).toEqual({ x: 200, y: 100 });
    const mismatched = new Pixels({
      width: 2561,
      height: 1600,
      data: new Uint8Array(4),
    });
    expect(
      Option.isNone(frameScale(mismatched, { width: 1280, height: 800 })),
    ).toBe(true);
  });

  it("parses the three theme colour forms and rejects anything else", () => {
    expect(Option.getOrNull(hexToRgba("#abc"))).toEqual(
      rgba(170, 187, 204, 255),
    );
    expect(Option.getOrNull(hexToRgba("#11223344"))).toEqual(
      rgba(17, 34, 51, 68),
    );
    expect(Option.isNone(hexToRgba("rgb(1,2,3)"))).toBe(true);
  });

  it("composites in straight sRGB, in the right direction", () => {
    const primary = rgba(167, 169, 255, 255);
    const card = rgba(25, 29, 37, 255);
    const blended = blendOver(primary, 0.18, card);
    expect([blended.r, blended.g, blended.b, blended.a]).toEqual([
      51, 54, 76, 255,
    ]);
    const reversed = blendOver(card, 0.18, primary);
    expect([reversed.r, reversed.g, reversed.b]).not.toEqual([
      blended.r,
      blended.g,
      blended.b,
    ]);
  });
});
