import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import type { ImgInstance } from "@gpuix/react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as Arr from "effect/Array";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale, colourAt, differs, type Point } from "./frame.js";
import {
  CROP_HANDLE,
  CROP_IDS,
  CROP_IMAGE_HEIGHT,
  CROP_IMAGE_HEX,
  CROP_IMAGE_WIDTH,
  CROP_OPENING,
  CROP_OUTSIDE_POINT,
  cropBars,
  cropCentre,
  cropHandleBox,
  cropHandleColour,
  cropMaskColour,
  cropMaskPaint,
  cropPixels,
  cropReadout,
  draggedCrop,
  sameBox,
  type CropRect,
  type CropState,
} from "./crop-overlay.js";

const SETTLE = Duration.millis(40);

const DRAG_MOVES = 8;

const REST = "crop-rest";
const AT_MIN = "crop-min";
const AT_MAX = "crop-max";

const stateOf = (
  crop: CropRect,
  moves = 0,
  framePresses = 0,
  imagePresses = 0,
): CropState => ({ crop, moves, framePresses, imagePresses });

export const CropOverlayProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const image = useRef<ImgInstance>(null);
  const press = useRef(
    Option.none<{
      readonly crop: CropRect;
      readonly x: number;
      readonly y: number;
    }>(),
  );
  const [crop, setCrop] = useState<CropRect>(CROP_OPENING);
  const [moves, setMoves] = useState(0);
  const [framePresses, setFramePresses] = useState(0);
  const [imagePresses, setImagePresses] = useState(0);

  useLayoutEffect(() => {
    image.current?.setImagePixels(
      CROP_IMAGE_WIDTH,
      CROP_IMAGE_HEIGHT,
      Buffer.from(cropPixels()),
    );
  }, []);

  const handle = cropHandleBox(crop);

  return (
    <div
      testId={CROP_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A crop frame: four veil bars mask the bitmap but the hole, the bars take
        no press, and the corner handle drags the hole inside the bitmap&apos;s
        own bounds.
      </text>
      <Readout testId={CROP_IDS.readout}>
        {cropReadout(stateOf(crop, moves, framePresses, imagePresses))}
      </Readout>
      <div
        testId={CROP_IDS.frame}
        onMouseDown={() => setFramePresses((count) => count + 1)}
        style={{
          position: "relative",
          width: CROP_IMAGE_WIDTH,
          height: CROP_IMAGE_HEIGHT,
          backgroundColor: theme.colors.card,
        }}
      >
        <img
          testId={CROP_IDS.image}
          ref={image}
          alt={`A solid bitmap, ${CROP_IMAGE_HEX}`}
          objectFit="fill"
          onMouseDown={() => setImagePresses((count) => count + 1)}
          style={{ width: CROP_IMAGE_WIDTH, height: CROP_IMAGE_HEIGHT }}
        />
        {Arr.map(cropBars(crop), (bar) => (
          <div
            key={bar.side}
            testId={CROP_IDS.bar(bar.side)}
            style={{
              position: "absolute",
              left: bar.box.x,
              top: bar.box.y,
              width: bar.box.width,
              height: bar.box.height,
              backgroundColor: cropMaskColour(theme),
              pointerEvents: "none",
            }}
          />
        ))}
        <div
          testId={CROP_IDS.handle}
          onMouseDown={(event) => {
            press.current = Option.some({
              crop,
              x: event.x ?? 0,
              y: event.y ?? 0,
            });
          }}
          onMouseMove={(event) =>
            Option.match(press.current, {
              onNone: () => {},
              onSome: (start) => {
                setCrop(
                  draggedCrop(
                    start.crop,
                    (event.x ?? 0) - start.x,
                    (event.y ?? 0) - start.y,
                  ),
                );
                setMoves((count) => count + 1);
              },
            })
          }
          onMouseUp={() => {
            press.current = Option.none();
          }}
          style={{
            position: "absolute",
            left: handle.x,
            top: handle.y,
            width: CROP_HANDLE,
            height: CROP_HANDLE,
            backgroundColor: cropHandleColour(theme),
          }}
        />
      </div>
    </div>
  );
};

const sampleAt = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(label, colourAt(frame, point, scale));

const expectPaint = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  sample: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, differs(sample, expected), false);

const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

