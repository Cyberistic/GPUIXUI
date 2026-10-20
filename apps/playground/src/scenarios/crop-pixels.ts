/**
 * Crop pixels: what the masks actually paint (plan `713`).
 *
 * The geometry probe (plan `385`) proves where the four masks are. Every one of
 * those checks would still pass if a mask had no background at all, so this
 * module turns the mask into a colour claim: the fixture's flat halves are
 * undimmed inside the crop and painted through the background token at
 * `MASK_ALPHA` outside it.
 *
 * Sampling stays pure. `cropSamples` derives the points from the crop, so a
 * resize moves them, and the expected colour is the sRGB composite the runtime
 * performs (measured for a 30 % wash in plan `701`), never a hardcoded hex. The
 * points sit at `crop.y + 16`, clear of the fixture's centre circle under every
 * plausible `objectFit` placement, the crop's 2 px border and the NW handle.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { CropRect, Stage } from "./crop-model.js";
import type { FrameReader } from "./frames.js";
import { asHex, TOLERANCE } from "./frames.js";

/** The fixture's flat left half; the view builds its SVG from this. */
export const IMAGE_LEFT = "#3B82F6";

/** The fixture's flat right half; the view builds its SVG from this. */
export const IMAGE_RIGHT = "#F59E0B";

/** The mask's alpha over the bitmap; the view paints `alpha(background, this)`. */
export const MASK_ALPHA = 0.6;

/** One sample point in stage coordinates and the two facts it must prove. */
export interface CropSample {
  readonly label: string;
  readonly point: { readonly x: number; readonly y: number };
  /** The colour the fixture paints there, before any mask. */
  readonly image: string;
  /** Whether the background token's mask covers this point. */
  readonly masked: boolean;
}

/**
 * Composite `over` on top of `under` at a straight `amount` (0…1).
 *
 * The runtime blends 8-bit sRGB channels directly, so this is the arithmetic a
 * frame readback must match; the alpha of the result is the frame's own.
 */
export const blendOver = (
  over: Pixels.Rgba,
  amount: number,
  under: Pixels.Rgba,
): Pixels.Rgba =>
  new Pixels.Rgba({
    r: Math.round(amount * over.r + (1 - amount) * under.r),
    g: Math.round(amount * over.g + (1 - amount) * under.g),
    b: Math.round(amount * over.b + (1 - amount) * under.b),
    a: 255,
  });

/**
 * The four points one crop paints differently.
 *
 * Two are inside the crop (undimmed image halves) and two are inside the left
 * and right masks (dimmed image halves). The right-mask point is clamped to the
 * stage so a wide crop still samples its own mask rather than the window.
 */
export const cropSamples = (crop: CropRect, stage: Stage): CropSamples => {
  const y = crop.y + 16;
  const right = crop.x + crop.width;
  return {
    leftHalf: {
      label: "the crop shows the image's left half",
      point: { x: crop.x + 24, y },
      image: IMAGE_LEFT,
      masked: false,
    },
    rightHalf: {
      label: "the crop shows the image's right half",
      point: { x: right - 16, y },
      image: IMAGE_RIGHT,
      masked: false,
    },
    leftMask: {
      label: "the left mask dims the image",
      point: { x: crop.x / 2, y },
      image: IMAGE_LEFT,
      masked: true,
    },
    rightMask: {
      label: "the right mask dims the image",
      point: { x: Math.min(stage.width - 8, right + 16), y },
      image: IMAGE_RIGHT,
      masked: true,
    },
  };
};

/** The four samples of one crop, named so the order is not an index lookup. */
export interface CropSamples {
  readonly leftHalf: CropSample;
  readonly rightHalf: CropSample;
  readonly leftMask: CropSample;
  readonly rightMask: CropSample;
}

const failure = (
  label: string,
  expected: string,
  actual: string,
): Smoke.SmokeAssertionError =>
  new Smoke.SmokeAssertionError({ label, expected, actual });

const parseColour = (
  label: string,
  hex: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  Option.match(Pixels.hexToRgba(hex), {
    onNone: () =>
      Effect.fail(
        failure(label, "a #RRGGBB or #RRGGBBAA colour", `unparseable ${hex}`),
      ),
    onSome: Effect.succeed,
  });

/**
 * A frame sample in logical window coordinates, or `None` outside the frame.
 */
const frameSampler =
  (frame: Pixels.Pixels, window: Smoke.WindowSize) =>
  (x: number, y: number): Option.Option<Pixels.Rgba> =>
    Option.flatMap(Pixels.framePoint(frame, window, x, y), (point) =>
      Pixels.pixelAt(frame, point.x, point.y),
    );

/**
 * Sample the four crop points and compare each with its composite.
 *
 * One check per sample, so the count stays four per capture and a wrong colour
 * fails by name. The stage box is read from the runtime, so the points follow
 * the layout; an unparseable token or fixture colour fails before sampling.
 */
export const cropFrameChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  stage: Smoke.Bounds,
  crop: CropRect,
  background: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    const backdrop = yield* parseColour(
      "the mask's background token parses",
      background,
    );
    const samples = cropSamples(crop, {
      width: stage.width,
      height: stage.height,
    });
    const sample = frameSampler(frame, window);

    // One check per sample, in fixture order: the check sink reports in the
    // order it is fed, so the samples stay sequential.
    yield* Effect.forEach(
      [
        samples.leftHalf,
        samples.rightHalf,
        samples.leftMask,
        samples.rightMask,
      ],
      (entry) =>
        Effect.gen(function* () {
          const image = yield* parseColour(
            `${entry.label}: the fixture colour parses`,
            entry.image,
          );
          const expected = entry.masked
            ? blendOver(backdrop, MASK_ALPHA, image)
            : image;
          yield* ctx.check(
            entry.label,
            Option.match(
              sample(stage.x + entry.point.x, stage.y + entry.point.y),
              {
                onNone: () =>
                  Effect.fail(
                    failure(entry.label, asHex(expected), "outside the frame"),
                  ),
                onSome: (actual) =>
                  Pixels.rgbaNear(actual, expected, TOLERANCE)
                    ? Effect.void
                    : Effect.fail(
                        failure(entry.label, asHex(expected), asHex(actual)),
                      ),
              },
            ),
          );
        }),
      { concurrency: 1 },
    );
  });
