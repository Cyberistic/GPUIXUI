/**
 * The media waveform in the frame (plan `722`).
 *
 * `media-surface` proves the envelope's **geometry** and its **authored** style:
 * 64 bars at `i × 7.5`, `width 6`, heights `12…59`, and a wash/playhead by
 * bounds. Every one of those checks passes if a bar paints nothing, if the gap
 * between two bars is filled, or if the SVG image route decodes to a blank
 * bitmap. This module turns the envelope into colour claims: the bar route's
 * bar, gap and above-slot; the played wash over the stage and over a bar; the
 * playhead; and the image route's bar and transparent slot.
 *
 * Points come from the runtime's reported bounds, never from a window
 * coordinate. The stage is borderless, so its box is the envelope's coordinate
 * origin. A slot is `7.5` px and a bar `6`, so at device scale 2 a bar is 12
 * device px and the gap 3 — no fractional device pixel, so the gap sample is
 * exact (plan `722` §2).
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { FrameReader } from "./frames.js";
import { asHex, frameSampler, parseColour, TOLERANCE } from "./frames.js";
import { BAR_WIDTH, SLOT, STAGE, barRect, xAt } from "./media-model.js";

/** The played wash's alpha over the envelope; `media.tsx` imports this. */
export const PLAYED_ALPHA = 0.3;

/** How far above a bar the "empty stage" sample sits, in px. */
export const ABOVE_GAP = 8;

/** The four tokens the waveform paints with or over. */
export interface MediaPalette {
  readonly mutedForeground: string;
  readonly card: string;
  readonly primary: string;
  readonly foreground: string;
}

/** A logical window point. */
export interface MediaPoint {
  readonly x: number;
  readonly y: number;
}

/** One point and the fact it proves. */
export interface MediaSample {
  readonly label: string;
  readonly point: MediaPoint;
}

/** A bar's centre: the token the bar paints. */
export const barPoint = (bar: Smoke.Bounds): MediaPoint => ({
  x: bar.x + bar.width / 2,
  y: bar.y + bar.height / 2,
});

/**
 * The middle of the gap to a bar's right: the stage card, not the envelope.
 *
 * The gap is `SLOT − BAR_WIDTH` wide; its centre is `0.75` px past a 6 px bar.
 */
export const gapPoint = (bar: Smoke.Bounds): MediaPoint => ({
  x: bar.x + BAR_WIDTH + (SLOT - BAR_WIDTH) / 2,
  y: bar.y + bar.height / 2,
});

/**
 * A point `ABOVE_GAP` px above a bar: the stage, not a full-height column.
 *
 * Above this bar's top and therefore above every bar at this x — one bar per
 * slot.
 */
export const aboveBarPoint = (bar: Smoke.Bounds): MediaPoint => ({
  x: bar.x + bar.width / 2,
  y: bar.y - ABOVE_GAP,
});

/**
 * A point in the middle of the played wash, clear of every bar and the
 * playhead: 4 px below the stage's top (the tallest bar's top is 37).
 */
export const washPoint = (
  stage: Smoke.Bounds,
  seconds: number,
): MediaPoint => ({
  x: stage.x + xAt(seconds) / 2,
  y: stage.y + 4,
});

/** The playhead's own column, 1 px into its 2 px line, on the wash's row. */
export const playheadPoint = (
  stage: Smoke.Bounds,
  seconds: number,
): MediaPoint => ({
  x: stage.x + xAt(seconds) + 1,
  y: stage.y + 4,
});

/**
 * A stage-relative fixture point as a point in the image route's reported box.
 *
 * Proportional mapping means a rasterised SVG that insets its content by a
 * pixel still lands inside a 6 px bar (plan `577`'s loss note), while a wrong
 * fixture coordinate still moves the sample.
 */
export const imagePoint = (
  image: Smoke.Bounds,
  point: MediaPoint,
): MediaPoint => ({
  x: image.x + (point.x / STAGE.width) * image.width,
  y: image.y + (point.y / STAGE.height) * image.height,
});

const failure = (
  label: string,
  expected: string,
  actual: string,
): Smoke.SmokeAssertionError =>
  new Smoke.SmokeAssertionError({ label, expected, actual });

