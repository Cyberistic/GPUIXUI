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
 * host. Each sample reads the box's **bounds** and maps its centre through
 * `Pixels.framePoint`, so a wrong scale fails by sampling the wrong pixel
 * rather than being papered over with a hard-coded coordinate.
 *
 * Capture, decode, sampling and comparison live in `frames.ts` (plan `676`), so
 * `live-theme` proves the same rule for every palette without a second copy.
 */
import { Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  captureHeadless,
  captureLive,
  expectColour,
  expectPixel,
  pixelAtPoint,
  readAsync,
  readSync,
} from "./frames.js";

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

const expectedPrimary = (ctx: Pick<Smoke.SmokeContext, "expectSome">) =>
  ctx.expectSome(
    "the default theme's primary parses",
    Pixels.hexToRgba(palettes.dark.colors.primary),
  );

const expectedBackground = (
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    "the default theme's background parses",
    Pixels.hexToRgba(palettes.dark.colors.background),
  );

export const pixelColourScenario: PlaygroundScenario = {
  id: "pixel-colour",
  title: "Pixel evidence: the frame's colours",
  capability: "theme",
  view: pixelColourView,
  steps: (ctx) =>
    Effect.gen(function* () {
      const reader = readSync(ctx.host);
      const frame = yield* captureHeadless(ctx.host);
      const primary = yield* expectedPrimary(ctx);
      const background = yield* expectedBackground(ctx);
      yield* ctx.expectSome(
        "the frame's device scale is an integer",
        Pixels.frameScale(frame, ctx.host.windowSize()),
      );
      yield* expectPixel(
        ctx,
        "red paints red",
        reader,
        frame,
        "pixel-red",
        RED,
      );
      yield* expectPixel(
        ctx,
        "green paints green",
        reader,
        frame,
        "pixel-green",
        GREEN,
      );
      yield* expectPixel(
        ctx,
        "blue paints blue",
        reader,
        frame,
        "pixel-blue",
        BLUE,
      );
      yield* expectPixel(
        ctx,
        "the theme's primary paints",
        reader,
        frame,
        "pixel-primary",
        primary,
      );
      const canvas = yield* pixelAtPoint(
        ctx,
        frame,
        ctx.host.windowSize(),
        8,
        8,
        "the canvas background",
      );
      yield* expectColour(
        ctx,
        "the canvas background paints",
        canvas,
        background,
      );
    }),
};

/** The live half: the same boxes, sampled from a real window's frame. */
export const pixelColourLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-pixel-colour",
  title: "Live pixel evidence: a window's frame colours",
  capability: "theme",
  steps: (ctx) =>
    Effect.gen(function* () {
      const reader = readAsync(ctx.host);
      const frame = yield* captureLive(ctx.host);
      const primary = yield* expectedPrimary(ctx);
      const background = yield* expectedBackground(ctx);
      yield* ctx.expectSome(
        "the window frame's device scale is an integer",
        Pixels.frameScale(frame, yield* ctx.host.windowSize()),
      );
      yield* expectPixel(
        ctx,
        "red paints red in a window",
        reader,
        frame,
        "pixel-red",
        RED,
      );
      yield* expectPixel(
        ctx,
        "green paints green in a window",
        reader,
        frame,
        "pixel-green",
        GREEN,
      );
      yield* expectPixel(
        ctx,
        "blue paints blue in a window",
        reader,
        frame,
        "pixel-blue",
        BLUE,
      );
      yield* expectPixel(
        ctx,
        "the theme's primary paints in a window",
        reader,
        frame,
        "pixel-primary",
        primary,
      );
      const canvas = yield* pixelAtPoint(
        ctx,
        frame,
        yield* ctx.host.windowSize(),
        8,
        8,
        "the canvas background",
      );
      yield* expectColour(
        ctx,
        "the canvas background paints in a window",
        canvas,
        background,
      );
    }),
};
