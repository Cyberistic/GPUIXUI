/**
 * The `image-zoom` probe: the shipped magnifier mounted in a window, read out of
 * the frame it paints.
 *
 * `ImageZoom` rested on two claims from other measurements: that an `<img>` host
 * scales its own buffer into the box it is given (measured for a chart's pixel
 * buffer by `chart-raster`), and that the pan keeps the spot under the pointer in
 * place (measured for boxes only, by the component's own suite). The probe
 * hovers a marked spot of a synthetic picture and reads both: the picture's
 * painted box is larger than the frame and covers it, the pointed spot still
 * paints the mark it painted at rest, and the marks the magnified window leaves
 * out are gone from the capture.
 *
 * It also proves the pointer reaches the component at all, and in the
 * coordinates the pan is computed from: the view prints the event's point minus
 * the frame's own `onLayout` origin, which must be the point the probe aimed at.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { ImageZoom } from "@gpuixui/components";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import { captureScale, colourAt, differs, type Point } from "./frame.js";
import {
  ZOOM_BACKGROUND,
  ZOOM_HOVERS,
  ZOOM_IDS,
  ZOOM_IMAGE,
  ZOOM_PICTURE_DATA_URL,
  ZOOM_SCALE,
  covers,
  framePointOf,
  magnified,
  markCentre,
  pinned,
  rgbaOf,
  sameBox,
  sameZoomBox,
  zoomBoxIn,
  zoomMark,
  zoomReadout,
  type ZoomBox,
  type ZoomMarkName,
} from "./image-zoom.js";

/** A hover needs a frame to reach the component's handler. */
const SETTLE = Duration.millis(60);

/**
 * The tween's level, with a frame to spare.
 *
 * The box is read once it has stopped: a box read mid-journey names the frame
 * the runtime was painting, not the one the pointer asked for.
 */
const TRAVEL = Duration.millis(400);

/** The captures a reader can look at, one per painted state. */
const REST = "image-zoom-rest";
const MARK = "image-zoom-mark";
const OTHER = "image-zoom-other";
const RETURNED = "image-zoom-returned";

/** The probe's window: one picture, one marked spot and an empty box beside it. */
export const ImageZoomProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [moves, setMoves] = useState(0);
  const [leaves, setLeaves] = useState(0);

  return (
    <div
      testId={ZOOM_IDS.probe}
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
        The shipped image zoom: a picture whose marked spots must keep their
        place under the pointer while the frame stays exactly where it is.
      </text>
      <Readout testId={ZOOM_IDS.readout}>
        {zoomReadout({ point, moves, leaves })}
      </Readout>
      <ImageZoom
        testId={ZOOM_IDS.frame}
        src={ZOOM_PICTURE_DATA_URL}
        alt="A chart with three marked approaches"
        width={ZOOM_IMAGE.width}
        height={ZOOM_IMAGE.height}
        scale={ZOOM_SCALE}
        onLayout={(event) => {
          if (typeof event.x === "number" && typeof event.y === "number") {
            setOrigin({ x: event.x, y: event.y });
          }
        }}
        onMouseMove={(event) => {
          setPoint({
            x: (event.x ?? 0) - origin.x,
            y: (event.y ?? 0) - origin.y,
          });
          setMoves((count) => count + 1);
        }}
        onMouseLeave={() => setLeaves((count) => count + 1)}
      />
      <div
        testId={ZOOM_IDS.away}
        style={{
          width: 120,
          height: 40,
          backgroundColor: theme.colors.muted,
        }}
      />
    </div>
  );
};

/** The painted box of `testId`, failing by name when the runtime omitted it. */
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

/** The picture's box in the frame's own coordinates. */
const pictureBox = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Smoke.Bounds,
): Effect.Effect<ZoomBox, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const picture = yield* paintedBox(ctx, ZOOM_IDS.picture);
    return zoomBoxIn(picture, frame);
  });

