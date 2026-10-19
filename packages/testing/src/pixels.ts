/**
 * Pixel evidence: decode the PNG the runtime wrote for a captured frame and
 * read exact colours out of it.
 *
 * The package stays free of Node and GPUix imports: the inflate step is
 * injected by the caller (`apps/playground` passes `node:zlib`'s
 * `inflateSync`), so this module is pure and its own tests need no binding.
 *
 * Scope is deliberately narrow: GPUI writes 8-bit, non-interlaced PNGs in
 * colour types 0/2/4/6. Anything else is a typed `PngDecodeError`, never a
 * guess. Anti-aliased edges and gradients are out of scope; a scenario samples
 * the centre of a solid box.
 */
import { Effect, Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

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
}) {
  /** The byte offset of `(x, y)`, or `None` outside the frame. */
  offsetOf = (x: number, y: number): Option.Option<number> =>
    x < 0 || y < 0 || x >= this.width || y >= this.height
      ? Option.none()
      : Option.some((y * this.width + x) * 4);
}

/** Why a byte array is not a frame this module can read. */
export class PngDecodeError extends Schema.TaggedError<PngDecodeError>()(
  "PngDecodeError",
  {
    reason: Schema.String,
  },
) {
  get message(): string {
    return `PNG decode failed: ${this.reason}`;
  }
}

const decodeError = (reason: string) => new PngDecodeError({ reason });

/** A window's paintable size; the same shape `Smoke.WindowSize` carries. */
export interface FrameSize {
  readonly width: number;
  readonly height: number;
}

const channelsOf = (colourType: number): Option.Option<number> =>
  Match.value(colourType).pipe(
    Match.when(0, () => Option.some(1)),
    Match.when(2, () => Option.some(3)),
    Match.when(4, () => Option.some(2)),
    Match.when(6, () => Option.some(4)),
    Match.orElse(() => Option.none()),
  );

interface Header {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
}

const readUint32 = (bytes: Uint8Array, at: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    at,
    false,
  );

const readHeader = (bytes: Uint8Array): Effect.Effect<Header, PngDecodeError> =>
  Effect.gen(function* () {
    if (bytes.byteLength < 33) {
      return yield* Effect.fail(
        decodeError("shorter than a signature and IHDR"),
      );
    }
    const signature = PNG_SIGNATURE.every(
      (byte, index) => bytes[index] === byte,
    );
    if (!signature) {
      return yield* Effect.fail(decodeError("not a PNG signature"));
    }
    const length = readUint32(bytes, 8);
    const type = String.fromCharCode(...bytes.subarray(12, 16));
    if (type !== "IHDR" || length !== 13) {
      return yield* Effect.fail(decodeError(`expected IHDR, found ${type}`));
    }
    const width = readUint32(bytes, 16);
    const height = readUint32(bytes, 20);
    const bitDepth = bytes[24] ?? -1;
    const colourType = bytes[25] ?? -1;
    const interlace = bytes[28] ?? -1;
    if (width === 0 || height === 0) {
      return yield* Effect.fail(decodeError(`empty frame ${width}x${height}`));
    }
    if (bitDepth !== 8) {
      return yield* Effect.fail(
        decodeError(`bit depth ${bitDepth}, only 8 is supported`),
      );
    }
    if (interlace !== 0) {
      return yield* Effect.fail(
        decodeError(`interlace ${interlace}, only 0 is supported`),
      );
    }
    return yield* Option.match(channelsOf(colourType), {
      onNone: () =>
        Effect.fail(
          decodeError(`colour type ${colourType}, only 0/2/4/6 are supported`),
        ),
      onSome: (channels) =>
        Effect.succeed({ width, height, channels } satisfies Header),
    });
  });

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

