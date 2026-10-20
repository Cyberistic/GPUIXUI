/**
 * `shadow-pixels` / `live-shadow-pixels`: does the runtime paint the ring?
 *
 * `theme-type-and-shadow` reads `focusRing` and `elevationShadow` back from the
 * runtime's **style report**. A shadow the style layer accepts but the paint
 * layer drops would pass that check while every focus state stayed invisible.
 * This probe decodes a captured frame instead: the band just outside a ringed
 * box must be `colors.ring` on three edges, a matched plain box's band must be
 * the stage background, the ringed box's interior must be its own `card`, and
 * an `md` elevation must darken the stage below it against a flat control.
 *
 * Sampling geometry and the darkening rule are pure (`shadow-pixels.ts`); the
 * shared capture/scale/comparison chain is `frames.ts` (plan `676`).
 */
import { Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { elevationShadow, focusRing } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  asHex,
  captureHeadless,
  captureLive,
  expectColour,
  type FrameReader,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
} from "./frames.js";
import {
  darkerThan,
  interior,
  ringBand,
  SHADOW_DELTA,
  shadowSample,
} from "./shadow-pixels.js";

/** Four boxes on a stage: a ring pair and an elevation pair. */
const ShadowProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="shadow-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="shadow-ring"
        style={{
          position: "absolute",
          left: 80,
          top: 60,
          width: 120,
          height: 64,
          backgroundColor: theme.colors.card,
          ...focusRing(theme),
        }}
      />
      <div
        testId="shadow-plain"
        style={{
          position: "absolute",
          left: 320,
          top: 60,
          width: 120,
          height: 64,
          backgroundColor: theme.colors.card,
        }}
      />
      <div
        testId="shadow-elevated"
        style={{
          position: "absolute",
          left: 80,
          top: 220,
          width: 120,
          height: 64,
          backgroundColor: theme.colors.card,
          boxShadow: elevationShadow(theme, "md"),
        }}
      />
      <div
        testId="shadow-flat"
        style={{
          position: "absolute",
          left: 320,
          top: 220,
          width: 120,
          height: 64,
          backgroundColor: theme.colors.card,
        }}
      />
    </div>
  );
};

export const shadowView = (): ReactNode => <ShadowProbe />;

/**
 * The checks both hosts share.
 *
 * `Host` is the runner's host type and `E` its inspection error; the sample
 * chain, the token reading and the comparisons are identical, so a headless
 * pass cannot drift from the window's.
 */
const shadowChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  capture: Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError | E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const theme = palettes.dark;
    const ring = yield* paintedBox(ctx, reader, "shadow-ring");
    const plain = yield* paintedBox(ctx, reader, "shadow-plain");
    const elevated = yield* paintedBox(ctx, reader, "shadow-elevated");
    const flat = yield* paintedBox(ctx, reader, "shadow-flat");
    const window = yield* reader.windowSize();
    const frame = yield* capture;

    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );
    const spread = focusRing(theme).boxShadow.spreadRadius;
    yield* ctx.expectEqual(
      "the ring's spread is the theme's strong border width",
      spread,
      theme.borderWidth.strong,
    );
    yield* ctx.check(
      "the elevation token carries a shadow",
      elevationShadow(theme, "md") === undefined
        ? Effect.fail(
            new Smoke.SmokeAssertionError({
              label: "the elevation token carries a shadow",
              expected: "one md shadow",
              actual: "none",
            }),
          )
        : Effect.void,
    );

    const ringColour = yield* parseColour(
      "colors.ring parses",
      theme.colors.ring,
    );
    const card = yield* parseColour("colors.card parses", theme.colors.card);
    const background = yield* parseColour(
      "colors.background parses",
      theme.colors.background,
    );

    const sample = (point: { x: number; y: number }, label: string) =>
      pixelAtPoint(ctx, frame, window, point.x, point.y, label);

    yield* expectColour(
      ctx,
      "the ring paints outside the left edge",
      yield* sample(ringBand(ring, spread, "left"), "the left ring band"),
      ringColour,
    );
    yield* expectColour(
      ctx,
      "the ring paints outside the right edge",
      yield* sample(ringBand(ring, spread, "right"), "the right ring band"),
      ringColour,
    );
    yield* expectColour(
      ctx,
      "the ring paints above the top edge",
      yield* sample(ringBand(ring, spread, "top"), "the top ring band"),
      ringColour,
    );
    yield* expectColour(
      ctx,
      "an unringed box paints the stage outside its edge",
      yield* sample(ringBand(plain, spread, "left"), "the control band"),
      background,
    );
    yield* expectColour(
      ctx,
      "the ring is a band, not a fill",
      yield* sample(interior(ring, 4), "the ring box interior"),
      card,
    );

    const shadow = yield* sample(shadowSample(elevated), "the shadow below");
    const control = yield* sample(shadowSample(flat), "the control below");
    yield* expectColour(
      ctx,
      "the elevation control paints the stage",
      control,
      background,
    );
    yield* ctx.check(
      "the elevation shadow darkens the stage below the box",
      darkerThan(shadow, control, SHADOW_DELTA)
        ? Effect.void
        : Effect.fail(
            new Smoke.SmokeAssertionError({
              label: "the elevation shadow darkens the stage below the box",
              expected: `every channel at least ${SHADOW_DELTA} below ${asHex(control)}`,
              actual: asHex(shadow),
            }),
          ),
    );
  });

export const shadowScenario: PlaygroundScenario = {
  id: "shadow-pixels",
  title: "Shadow pixels: the focus ring and elevation paint",
  capability: "theme",
  view: shadowView,
  steps: (ctx) =>
    shadowChecks(ctx, readSync(ctx.host), captureHeadless(ctx.host)),
};

export const shadowLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-shadow-pixels",
  title: "Live shadow pixels: the ring and elevation in a window",
  capability: "theme",
  steps: (ctx) => shadowChecks(ctx, readAsync(ctx.host), captureLive(ctx.host)),
};
