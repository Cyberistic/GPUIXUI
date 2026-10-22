/**
 * Pixel evidence: decode the PNG a live capture wrote and read exact colours.
 *
 * A real window reports no style, so paint is only provable from the frame the
 * runtime produced. The module stays platform-free: the caller injects
 * `inflate`, so its own tests need no binding and no native window.
 *
 * Scope is deliberate: GPUI writes 8-bit, non-interlaced PNGs in colour types
 * 0/2/4/6. Any other encoding is a typed `PngDecodeError`, never a guess.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";

/** One straight (non-premultiplied) 8-bit RGBA colour. */
export class Rgba extends Schema.Class<Rgba>("Rgba")({
  r: Schema.Int,
  g: Schema.Int,
  b: Schema.Int,
  a: Schema.Int,
}) {}

/** A decoded frame: row-major RGBA bytes, `width * height * 4` long. */
export class Pixels extends Schema.Class<Pixels>("Pixels")({
  width: Schema.Int,
  height: Schema.Int,
  data: Schema.Uint8Array,
}) {}

/** Why a byte array is not a frame this module can read. */
export class PngDecodeError extends Schema.TaggedError<PngDecodeError>()(
  "PngDecodeError",
  { reason: Schema.String },
) {
  get message(): string {
    return `PNG decode failed: ${this.reason}`;
  }
}

/** The signature every PNG starts with. */
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

const fail = (reason: string) => new PngDecodeError({ reason });

const channelsOf = (colourType: number): number | null =>
  Match.value(colourType).pipe(
    Match.when(0, () => 1),
    Match.when(2, () => 3),
    Match.when(4, () => 2),
    Match.when(6, () => 4),
    Match.orElse(() => null),
  );

const uint32 = (bytes: Uint8Array, at: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    at,
    false,
  );

interface Header {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
}

const headerOf = (data: Uint8Array): Header | PngDecodeError => {
  const width = uint32(data, 16);
  const height = uint32(data, 20);
  const byte = (at: number): number => data[at] ?? 0;
  if (uint32(data, 8) !== 13 || width === 0 || height === 0) {
    return fail("the IHDR chunk is malformed");
  }
  if (byte(24) !== 8) return fail("only 8-bit channels are supported");
  // IHDR fields: width, height, bit depth, colour type, compression, filter, interlace.
  if (byte(26) !== 0 || byte(27) !== 0 || byte(28) !== 0) {
    return fail("interlaced or non-standard PNGs are not supported");
  }
  const channels = channelsOf(byte(25));
  return channels === null
    ? fail(`colour type ${byte(25)} is not supported`)
    : { width, height, channels };
};

/** Concatenates every IDAT payload, ignoring ancillary chunks. */
const idatOf = (data: Uint8Array): Uint8Array | PngDecodeError => {
  const parts: Array<Uint8Array> = [];
  let at = 8;
  while (at + 8 <= data.length) {
    const length = uint32(data, at);
    const type = String.fromCharCode(...data.subarray(at + 4, at + 8));
    if (type === "IEND") break;
    const start = at + 8;
    const end = start + length;
    if (end > data.length) return fail("a chunk runs past the end of the data");
    if (type === "IDAT") parts.push(data.subarray(start, end));
    at = end + 4;
  }
  return Match.value(parts.length).pipe(
    Match.when(0, () => fail("the PNG has no IDAT chunk")),
    Match.orElse(() => {
      const total = parts.reduce((sum, part) => sum + part.length, 0);
      const joined = new Uint8Array(total);
      let offset = 0;
      for (const part of parts) {
        joined.set(part, offset);
        offset += part.length;
      }
      return joined;
    }),
  );
};

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

/**
 * The five scanline filters, in the spec's numbering.
 *
 * The filter is one byte per row, so it is resolved **once per row**: a
 * per-byte dispatch over a 1800×1040 capture costs seconds (measured: 4.2s for
 * one frame), and a decode sits in every pixel check of the live suite.
 */
const filters: ReadonlyArray<
  (value: number, left: number, up: number, upLeft: number) => number
> = [
  (value) => value,
  (value, left) => value + left,
  (value, _left, up) => value + up,
  (value, left, up) => value + Math.floor((left + up) / 2),
  (value, left, up, upLeft) => value + paeth(left, up, upLeft),
];

/**
 * Reverses the per-scanline filters (PNG spec §9.2).
 *
 * `prior` is the already-unfiltered previous row; filter 0 needs neither.
 */