const readIdat = (
  bytes: Uint8Array,
): Effect.Effect<Uint8Array, PngDecodeError> => {
  const walk = (
    at: number,
    chunks: ReadonlyArray<Uint8Array>,
  ): Effect.Effect<Uint8Array, PngDecodeError> => {
    if (at + 12 > bytes.byteLength) {
      return Effect.fail(decodeError("no complete IDAT/IEND pair"));
    }
    const length = readUint32(bytes, at);
    const end = at + 12 + length;
    if (end > bytes.byteLength) {
      return Effect.fail(decodeError(`truncated chunk at ${at}`));
    }
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const next =
      type === "IDAT"
        ? [...chunks, bytes.subarray(at + 8, at + 8 + length)]
        : chunks;
    if (type === "IEND") {
      return next.length === 0
        ? Effect.fail(decodeError("no IDAT before IEND"))
        : Effect.succeed(concat(next));
    }
    return walk(end, next);
  };
  return walk(8, []);
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

const predict = (
  filter: number,
  left: number,
  up: number,
  upLeft: number,
): number =>
  Match.value(filter).pipe(
    Match.when(0, () => 0),
    Match.when(1, () => left),
    Match.when(2, () => up),
    Match.when(3, () => Math.floor((left + up) / 2)),
    Match.when(4, () => paeth(left, up, upLeft)),
    Match.orElse(() => -1),
  );

/**
 * Undo the PNG row filters.
 *
 * An indexed `for` loop is deliberate here: this is a byte transform over a
 * multi-megabyte frame, and an `Arr` fold would allocate a wrapper per byte.
 */
const unfilter = (
  raw: Uint8Array,
  header: Header,
): Effect.Effect<Uint8Array, PngDecodeError> => {
  const stride = header.width * header.channels;
  const expected = (stride + 1) * header.height;
  if (raw.byteLength !== expected) {
    return Effect.fail(
      decodeError(
        `inflated ${raw.byteLength} bytes, expected ${expected} for ${header.width}x${header.height}`,
      ),
    );
  }
  const out = new Uint8Array(stride * header.height);
  for (let row = 0; row < header.height; row += 1) {
    const filter = raw[row * (stride + 1)] ?? -1;
    const source = raw.subarray(
      row * (stride + 1) + 1,
      (row + 1) * (stride + 1),
    );
    const targetStart = row * stride;
    const previousStart = (row - 1) * stride;
    for (let column = 0; column < stride; column += 1) {
      const left =
        column >= header.channels
          ? (out[targetStart + column - header.channels] ?? 0)
          : 0;
      const up = row === 0 ? 0 : (out[previousStart + column] ?? 0);
      const upLeft =
        row === 0 || column < header.channels
          ? 0
          : (out[previousStart + column - header.channels] ?? 0);
      const predictor = predict(filter, left, up, upLeft);
      if (predictor < 0) {
        return Effect.fail(decodeError(`filter type ${filter} is not defined`));
      }
      out[targetStart + column] = ((source[column] ?? 0) + predictor) & 0xff;
    }
  }
  return Effect.succeed(out);
};

const toRgba = (raw: Uint8Array, header: Header): Uint8Array => {
  if (header.channels === 4) {
    return raw;
  }
  const pixels = header.width * header.height;
  const out = new Uint8Array(pixels * 4);
  for (let index = 0; index < pixels; index += 1) {
    const source = index * header.channels;
    const target = index * 4;
    if (header.channels === 3) {
      out[target] = raw[source] ?? 0;
      out[target + 1] = raw[source + 1] ?? 0;
      out[target + 2] = raw[source + 2] ?? 0;
      out[target + 3] = 255;
    } else if (header.channels === 2) {
      out[target] = raw[source] ?? 0;
      out[target + 1] = raw[source] ?? 0;
      out[target + 2] = raw[source] ?? 0;
      out[target + 3] = raw[source + 1] ?? 0;
    } else {
      out[target] = raw[source] ?? 0;
      out[target + 1] = raw[source] ?? 0;
      out[target + 2] = raw[source] ?? 0;
      out[target + 3] = 255;
    }
  }
  return out;
};

/**
 * Decode an 8-bit, non-interlaced PNG into row-major RGBA.
 *
 * `inflate` is the caller's zlib (`node:zlib`'s `inflateSync` in the
 * playground), so this module has no platform dependency. Unsupported input
 * fails with a `PngDecodeError` naming the field that failed.
 */
export const decodePng = (
  bytes: Uint8Array,
  inflate: (compressed: Uint8Array) => Uint8Array,
): Effect.Effect<Pixels, PngDecodeError> =>
  Effect.gen(function* () {
    const header = yield* readHeader(bytes);
    const compressed = yield* readIdat(bytes);
    const raw = yield* Effect.try({
      try: () => inflate(compressed),
      catch: (cause) =>
        decodeError(`inflate rejected the IDAT stream (${String(cause)})`),
    });
    const filtered = yield* unfilter(raw, header);
    return new Pixels({
      width: header.width,
      height: header.height,
      data: toRgba(filtered, header),
    });
  });

/** The colour at `(x, y)`, or `None` outside the frame. */
export const pixelAt = (
  pixels: Pixels,
  x: number,
  y: number,
): Option.Option<Rgba> =>
  Option.map(
    pixels.offsetOf(x, y),
    (offset) =>
      new Rgba({
        r: pixels.data[offset] ?? 0,
        g: pixels.data[offset + 1] ?? 0,
        b: pixels.data[offset + 2] ?? 0,
        a: pixels.data[offset + 3] ?? 0,
      }),
  );

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Parse a theme colour (`#RGB`, `#RRGGBB` or `#RRGGBBAA`) into straight RGBA.
 *
 * An unparseable string is `None`; the caller decides whether that is a
 * failure. `#RGB` expands each nibble, the CSS rule.
 */
export const hexToRgba = (hex: string): Option.Option<Rgba> =>
  Option.flatMap(Option.fromNullishOr(HEX.exec(hex)), (match) => {
    const digits = match[1] ?? "";
    const expanded =
      digits.length === 3
        ? digits
            .split("")
            .map((digit) => `${digit}${digit}`)
            .join("")
        : digits;
    const channel = (index: number) =>
      Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16);
    return Option.some(
      new Rgba({
        r: channel(0),
        g: channel(1),
        b: channel(2),
        a: expanded.length === 8 ? channel(3) : 255,
      }),
    );
  });