export const imageZoomSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(ZOOM_IDS.frame);
    yield* Effect.sleep(SETTLE);

    /** A capture and the scale its logical points convert by. */
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

    /**
     * The colour a window point paints.
     *
     * `None` when the point is outside the capture, so a frame the window does
     * not hold is reported rather than sampled from another part of it.
     */
    const sample = (
      frame: Pixels.Pixels,
      point: Point,
      scale: number,
      label: string,
    ) => ctx.expectSome(label, colourAt(frame, point, scale));

    /** Asserts a window point paints `expected`. */
    const expectPaint = (
      frame: Pixels.Pixels,
      point: Point,
      scale: number,
      expected: Pixels.Rgba,
      label: string,
    ) =>
      Effect.gen(function* () {
        const colour = yield* sample(
          frame,
          point,
          scale,
          `the capture holds the point for: ${label}`,
        );
        yield* ctx.expectEqual(label, differs(colour, expected), false);
      });

    /** A window point from a frame-local one. */
    const at = (frame: Smoke.Bounds, point: Point): Point => ({
      x: frame.x + point.x,
      y: frame.y + point.y,
    });

    /**
     * Hovers a frame-local point.
     *
     * Twice: the component's surface box is a 1 px probe that reports its origin
     * after a layout, so the first move asks for the report and the second paints
     * the frame the report settles.
     */
    const hover = (frame: Smoke.Bounds, point: Point) =>
      Effect.gen(function* () {
        const target = at(frame, point);
        yield* ctx.host.hoverAt(ZOOM_IDS.frame, point);
        yield* Effect.sleep(SETTLE);
        yield* ctx.host.hoverAt(ZOOM_IDS.frame, point);
        yield* Effect.sleep(TRAVEL);
        return target;
      });

    /** The colour of a named mark, as the sampler's own value. */
    const markPaint = (name: ZoomMarkName): Pixels.Rgba =>
      rgbaOf(zoomMark(name).colour);

    // ── The pointer starts somewhere the frame is not ─────────────────────
    // A probe that assumed the resting state would read the previous probe's
    // pointer position, so the pointer is parked on an element beside the frame.
    yield* ctx.host.hover(ZOOM_IDS.away);
    yield* Effect.sleep(TRAVEL);

    const frame = yield* paintedBox(ctx, ZOOM_IDS.frame);
    yield* ctx.expectNear(
      "the frame paints the picture's own width",
      frame.width,
      ZOOM_IMAGE.width,
      1,
    );
    yield* ctx.expectNear(
      "the frame paints the picture's own height",
      frame.height,
      ZOOM_IMAGE.height,
      1,
    );

    // ── At rest the picture covers the frame exactly ──────────────────────
    yield* ctx.expectEqual(
      "the resting picture is the frame, 1:1 and un-panned",
      sameZoomBox(yield* pictureBox(ctx, frame), {
        left: 0,
        top: 0,
        width: ZOOM_IMAGE.width,
        height: ZOOM_IMAGE.height,
      }),
      true,
    );

    const resting = yield* capture(REST);
    yield* Effect.forEach(
      ["edge", "mark", "far"] as const,
      (name) =>
        expectPaint(
          resting.pixels,
          at(frame, markCentre(zoomMark(name))),
          resting.scale,
          markPaint(name),
          `the resting picture paints its ${name} mark`,
        ),
      { concurrency: 1, discard: true },
    );
    const restingAbove = yield* sample(
      resting.pixels,
      at(frame, { x: 120, y: 2 }),
      resting.scale,
      "the resting capture holds the frame's top edge",
    );
    yield* ctx.expectEqual(
      "the resting picture fills the frame edge to edge",
      differs(restingAbove, rgbaOf(ZOOM_BACKGROUND)),
      false,
    );
    // The picture carries the frame's radius at rest, so its painted corner is
    // the page. The magnified capture is read against the same point below.
    const restingCorner = yield* sample(
      resting.pixels,
      at(frame, { x: 1, y: 1 }),
      resting.scale,
      "the resting capture holds the frame's corner",
    );
    yield* ctx.expectEqual(
      "the resting picture rounds its own corner away from the page",
      differs(restingCorner, rgbaOf(ZOOM_BACKGROUND)),
      true,
    );

    // ── The pointer on a marked spot magnifies the picture ────────────────
    const markPoint = yield* hover(frame, ZOOM_HOVERS.mark);
    const zoomed = yield* pictureBox(ctx, frame);
    yield* ctx.expectContains(
      "the pointer's move reached the component, in the frame's own coordinates",
      yield* ctx.host.text(ZOOM_IDS.readout),
      `point=${ZOOM_HOVERS.mark.x},${ZOOM_HOVERS.mark.y}`,
    );
    yield* ctx.expectContains(
      "the component reported no leave while the pointer rested on it",
      yield* ctx.host.text(ZOOM_IDS.readout),
      "leaves=0",
    );
    yield* ctx.expectEqual(
      "the magnified picture is larger than the frame by the scale it was given",
      magnified(zoomed),
      true,
    );
    yield* ctx.expectEqual(
      "the magnified picture covers the frame it is clipped by",
      covers(zoomed),
      true,
    );
    yield* ctx.expectEqual(
      "the pointed spot keeps its own share of the frame",
      pinned(zoomed, ZOOM_HOVERS.mark),
      true,
    );
    yield* ctx.expectEqual(
      "the frame itself does not move under the pointer",
      sameBox(yield* paintedBox(ctx, ZOOM_IDS.frame), frame),
      true,
    );

    // ── The capture: the mark under the pointer, the rest gone ────────────
    const magnifiedFrame = yield* capture(MARK);
    yield* expectPaint(
      magnifiedFrame.pixels,
      markPoint,
      magnifiedFrame.scale,
      markPaint("mark"),
      "the mark under the pointer still paints under the pointer",
    );
    yield* Effect.forEach(
      ["edge", "far"] as const,
      (name) =>
        Effect.gen(function* () {
          const shown = yield* sample(
            magnifiedFrame.pixels,
            at(frame, markCentre(zoomMark(name))),
            magnifiedFrame.scale,
            `the magnified capture holds the ${name} mark's old place`,
          );
          yield* ctx.expectEqual(
            `the ${name} mark is outside the magnified window`,
            differs(shown, rgbaOf(zoomMark(name).colour)),
            true,
          );
        }),
      { concurrency: 1, discard: true },
    );
    // Measured, not assumed: the runtime clips an overflowing child to its box
    // and not to the frame's corner radius, so the magnified picture paints the
    // corner square. `image-zoom.test.ts` and the README carry the limitation.
    const magnifiedCorner = yield* sample(
      magnifiedFrame.pixels,
      at(frame, { x: 1, y: 1 }),
      magnifiedFrame.scale,
      "the magnified capture holds the frame's corner",
    );
    yield* ctx.expectEqual(
      "the magnified picture paints the frame's corner square",
      differs(magnifiedCorner, rgbaOf(ZOOM_BACKGROUND)),
      false,
    );

    // ── The picture's own extent grew with the box ────────────────────────
    // A mark is sixteen picture pixels wide and sixteen points wide at rest; a
    // box that magnifies the buffer paints it wider by the same factor. The read
    // is the mark's exact paint, so a picture scaled by anything else cannot
    // pass by painting a bigger box.
    const restExtent = yield* ctx.expectSome(
      "the resting capture holds the pointed mark's own paint",
      Option.fromNullishOr(
        Pixels.boundsOfColour(resting.pixels, markPaint("mark")),
      ),
    );
    const markExtent = yield* ctx.expectSome(
      "the magnified capture holds the pointed mark's own paint",
      Option.fromNullishOr(
        Pixels.boundsOfColour(magnifiedFrame.pixels, markPaint("mark")),
      ),
    );
    yield* ctx.expectNear(
      "the marked spot paints wider by the magnification",
      markExtent.width / restExtent.width,
      ZOOM_SCALE,
      0.12,
    );

    // ── A second point pans the other way ─────────────────────────────────
    const otherPoint = yield* hover(frame, ZOOM_HOVERS.other);
    const pushed = yield* pictureBox(ctx, frame);
    yield* ctx.expectEqual(
      "a second hover keeps the magnification",
      magnified(pushed),
      true,
    );
    yield* ctx.expectEqual(
      "a second hover keeps the picture over its frame",
      covers(pushed),
      true,
    );
    yield* ctx.expectEqual(
      "the second pointed spot keeps its own share of the frame",
      pinned(pushed, ZOOM_HOVERS.other),
      true,
    );
    yield* ctx.expectContains(
      "the second hover reached the component in its own coordinates",
      yield* ctx.host.text(ZOOM_IDS.readout),
      `point=${ZOOM_HOVERS.other.x},${ZOOM_HOVERS.other.y}`,
    );

    const pushedFrame = yield* capture(OTHER);
    yield* expectPaint(
      pushedFrame.pixels,
      otherPoint,
      pushedFrame.scale,
      rgbaOf(ZOOM_BACKGROUND),
      "the second point paints the picture's background",
    );
    const amberAfter = yield* sample(
      pushedFrame.pixels,
      at(frame, markCentre(zoomMark("mark"))),
      pushedFrame.scale,
      "the panned capture holds the first mark's old place",
    );
    yield* ctx.expectEqual(
      "the first mark is outside the frame after the pan",
      differs(amberAfter, markPaint("mark")),
      true,
    );
    // The far mark's own picture point is inside the window the pan opened, so
    // it paints where the panned box puts it — the window moved, not the picture.
    yield* expectPaint(
      pushedFrame.pixels,
      at(frame, framePointOf(markCentre(zoomMark("far")), pushed)),
      pushedFrame.scale,
      markPaint("far"),
      "the far mark paints where the panned box puts it",
    );

    // ── Leaving the frame returns the picture to rest ─────────────────────
    yield* ctx.host.hover(ZOOM_IDS.away);
    yield* Effect.sleep(TRAVEL);
    yield* ctx.expectEqual(
      "leaving the frame restores the picture's resting box",
      sameZoomBox(yield* pictureBox(ctx, frame), {
        left: 0,
        top: 0,
        width: ZOOM_IMAGE.width,
        height: ZOOM_IMAGE.height,
      }),
      true,
    );
    yield* ctx.expectContains(
      "the component reported the leave it took",
      yield* ctx.host.text(ZOOM_IDS.readout),
      "leaves=1",
    );
    const returned = yield* capture(RETURNED);
    yield* expectPaint(
      returned.pixels,
      at(frame, markCentre(zoomMark("edge"))),
      returned.scale,
      markPaint("edge"),
      "the edge mark paints again once the pointer leaves",
    );
  });