const unfilter = (
  raw: Uint8Array,
  header: Header,
  inflate: (bytes: Uint8Array) => Uint8Array,
): Uint8Array | PngDecodeError => {
  const stride = header.width * header.channels;
  const inflated = inflate(raw);
  if (inflated.length < header.height * (stride + 1)) {
    return fail("the inflated data is shorter than the image");
  }
  const out = new Uint8Array(header.height * stride);
  const byte = (bytes: Uint8Array, at: number): number => bytes[at] ?? 0;
  let previousStart = 0;
  for (let row = 0; row < header.height; row += 1) {
    const filter = byte(inflated, row * (stride + 1));
    const decode = filters[filter];
    if (decode === undefined) {
      return fail(`scanline filter ${filter} is unknown`);
    }
    const lineStart = row * (stride + 1) + 1;
    const outStart = row * stride;
    for (let column = 0; column < stride; column += 1) {
      const left =
        column >= header.channels
          ? byte(out, outStart + column - header.channels)
          : 0;
      const up = row === 0 ? 0 : byte(out, previousStart + column);
      const upLeft =
        row === 0 || column < header.channels
          ? 0
          : byte(out, previousStart + column - header.channels);
      out[outStart + column] =
        decode(byte(inflated, lineStart + column), left, up, upLeft) & 0xff;
    }
    previousStart = outStart;
  }
  return out;
};

/** Expands 1/2/3-channel rows into RGBA. */
const toRgba = (rows: Uint8Array, header: Header): Pixels => {
  const data = new Uint8Array(header.width * header.height * 4);
  const byte = (at: number): number => rows[at] ?? 0;
  for (let index = 0; index < header.width * header.height; index += 1) {
    const source = index * header.channels;
    const target = index * 4;
    const grey = byte(source);
    const alpha =
      header.channels === 4
        ? byte(source + 3)
        : header.channels === 2
          ? byte(source + 1)
          : 255;
    data[target] = header.channels <= 2 ? grey : byte(source);
    data[target + 1] = header.channels <= 2 ? grey : byte(source + 1);
    data[target + 2] = header.channels <= 2 ? grey : byte(source + 2);
    data[target + 3] = alpha;
  }
  return new Pixels({ width: header.width, height: header.height, data });
};

/** Decodes an 8-bit, non-interlaced PNG into RGBA bytes. */
export const decodePng = (
  bytes: Uint8Array,
  inflate: (bytes: Uint8Array) => Uint8Array,
): PngDecodeError | Pixels => {
  const signature = SIGNATURE.every((byte, at) => bytes[at] === byte);
  if (bytes.length < 33 || !signature) {
    return fail("not a PNG");
  }
  const header = headerOf(bytes);
  if (header instanceof PngDecodeError) return header;
  const idat = idatOf(bytes);
  if (idat instanceof PngDecodeError) return idat;
  const rows = unfilter(idat, header, inflate);
  return rows instanceof PngDecodeError ? rows : toRgba(rows, header);
};

/** Why a frame cannot be written as a PNG. */
export class PngEncodeError extends Schema.TaggedError<PngEncodeError>()(
  "PngEncodeError",
  { reason: Schema.String },
) {
  get message(): string {
    return `PNG encode failed: ${this.reason}`;
  }
}

const CRC_TABLE: ReadonlyArray<number> = Arr.map(
  Arr.range(0, 255),
  (n) =>
    (Arr.reduce(
      Arr.range(1, 8),
      n,
      (crc) => ((crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1) >>> 0,
    ) ^
      0) >>>
    0,
);

const crc32 = (bytes: Uint8Array): number =>
  (Arr.reduce(
    Arr.fromIterable(bytes),
    0xffffffff,
    (crc, byte) => (crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0),
  ) ^
    0xffffffff) >>>
  0;

const writeUint32 = (target: Uint8Array, at: number, value: number): void => {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint32(
    at,
    value >>> 0,
    false,
  );
};

const pngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  writeUint32(out, 8 + data.length, crc32(crcInput));
  return out;
};

/**
 * Encodes a frame as an 8-bit RGBA PNG, one `None` filter per row.
 *
 * The terminal renderer hands a frame over as raw RGBA in the kitty graphics
 * protocol, so this is how a terminal capture becomes a file a reader can look
 * at — and how a probe that reads raw frames can still leave the same PNG
 * evidence a window capture does. `deflate` is injected, like `inflate` above,
 * so the encoder is platform-free.
 */