/** Whether every channel of `actual` is within `tolerance` of `expected`. */
export const rgbaNear = (
  actual: Rgba,
  expected: Rgba,
  tolerance: number,
): boolean =>
  Math.abs(actual.r - expected.r) <= tolerance &&
  Math.abs(actual.g - expected.g) <= tolerance &&
  Math.abs(actual.b - expected.b) <= tolerance &&
  Math.abs(actual.a - expected.a) <= tolerance;

/**
 * The device scale of a captured frame: `Some(2)` when a 1280 × 800 window is a
 * 2560 × 1600 PNG.
 *
 * `None` when the two axes disagree or the ratio is not an integer — a frame
 * that does not match the window must fail by name, never sample a nearby
 * pixel.
 */
export const frameScale = (
  pixels: Pixels,
  window: FrameSize,
): Option.Option<number> => {
  if (window.width <= 0 || window.height <= 0) {
    return Option.none();
  }
  const horizontal = pixels.width / window.width;
  const vertical = pixels.height / window.height;
  const scale = Math.round(horizontal);
  return scale >= 1 &&
    Math.abs(horizontal - scale) <= 1e-6 &&
    Math.abs(vertical - scale) <= 1e-6
    ? Option.some(scale)
    : Option.none();
};

/** A window point as an exact frame pixel, or `None` outside the frame. */
export const framePoint = (
  pixels: Pixels,
  window: FrameSize,
  x: number,
  y: number,
): Option.Option<{ readonly x: number; readonly y: number }> =>
  Option.flatMap(frameScale(pixels, window), (scale) => {
    const point = { x: Math.round(x * scale), y: Math.round(y * scale) };
    return Option.map(pixels.offsetOf(point.x, point.y), () => point);
  });
