/**
 * `border-pixels` / `live-border-pixels`: does the frame paint the chrome?
 *
 * `theme-type-and-shadow` reads `borderWidth`, `borderColor` and `borderRadius`
 * back from the runtime's **style report**. A runtime that accepts all three
 * and paints every box square and borderless would pass that check while every
 * card, input, popover and dialog in the library lost its chrome. This probe
 * decodes a captured frame instead: a 1 px and a 2 px border paint their bands
 * on all four edges, a rounded box stops its fill at the corner while a square
 * twin does not, and a child filling a rounded parent is **not** clipped to the
 * rounded shape — `overflow: "hidden"` clips to the square content box — so a
 * third fixture proves the working recipe: give the child its own radius.
 *
 * Sampling geometry is pure (`border-pixels.ts`, plan `745`); the shared
 * capture/scale/comparison chain is `frames.ts`.
 */
import { Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  beyondBorder,
  borderBand,
  centre,
  contentCorner,
  cornerClearance,
} from "./border-pixels.js";
import {
  captureHeadless,
  captureLive,
  expectColour,
  paintedBox,
  type FrameReader,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
} from "./frames.js";

/** The stage and eight fixtures, each isolating one property. */
const BorderProbe = () => {
  const theme = useTheme();
  const border = {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.primary,
    borderWidth: theme.borderWidth.thin,
  };
  return (
    <div
      testId="border-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="border-thin"
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: 160,
          height: 72,
          ...border,
        }}
      />
      <div
        testId="border-strong"
        style={{
          position: "absolute",
          left: 240,
          top: 40,
          width: 160,
          height: 72,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.primary,
          borderWidth: theme.borderWidth.strong,
        }}
      />
      <div
        testId="radius-square"
        style={{
          position: "absolute",
          left: 40,
          top: 160,
          width: 120,
          height: 72,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.none,
        }}
      />
      <div
        testId="radius-rounded"
        style={{
          position: "absolute",
          left: 240,
          top: 160,
          width: 120,
          height: 72,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.xl,
        }}
      />
      <div
        testId="clip-visible"
        style={{
          position: "absolute",
          left: 40,
          top: 270,
          width: 120,
          height: 72,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.xl,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
      <div
        testId="clip-hidden"
        style={{
          position: "absolute",
          left: 240,
          top: 270,
          width: 120,
          height: 72,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.xl,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
      <div
        testId="clip-rounded-child"
        style={{
          position: "absolute",
          left: 440,
          top: 270,
          width: 120,
          height: 72,
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.xl,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.xl,
          }}
        />
      </div>
    </div>
  );
};

export const borderView = (): ReactNode => <BorderProbe />;

/**
 * The checks both hosts share.
 *
 * `Host` is the runner's host type and `E` its inspection error; the sample
 * chain, token reads and comparisons are identical, so a headless pass cannot
 * drift from the window's.
 */
const borderChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  capture: Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError | E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const theme = palettes.dark;
    const thin = yield* paintedBox(ctx, reader, "border-thin");
    const strong = yield* paintedBox(ctx, reader, "border-strong");
    const square = yield* paintedBox(ctx, reader, "radius-square");
    const rounded = yield* paintedBox(ctx, reader, "radius-rounded");
    const visible = yield* paintedBox(ctx, reader, "clip-visible");
    const hidden = yield* paintedBox(ctx, reader, "clip-hidden");
    const roundedChild = yield* paintedBox(ctx, reader, "clip-rounded-child");
    const window = yield* reader.windowSize();
    const frame = yield* capture;

    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const thinWidth = theme.borderWidth.thin;
    const strongWidth = theme.borderWidth.strong;
    yield* ctx.expectEqual(
      "the token's strong border is wider than its thin one",
      strongWidth > thinWidth,
      true,
    );
    yield* ctx.check(
      "the rounded corner sample is clear of the anti-aliased arc",
      cornerClearance(theme.radius.xl) >= 2
        ? Effect.void
        : Effect.fail(
            new Smoke.SmokeAssertionError({
              label: "the rounded corner sample is clear of the arc",
              expected: "at least 2 px of clearance",
              actual: `${cornerClearance(theme.radius.xl).toFixed(2)} px`,
            }),
          ),
    );

    const border = yield* parseColour(
      "colors.primary parses as the border",
      theme.colors.primary,
    );
    const card = yield* parseColour("colors.card parses", theme.colors.card);
    const background = yield* parseColour(
      "colors.background parses",
      theme.colors.background,
    );

    const sample = (point: { x: number; y: number }, label: string) =>
      pixelAtPoint(ctx, frame, window, point.x, point.y, label);
    const paints = (
      point: { x: number; y: number },
      label: string,
      expected: Pixels.Rgba,
      expectation: string,
    ) =>
      Effect.flatMap(sample(point, label), (actual) =>
        expectColour(ctx, expectation, actual, expected),
      );

    yield* paints(
      borderBand(thin, thinWidth, "left"),
      "the thin left border",
      border,
      "the 1 px border paints its left edge",
    );
    yield* paints(
      borderBand(thin, thinWidth, "right"),
      "the thin right border",
      border,
      "the 1 px border paints its right edge",
    );
    yield* paints(
      borderBand(thin, thinWidth, "top"),
      "the thin top border",
      border,
      "the 1 px border paints its top edge",
    );
    yield* paints(
      borderBand(thin, thinWidth, "bottom"),
      "the thin bottom border",
      border,
      "the 1 px border paints its bottom edge",
    );
    yield* paints(
      centre(thin),
      "the thin box interior",
      card,
      "the border is a band, not a fill",
    );
    yield* paints(
      beyondBorder(thin, thinWidth, 1, "left"),
      "past the thin left border",
      background,
      "the border has an outer edge",
    );

    yield* paints(
      borderBand(strong, strongWidth, "left"),
      "the strong left border",
      border,
      "the 2 px border paints at its full width",
    );
    yield* paints(
      borderBand(strong, strongWidth, "left", 0.75),
      "the outer quarter of the strong border",
      border,
      "the 2 px band reaches its outer quarter",
    );
    yield* paints(
      centre(strong),
      "the strong box interior",
      card,
      "the 2 px border leaves the interior alone",
    );
    yield* paints(
      beyondBorder(strong, strongWidth, 1, "left"),
      "past the strong left border",
      background,
      "the 2 px border stops at its outer edge",
    );

    yield* paints(
      contentCorner(square),
      "the square corner",
      card,
      "a square box paints its corner",
    );
    yield* paints(
      contentCorner(rounded),
      "the rounded corner",
      background,
      "a rounded box clips its corner",
    );
    yield* paints(
      centre(rounded),
      "the rounded box interior",
      card,
      "a rounded box still paints its fill",
    );
    yield* paints(
      { x: centre(rounded).x, y: rounded.y + 2 },
      "the rounded box's straight edge",
      card,
      "a radius clips only the corner",
    );

    yield* paints(
      contentCorner(visible),
      "the unclipped child's corner",
      border,
      "an unclipped child paints the parent's corner",
    );
    yield* paints(
      contentCorner(hidden),
      "the clipped child's corner",
      border,
      "overflow: hidden does not round the child's clip",
    );
    yield* paints(
      contentCorner(roundedChild),
      "the rounded child's corner",
      background,
      "a child with its own radius clears the parent's corner",
    );
    yield* paints(
      centre(hidden),
      "the clipped child's centre",
      border,
      "the clipped child still paints inside the corner",
    );
  });

export const borderScenario: PlaygroundScenario = {
  id: "border-pixels",
  title: "Border and radius pixels: the frame paints the chrome",
  capability: "theme",
  view: borderView,
  steps: (ctx) =>
    borderChecks(ctx, readSync(ctx.host), captureHeadless(ctx.host)),
};

export const borderLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-border-pixels",
  title: "Live border pixels: borders and radii in a window",
  capability: "theme",
  steps: (ctx) => borderChecks(ctx, readAsync(ctx.host), captureLive(ctx.host)),
};