const sampleCheck = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  sample: MediaSample,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    yield* ctx.check(
      sample.label,
      Option.match(
        frameSampler(frame, window)(sample.point.x, sample.point.y),
        {
          onNone: () =>
            Effect.fail(
              failure(sample.label, asHex(expected), "outside the frame"),
            ),
          onSome: (actual) =>
            Pixels.rgbaNear(actual, expected, TOLERANCE)
              ? Effect.void
              : Effect.fail(
                  failure(sample.label, asHex(expected), asHex(actual)),
                ),
        },
      ),
    );
  });

/** Parse a palette token, failing by name when a token is unparseable. */
const token = (
  palette: MediaPalette,
  key: keyof MediaPalette,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  parseColour(`the palette's ${key} token parses`, palette[key]);

/**
 * The bar route at rest: four checks.
 *
 * `bar0`'s centre is clear of the 2 px playhead at `x = 0…2`; `bar32` carries
 * the gap and above-slot samples at the same slot. A missing bar fails the bar
 * checks, a filled gap fails the gap check, and a full-height column fails the
 * above-slot check.
 */
export const mediaEnvelopeChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  bar0: Smoke.Bounds,
  bar32: Smoke.Bounds,
  palette: MediaPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const bar = yield* token(palette, "mutedForeground");
    const card = yield* token(palette, "card");
    const samples: ReadonlyArray<readonly [MediaSample, Pixels.Rgba]> = [
      [
        {
          label: "the first bar paints the muted foreground",
          point: barPoint(bar0),
        },
        bar,
      ],
      [
        {
          label: "the gap between bars paints the stage",
          point: gapPoint(bar32),
        },
        card,
      ],
      [
        {
          label: "the middle bar paints the muted foreground",
          point: barPoint(bar32),
        },
        bar,
      ],
      [
        {
          label: "the stage above a bar paints empty",
          point: aboveBarPoint(bar32),
        },
        card,
      ],
    ];
    yield* Effect.forEach(
      samples,
      ([sample, expected]) => sampleCheck(ctx, reader, frame, sample, expected),
      { concurrency: 1 },
    );
  });

/**
 * The played wash: three checks.
 *
 * The wash over `card` and the wash over a bar's `mutedForeground` are distinct
 * composites, so a wash painted only over empty space fails the second. Both
 * derive from the palette, never a hardcoded hex.
 */
export const mediaPlayedChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  stage: Smoke.Bounds,
  bar0: Smoke.Bounds,
  seconds: number,
  palette: MediaPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const primary = yield* token(palette, "primary");
    const card = yield* token(palette, "card");
    const bar = yield* token(palette, "mutedForeground");
    const foreground = yield* token(palette, "foreground");
    const samples: ReadonlyArray<readonly [MediaSample, Pixels.Rgba]> = [
      [
        {
          label: "the wash over the stage is primary at 30 %",
          point: washPoint(stage, seconds),
        },
        Pixels.blendOver(primary, PLAYED_ALPHA, card),
      ],
      [
        {
          label: "the wash covers the bars",
          point: barPoint(bar0),
        },
        Pixels.blendOver(primary, PLAYED_ALPHA, bar),
      ],
      [
        {
          label: "the playhead paints the foreground",
          point: playheadPoint(stage, seconds),
        },
        foreground,
      ],
    ];
    yield* Effect.forEach(
      samples,
      ([sample, expected]) => sampleCheck(ctx, reader, frame, sample, expected),
      { concurrency: 1 },
    );
  });

/**
 * The image route: two checks.
 *
 * The bar's own centre and the slot above it, mapped proportionally into the
 * image's reported box. The gap stays unsampled: a rasterised SVG may inset its
 * content, and a 1.5 px gap is not a safe sample (plan `722` §1).
 */
export const mediaImageChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  image: Smoke.Bounds,
  palette: MediaPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const bar = yield* token(palette, "mutedForeground");
    const card = yield* token(palette, "card");
    const fixture = barRect(32);
    const centre = {
      x: fixture.x + BAR_WIDTH / 2,
      y: fixture.top + fixture.height / 2,
    };
    const samples: ReadonlyArray<readonly [MediaSample, Pixels.Rgba]> = [
      [
        {
          label: "the image envelope bar paints the muted foreground",
          point: imagePoint(image, centre),
        },
        bar,
      ],
      [
        {
          label: "the image's transparent slot shows the stage",
          point: imagePoint(image, {
            x: centre.x,
            y: fixture.top - ABOVE_GAP,
          }),
        },
        card,
      ],
    ];
    yield* Effect.forEach(
      samples,
      ([sample, expected]) => sampleCheck(ctx, reader, frame, sample, expected),
      { concurrency: 1 },
    );
  });
