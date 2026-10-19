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
