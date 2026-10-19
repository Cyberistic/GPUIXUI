/**
 * `pixel-colour` / `live-pixel-colour`: the frame, not the style report.
 *
 * Every colour claim in this repo used to end at "screenshot evidence": the
 * authored `paintedStyle` is headless only, and the live tree carries no
 * `style`. This probe closes that gap by decoding the PNG the runtime writes
 * (`captureScreenshot` / the automation `screenshot` verb) and sampling the
 * centre of four solid boxes and the canvas background.
 *
 * The measurement (plan `674`): the three literal boxes and the theme's
 * `primary` come back within 2 per channel, at a device scale of 2 on this
 * host. The scenario reads each box's **bounds** and maps the centre through
 * `Pixels.framePoint`, so a wrong scale fails by sampling the wrong pixel
 * rather than being papered over with a hard-coded coordinate.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";

const TOLERANCE = 2;

const RED = new Pixels.Rgba({ r: 255, g: 0, b: 0, a: 255 });
const GREEN = new Pixels.Rgba({ r: 0, g: 255, b: 0, a: 255 });
const BLUE = new Pixels.Rgba({ r: 0, g: 0, b: 255, a: 255 });

/** A 560 × 240 stage: three literals, the theme's primary, and its background. */
const PixelColourProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="pixel-canvas"
      style={{
        position: "relative",
        width: 560,
        height: 240,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="pixel-red"
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 120,
          height: 80,
          backgroundColor: "#FF0000",
        }}
      />
      <div
        testId="pixel-green"
        style={{
          position: "absolute",
          left: 200,
          top: 40,
          width: 120,
          height: 80,
          backgroundColor: "#00FF00",
        }}
      />
      <div
        testId="pixel-blue"
        style={{
          position: "absolute",
          left: 360,
          top: 40,
          width: 120,
          height: 80,
          backgroundColor: "#0000FF",
        }}
      />
      <div
        testId="pixel-primary"
        style={{
          position: "absolute",
          left: 40,
          top: 140,
          width: 120,
          height: 80,
          backgroundColor: theme.colors.primary,
        }}
      />
    </div>
  );
};

/** The registry's view producer; the hook runs inside the probe component. */
export const pixelColourView = (): ReactNode => <PixelColourProbe />;