export const cropOverlaySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(CROP_IDS.frame);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(CROP_IDS.readout);
    const bitmap = yield* ctx.expectSome(
      "the bitmap's own colour is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(CROP_IMAGE_HEX)),
    );
    const mask = yield* ctx.expectSome(
      "the veil over the bitmap is a colour the frame can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(cropMaskPaint(palettes.dark))),
    );
    const frameBounds = yield* paintedBox(ctx, CROP_IDS.frame);

    const inFrame = (point: Point): Point => ({
      x: frameBounds.x + point.x,
      y: frameBounds.y + point.y,
    });

    const capture = (name: string) =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const pixels = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        const scale = yield* ctx.expectSome(
          `${name} is the window at a whole device scale`,
          captureScale(pixels, size),
        );
        return { pixels, scale } as const;
      });

    yield* ctx.expectNear(
      "the frame paints the bitmap's own width",
      frameBounds.width,
      CROP_IMAGE_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the frame paints the bitmap's own height",
      frameBounds.height,
      CROP_IMAGE_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the frame opens on the hole the fixture declares",
      yield* readout(),
      cropReadout(stateOf(CROP_OPENING)),
    );

    yield* Effect.forEach(
      cropBars(CROP_OPENING),
      (bar) =>
        Effect.gen(function* () {
          const painted = yield* paintedBox(ctx, CROP_IDS.bar(bar.side));
          yield* ctx.expectEqual(
            `the ${bar.side} bar paints the box the hole leaves`,
            sameBox(painted, {
              x: frameBounds.x + bar.box.x,
              y: frameBounds.y + bar.box.y,
              width: bar.box.width,
              height: bar.box.height,
            }),
            true,
          );
        }),
      { concurrency: 1, discard: true },
    );

    yield* ctx.expectEqual(
      "the handle paints on the hole's bottom-right corner",
      sameBox(yield* paintedBox(ctx, CROP_IDS.handle), {
        x: frameBounds.x + cropHandleBox(CROP_OPENING).x,
        y: frameBounds.y + cropHandleBox(CROP_OPENING).y,
        width: CROP_HANDLE,
        height: CROP_HANDLE,
      }),
      true,
    );

    const rest = yield* capture(REST);
    yield* expectPaint(
      ctx,
      "the top bar paints the veil over the bitmap",
      yield* sampleAt(
        ctx,
        rest.pixels,
        inFrame({ x: CROP_IMAGE_WIDTH / 2, y: CROP_OPENING.y / 2 }),
        rest.scale,
        "the rest capture holds the top bar",
      ),
      mask,
    );
    yield* expectPaint(
      ctx,
      "the left bar paints the veil over the bitmap",
      yield* sampleAt(
        ctx,
        rest.pixels,
        inFrame({
          x: CROP_OPENING.x / 2,
          y: CROP_OPENING.y + CROP_OPENING.height / 2,
        }),
        rest.scale,
        "the rest capture holds the left bar",
      ),
      mask,
    );
    yield* expectPaint(
      ctx,
      "the hole paints the bitmap, not the veil",
      yield* sampleAt(
        ctx,
        rest.pixels,
        inFrame(cropCentre(CROP_OPENING)),
        rest.scale,
        "the rest capture holds the hole",
      ),
      bitmap,
    );

    yield* ctx.host.drag(CROP_IDS.handle, -1000, -1000);
    yield* Effect.sleep(SETTLE);
    const smallest = draggedCrop(CROP_OPENING, -1000, -1000);
    yield* ctx.expectEqual(
      "a drag past the smallest hole clamps to the minimum",
      yield* readout(),
      cropReadout(stateOf(smallest, DRAG_MOVES)),
    );
    yield* ctx.expectEqual(
      "the right bar starts at the clamped hole's own edge",
      sameBox(yield* paintedBox(ctx, CROP_IDS.bar("right")), {
        x: frameBounds.x + smallest.x + smallest.width,
        y: frameBounds.y + smallest.y,
        width: CROP_IMAGE_WIDTH - (smallest.x + smallest.width),
        height: smallest.height,
      }),
      true,
    );
    const atMinimum = yield* capture(AT_MIN);
    yield* expectPaint(
      ctx,
      "the clamped hole still paints the bitmap at its centre",
      yield* sampleAt(
        ctx,
        atMinimum.pixels,
        inFrame(cropCentre(smallest)),
        atMinimum.scale,
        "the minimum capture holds the clamped hole",
      ),
      bitmap,
    );

    yield* ctx.host.drag(CROP_IDS.handle, 1000, 1000);
    yield* Effect.sleep(SETTLE);
    const largest = draggedCrop(smallest, 1000, 1000);
    yield* ctx.expectEqual(
      "a drag past the bitmap's edge clamps to its bounds",
      yield* readout(),
      cropReadout(stateOf(largest, 2 * DRAG_MOVES)),
    );
    const grown = yield* capture(AT_MAX);
    yield* expectPaint(
      ctx,
      "a pixel the mask covered at rest is the bitmap once the hole reaches it",
      yield* sampleAt(
        ctx,
        grown.pixels,
        inFrame(CROP_OUTSIDE_POINT),
        grown.scale,
        "the grown capture holds the point the hole gained",
      ),
      bitmap,
    );
    yield* expectPaint(
      ctx,
      "the bar outside the grown hole still paints the veil",
      yield* sampleAt(
        ctx,
        grown.pixels,
        inFrame({ x: CROP_IMAGE_WIDTH / 2, y: largest.y / 2 }),
        grown.scale,
        "the grown capture holds the top bar",
      ),
      mask,
    );

    yield* ctx.host.click(CROP_IDS.bar("top"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a veil bar reaches the frame beneath it and leaves the hole",
      yield* readout(),
      cropReadout(stateOf(largest, 2 * DRAG_MOVES, 1, 0)),
    );
    yield* ctx.host.click(CROP_IDS.image);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the bitmap reaches the frame, never the image's own handler",
      yield* readout(),
      cropReadout(stateOf(largest, 2 * DRAG_MOVES, 2, 0)),
    );
    yield* ctx.host.capture("crop-dragged");
  });