export const encodePng = (
  frame: Pixels,
  deflate: (bytes: Uint8Array) => Uint8Array,
): PngEncodeError | Uint8Array => {
  if (frame.data.length !== frame.width * frame.height * 4) {
    return new PngEncodeError({
      reason: `frame carries ${frame.data.length} bytes, expected ${frame.width * frame.height * 4} for ${frame.width}x${frame.height} RGBA`,
    });
  }
  const header = new Uint8Array(13);
  writeUint32(header, 0, frame.width);
  writeUint32(header, 4, frame.height);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = frame.width * 4;
  const rows = new Uint8Array((stride + 1) * frame.height);
  for (let row = 0; row < frame.height; row += 1) {
    const target = row * (stride + 1);
    rows[target] = 0;
    rows.set(frame.data.subarray(row * stride, (row + 1) * stride), target + 1);
  }
  const parts = [
    Uint8Array.from(SIGNATURE),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflate(rows)),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(
    Arr.reduce(parts, 0, (total, part) => total + part.length),
  );
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/** The colour at a pixel, or `null` outside the frame. */
export const pixelAt = (frame: Pixels, x: number, y: number): Rgba | null => {
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return null;
  const at = (y * frame.width + x) * 4;
  return new Rgba({
    r: frame.data[at] ?? 0,
    g: frame.data[at + 1] ?? 0,
    b: frame.data[at + 2] ?? 0,
    a: frame.data[at + 3] ?? 0,
  });
};

/** A hex colour (`#RGB`, `#RRGGBB` or `#RRGGBBAA`), or `null` when malformed. */
export const hexToRgba = (hex: string): Rgba | null => {
  const digits = hex.startsWith("#") ? hex.slice(1) : hex;
  const expanded = Match.value(digits.length).pipe(
    Match.when(
      3,
      () =>
        `${digits
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")}ff`,
    ),
    Match.when(6, () => `${digits}ff`),
    Match.when(8, () => digits),
    Match.orElse(() => ""),
  );
  if (expanded.length !== 8) return null;
  const value = Number.parseInt(expanded, 16);
  return Number.isNaN(value)
    ? null
    : new Rgba({
        r: (value >>> 24) & 0xff,
        g: (value >>> 16) & 0xff,
        b: (value >>> 8) & 0xff,
        a: value & 0xff,
      });
};

/**
 * How many pixels paint `colour` exactly.
 *
 * A count, not a coordinate: a capture is device-scaled, and the caller should
 * not have to know the scale factor to prove that a colour reached the frame.
 */
export const countColour = (frame: Pixels, colour: Rgba): number => {
  let count = 0;
  for (let at = 0; at < frame.data.length; at += 4) {
    if (
      frame.data[at] === colour.r &&
      frame.data[at + 1] === colour.g &&
      frame.data[at + 2] === colour.b &&
      frame.data[at + 3] === colour.a
    ) {
      count += 1;
    }
  }
  return count;
};

/**
 * The rectangle `colour` paints, or `null` when it paints nothing.
 *
 * The bound of a paint, not a count: a probe asserting that a run was laid out
 * in the middle of its frame reads the ink's box rather than guessing where a
 * pixel might fall.
 */
export const boundsOfColour = (
  frame: Pixels,
  colour: Rgba,
): PixelRegion | null => {
  let left = frame.width;
  let top = frame.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const at = (y * frame.width + x) * 4;
      if (
        frame.data[at] === colour.r &&
        frame.data[at + 1] === colour.g &&
        frame.data[at + 2] === colour.b &&
        frame.data[at + 3] === colour.a
      ) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0 || bottom < 0
    ? null
    : new PixelRegion({
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      });
};

/** A rectangle in a capture's own pixels (device-scaled, not logical). */
export class PixelRegion extends Schema.Class<PixelRegion>("PixelRegion")({
  x: Schema.Int,
  y: Schema.Int,
  width: Schema.Int,
  height: Schema.Int,
}) {}

/**
 * The part of `frame` a region covers, as a frame of its own.
 *
 * The region is clamped to the frame, because a capture's edge can cut a box
 * the layout reports. A region with no overlap at all is `null`: there is no
 * paint there to compare.
 */
export const crop = (frame: Pixels, region: PixelRegion): Pixels | null => {
  const left = Math.max(region.x, 0);
  const top = Math.max(region.y, 0);
  const right = Math.min(region.x + region.width, frame.width);
  const bottom = Math.min(region.y + region.height, frame.height);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const source = ((top + row) * frame.width + left) * 4;
    data.set(frame.data.subarray(source, source + width * 4), row * width * 4);
  }
  return new Pixels({ width, height, data });
};

/**
 * How many pixels differ between two captures of the same box.
 *
 * `null` when the frames are not the same size: two boxes of different shapes
 * are not a measurement of "nothing changed", and reporting `0` would let a
 * resized layer pass as an invisible one. A difference is any differing byte,
 * alpha included — a wash that changes only opacity is paint too.
 */
export const countDifferingPixels = (
  left: Pixels,
  right: Pixels,
): number | null => {
  if (left.width !== right.width || left.height !== right.height) return null;
  let count = 0;
  for (let at = 0; at < left.data.length; at += 4) {
    if (
      left.data[at] !== right.data[at] ||
      left.data[at + 1] !== right.data[at + 1] ||
      left.data[at + 2] !== right.data[at + 2] ||
      left.data[at + 3] !== right.data[at + 3]
    ) {
      count += 1;
    }
  }
  return count;
};