const hex = (colour: Pixels.Rgba): string =>
  `#${[colour.r, colour.g, colour.b, colour.a]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

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

const readFile = (
  path: string,
): Effect.Effect<Uint8Array, Smoke.SmokeAssertionError> =>
  Effect.try({
    try: () => new Uint8Array(readFileSync(path)),
    catch: (cause) =>
      new Smoke.SmokeAssertionError({
        label: "the captured frame is readable",
        expected: `bytes at ${path}`,
        actual: String(cause),
      }),
  });

const removeFile = (path: string) =>
  Effect.ignore(Effect.try(() => unlinkSync(path)));

const tempPath = (): string => join(tmpdir(), `gpuixui-${randomUUID()}.png`);

/** Capture the offscreen renderer's last frame. */
const capture = (
  host: Smoke.SmokeHost,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> => {
  const path = tempPath();
  return Effect.gen(function* () {
    yield* Effect.sync(() => host.paint());
    yield* Effect.try({
      try: () => host.screenshot(path),
      catch: (cause) =>
        new Smoke.SmokeAssertionError({
          label: "the runtime writes a frame",
          expected: "a PNG at the capture path",
          actual: String(cause),
        }),
    });
    return yield* readFile(path).pipe(Effect.flatMap(decodeFrame));
  }).pipe(Effect.ensuring(removeFile(path)));
};

/** Capture a real window's frame through the automation `screenshot` verb. */
const captureLive = (
  host: Smoke.AsyncSmokeHost,
): Effect.Effect<
  Pixels.Pixels,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> => {
  const path = tempPath();
  return Effect.gen(function* () {
    yield* host.screenshot(path);
    return yield* readFile(path).pipe(Effect.flatMap(decodeFrame));
  }).pipe(Effect.ensuring(removeFile(path)));
};

const pixelAtId = (
  ctx: Smoke.SmokeContext,
  frame: Pixels.Pixels,
  testId: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(ctx.host.bounds(testId)),
    );
    const point = yield* ctx.expectSome(
      `${testId} maps into the frame`,
      Pixels.framePoint(
        frame,
        ctx.host.windowSize(),
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      ),
    );
    return yield* ctx.expectSome(
      `${testId} has a pixel`,
      Pixels.pixelAt(frame, point.x, point.y),
    );
  });

const pixelAtPoint = (
  ctx: Smoke.SmokeContext,
  frame: Pixels.Pixels,
  x: number,
  y: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const point = yield* ctx.expectSome(
      `${label} maps into the frame`,
      Pixels.framePoint(frame, ctx.host.windowSize(), x, y),
    );
    return yield* ctx.expectSome(
      `${label} has a pixel`,
      Pixels.pixelAt(frame, point.x, point.y),
    );
  });

const expectColour = (
  ctx: Pick<Smoke.SmokeContext, "check">,
  label: string,
  actual: Pixels.Rgba,
  expected: Pixels.Rgba,
) =>
  ctx.check(
    label,
    Pixels.rgbaNear(actual, expected, TOLERANCE)
      ? Effect.void
      : Effect.fail(
          new Smoke.SmokeAssertionError({
            label,
            expected: hex(expected),
            actual: hex(actual),
          }),
        ),
  );

const expectedPrimary = (ctx: Pick<Smoke.SmokeContext, "expectSome">) =>
  ctx.expectSome(
    "the default theme's primary parses",
    Pixels.hexToRgba(palettes.dark.colors.primary),
  );

/** The assertions both hosts share, once a frame exists. */
const assertFrame = (
  ctx: Smoke.SmokeContext,
  frame: Pixels.Pixels,
  background: Pixels.Rgba,
) =>
  Effect.gen(function* () {
    const primary = yield* expectedPrimary(ctx);
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, ctx.host.windowSize()),
    );
    yield* expectColour(
      ctx,
      "red paints red",
      yield* pixelAtId(ctx, frame, "pixel-red"),
      RED,
    );
    yield* expectColour(
      ctx,
      "green paints green",
      yield* pixelAtId(ctx, frame, "pixel-green"),
      GREEN,
    );
    yield* expectColour(
      ctx,
      "blue paints blue",
      yield* pixelAtId(ctx, frame, "pixel-blue"),
      BLUE,
    );
    yield* expectColour(
      ctx,
      "the theme's primary paints",
      yield* pixelAtId(ctx, frame, "pixel-primary"),
      primary,
    );
    yield* expectColour(
      ctx,
      "the canvas background paints",
      yield* pixelAtPoint(ctx, frame, 8, 8, "the canvas background"),
      background,
    );
  });

const background = Option.getOrNull(
  Pixels.hexToRgba(palettes.dark.colors.background),
);

export const pixelColourScenario: PlaygroundScenario = {
  id: "pixel-colour",
  title: "Pixel evidence: the frame's colours",
  capability: "theme",
  view: pixelColourView,
  steps: (ctx) =>
    Effect.gen(function* () {
      const expectedBackground = yield* ctx.expectSome(
        "the default theme's background parses",
        Option.fromNullishOr(background),
      );
      const frame = yield* capture(ctx.host);
      yield* assertFrame(ctx, frame, expectedBackground);
    }),
};

/** The live half: the same boxes, sampled from a real window's frame. */
export const pixelColourLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-pixel-colour",
  title: "Live pixel evidence: a window's frame colours",
  capability: "theme",
  steps: (ctx) =>
    Effect.gen(function* () {
      const primary = yield* expectedPrimary(ctx);
      const expectedBackground = yield* ctx.expectSome(
        "the default theme's background parses",
        Option.fromNullishOr(background),
      );
      const frame = yield* captureLive(ctx.host);
      const window = yield* ctx.host.windowSize();
      yield* ctx.expectSome(
        "the window frame's device scale is an integer",
        Pixels.frameScale(frame, window),
      );
      const sample = (
        testId: string,
      ): Effect.Effect<
        Pixels.Rgba,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.gen(function* () {
          const bounds = yield* ctx.expectSome(
            `${testId} is painted`,
            Option.fromNullishOr(yield* ctx.host.bounds(testId)),
          );
          const point = yield* ctx.expectSome(
            `${testId} maps into the frame`,
            Pixels.framePoint(
              frame,
              yield* ctx.host.windowSize(),
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2,
            ),
          );
          return yield* ctx.expectSome(
            `${testId} has a pixel`,
            Pixels.pixelAt(frame, point.x, point.y),
          );
        });
      yield* expectColour(
        ctx,
        "red paints red in a window",
        yield* sample("pixel-red"),
        RED,
      );
      yield* expectColour(
        ctx,
        "green paints green in a window",
        yield* sample("pixel-green"),
        GREEN,
      );
      yield* expectColour(
        ctx,
        "blue paints blue in a window",
        yield* sample("pixel-blue"),
        BLUE,
      );
      yield* expectColour(
        ctx,
        "the theme's primary paints in a window",
        yield* sample("pixel-primary"),
        primary,
      );
      const backgroundPoint = yield* ctx.expectSome(
        "the canvas background maps into the frame",
        Pixels.framePoint(frame, yield* ctx.host.windowSize(), 8, 8),
      );
      yield* expectColour(
        ctx,
        "the canvas background paints in a window",
        yield* ctx.expectSome(
          "the canvas background has a pixel",
          Pixels.pixelAt(frame, backgroundPoint.x, backgroundPoint.y),
        ),
        expectedBackground,
      );
    }),
};
