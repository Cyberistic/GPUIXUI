/**
 * Frame sampling: the shared half of every pixel scenario.
 *
 * A colour claim is only evidence when it is read from the PNG the runtime
 * painted. Both `pixel-colour` and `live-theme` capture a frame, map an
 * element's painted centre through the frame's device scale, and compare
 * channels with one tolerance. Keeping that chain here means a new pixel check
 * cannot invent its own scale rule, forget the temp file, or compare raw
 * coordinates that half the frame disagrees with.
 *
 * The two hosts differ only in how they are read: the offscreen renderer
 * returns plain values (lifted with `Effect.sync`), while the live automation
 * host answers Effects that may fail. `FrameReader` is that one difference.
 *
 * `node:fs`/`node:path`/`node:os` are deliberate boundary imports: a smoke
 * scenario's `steps` carries no `R`, and this code runs only inside the Node
 * runners. An `Effect` `FileSystem` layer would add a requirement no scenario
 * type can satisfy.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";

/** Per-channel slack for a decoded PNG; not a licence for a wrong token. */
export const TOLERANCE = 2;

/** `#RRGGBBAA`, the shape a failing check reports. */
export const asHex = (colour: Pixels.Rgba): string =>
  `#${[colour.r, colour.g, colour.b, colour.a]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

/** A theme colour as RGBA, or a labelled failure naming the unparseable value. */
export const parseColour = (
  label: string,
  hex: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Option.match(Pixels.hexToRgba(hex), {
    onNone: () =>
      Effect.fail(
        new Smoke.SmokeAssertionError({
          label,
          expected: "a #RGB, #RRGGBB or #RRGGBBAA colour",
          actual: `unparseable ${hex}`,
        }),
      ),
    onSome: Effect.succeed,
  });

/**
 * A frame sample in logical window coordinates, or `None` outside the frame.
 *
 * The lookup lives here so every pure expectation module shares one device-scale
 * rule; recording a check per sample stays the caller's decision.
 */
export const frameSampler =
  (frame: Pixels.Pixels, window: Smoke.WindowSize) =>
  (x: number, y: number): Option.Option<Pixels.Rgba> =>
    Option.flatMap(Pixels.framePoint(frame, window, x, y), (point) =>
      Pixels.pixelAt(frame, point.x, point.y),
    );

/** The two host reads a sample needs, as Effects. */
export interface FrameReader<E> {
  readonly bounds: (testId: string) => Effect.Effect<Smoke.Bounds | null, E>;
  readonly windowSize: () => Effect.Effect<Smoke.WindowSize, E>;
}

/** Read an offscreen host, whose inspection verbs are plain values. */
export const readSync = (host: Smoke.SmokeHost): FrameReader<never> => ({
  bounds: (testId) => Effect.sync(() => host.bounds(testId)),
  windowSize: () => Effect.sync(host.windowSize),
});

/** Read a live host, whose inspection verbs are Effects. */
export const readAsync = (
  host: Smoke.AsyncSmokeHost,
): FrameReader<Smoke.SmokeHostError> => ({
  bounds: host.bounds,
  windowSize: host.windowSize,
});

/**
 * A painted box, or a labelled failure naming the missing element.
 *
 * A retained-but-unpainted node reports no bounds; every pixel scenario treats
 * that as "the fixture did not mount", never as a coordinate to sample.
 */
export const paintedBox = <E>(
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  reader: FrameReader<E>,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const bounds = yield* reader.bounds(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(bounds),
    );
  });

const decodeFrame = (
  bytes: Uint8Array,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> =>
  Pixels.decodePng(bytes, inflateSync).pipe(
    Effect.mapError(
      (error) =>
        new Smoke.SmokeAssertionError({
          label: "the captured frame decodes",
          expected: "an 8-bit non-interlaced PNG",
          actual: error.message,
        }),
    ),
  );

const readFrame = (
  path: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> =>
  Effect.try({
    try: () => new Uint8Array(readFileSync(path)),
    catch: (cause) =>
      new Smoke.SmokeAssertionError({
        label: "the captured frame is readable",
        expected: `bytes at ${path}`,
        actual: String(cause),
      }),
  }).pipe(Effect.flatMap(decodeFrame));

const removeFile = (path: string) =>
  Effect.ignore(Effect.try(() => unlinkSync(path)));

const tempPath = (): string => join(tmpdir(), `gpuixui-${randomUUID()}.png`);

/** Capture the offscreen renderer's last frame (one forced paint first). */
export const captureHeadless = (
  host: Smoke.SmokeHost,
  path?: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> => {
  const target = path ?? tempPath();
  return Effect.gen(function* () {
    yield* Effect.sync(() => host.paint());
    yield* Effect.try({
      try: () => host.screenshot(target),
      catch: (cause) =>
        new Smoke.SmokeAssertionError({
          label: "the runtime writes a frame",
          expected: "a PNG at the capture path",
          actual: String(cause),
        }),
    });
    return yield* readFrame(target);
  }).pipe(
    Effect.ensuring(path === undefined ? removeFile(target) : Effect.void),
  );
};

/**
 * Capture a real window's frame through the automation `screenshot` verb.
 *
 * With `path`, the frame is kept as the run artifact; without it, a temp file
 * is decoded and removed, so a probe that only needs pixels leaves nothing
 * behind.
 */
export const captureLive = (
  host: Smoke.AsyncSmokeHost,
  path?: string,
): Effect.Effect<
  Pixels.Pixels,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> => {
  const target = path ?? tempPath();
  return Effect.gen(function* () {
    yield* host.screenshot(target);
    return yield* readFrame(target);
  }).pipe(
    Effect.ensuring(path === undefined ? removeFile(target) : Effect.void),
  );
};

/** The pixel at a logical window coordinate, mapped through the frame scale. */
export const pixelAtPoint = (
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  x: number,
  y: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const point = yield* ctx.expectSome(
      `${label} maps into the frame`,
      Pixels.framePoint(frame, window, x, y),
    );
    return yield* ctx.expectSome(
      `${label} has a pixel`,
      Pixels.pixelAt(frame, point.x, point.y),
    );
  });

/** The pixel at `testId`'s painted centre, mapped through the device scale. */
export const pixelAtId = <E>(
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  testId: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(yield* reader.bounds(testId)),
    );
    const window = yield* reader.windowSize();
    return yield* pixelAtPoint(
      ctx,
      frame,
      window,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      testId,
    );
  });

/**
 * The pixel at the top-centre of a highlight wash.
 *
 * A wash's rect starts at the run's top; plan `701` measured that the first
 * 5–6 px are glyph-free (the glyphs sit below the ascender line) and that the
 * top 1 px is the anti-aliased edge. `+2` is the first fully uniform row.
 */
export const pixelAtRect = <E>(
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  rect: Smoke.HighlightRect,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    return yield* pixelAtPoint(
      ctx,
      frame,
      window,
      rect.x + rect.width / 2,
      rect.y + 2,
      label,
    );
  });

/** Record one colour comparison through the scenario's check sink. */
export const expectColour = (
  ctx: Pick<Smoke.SmokeContext, "check">,
  label: string,
  actual: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.check(
    label,
    Pixels.rgbaNear(actual, expected, TOLERANCE)
      ? Effect.void
      : Effect.fail(
          new Smoke.SmokeAssertionError({
            label,
            expected: asHex(expected),
            actual: asHex(actual),
          }),
        ),
  );

/** Sample `testId`'s centre and compare it with `expected`. */
export const expectPixel = <E>(
  ctx: Pick<Smoke.SmokeContext, "check" | "expectSome">,
  label: string,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  testId: string,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.flatMap(pixelAtId(ctx, reader, frame, testId), (actual) =>
    expectColour(ctx, label, actual, expected),
  );

/** What a scan of one painted box found. */
export interface BoxScan {
  /** Device pixels inspected inside the box. */
  readonly sampled: number;
  /** Pixels within `tolerance` of the expected colour. */
  readonly near: number;
  /** The inspected pixel closest to the expected colour, for the failure text. */
  readonly closest: Pixels.Rgba;
}

const BLACK = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });

const channelDistance = (left: number, right: number): number =>
  Math.abs(left - right);

const distanceTo = (pixel: Pixels.Rgba, expected: Pixels.Rgba): number =>
  Math.max(
    channelDistance(pixel.r, expected.r),
    channelDistance(pixel.g, expected.g),
    channelDistance(pixel.b, expected.b),
    channelDistance(pixel.a, expected.a),
  );

/**
 * Scan the device pixels inside a painted box.
 *
 * The loops are indexed on purpose: this walks tens of thousands of pixels, and
 * an `Arr` fold would allocate a wrapper per pixel. A frame whose size does not
 * match the window returns `sampled: 0`, so a caller cannot pass by sampling
 * nothing.
 */
export const scanBox = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  expected: Pixels.Rgba,
  tolerance: number,
): BoxScan =>
  Option.match(Pixels.frameScale(frame, window), {
    onNone: () => ({ sampled: 0, near: 0, closest: BLACK }),
    onSome: (factor) => scanAtScale(frame, box, expected, tolerance, factor),
  });

const scanAtScale = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  expected: Pixels.Rgba,
  tolerance: number,
  factor: number,
): BoxScan => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  let sampled = 0;
  let near = 0;
  let closest = BLACK;
  let best = Number.POSITIVE_INFINITY;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= frame.width) {
        continue;
      }
      const offset = (y * frame.width + x) * 4;
      const pixel = new Pixels.Rgba({
        r: frame.data[offset] ?? 0,
        g: frame.data[offset + 1] ?? 0,
        b: frame.data[offset + 2] ?? 0,
        a: frame.data[offset + 3] ?? 0,
      });
      sampled += 1;
      if (Pixels.rgbaNear(pixel, expected, tolerance)) {
        near += 1;
      }
      const distance = distanceTo(pixel, expected);
      if (distance < best) {
        best = distance;
        closest = pixel;
      }
    }
  }
  return { sampled, near, closest };
};

/** Enough pixels of a colour to be evidence, not a stray anti-aliased edge. */
export const enoughNear = (scan: BoxScan, minimum: number): boolean =>
  scan.near >= minimum;
