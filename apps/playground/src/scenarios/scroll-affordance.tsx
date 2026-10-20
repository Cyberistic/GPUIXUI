/**
 * `scroll-affordance` / `live-scroll-affordance` — what a scroll container
 * actually shows on 0.10.0.
 *
 * Three records disagree about the scrollbar and no scenario reads one
 * (plan `801` §1). This probe answers it from painted boxes and decoded frames:
 *
 * - the pinned runtime reserves **no** gutter in either axis;
 * - it paints **no** thumb, at rest or while scrolling;
 * - the trailing strip is the content and steals no click;
 * - `overflow: "auto"` is inert: it neither scrolls nor clips;
 * - a component-owned thumb is the only way to show a position, so the probe
 *   measures that recipe too: a track and thumb as **siblings** of the
 *   scroller (a child of the scroller scrolls away — measured), a derived
 *   length and start, a painted token, and a track press that asks for an
 *   offset.
 *
 * The rules live in `scrollbar-model.ts`; capture, device scale and colour
 * comparison are `frames.ts`. Measured facts: plan `801` §2.
 */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  asHex,
  captureHeadless,
  captureLive,
  expectColour,
  frameSampler,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  TOLERANCE,
  type FrameReader,
} from "./frames.js";
import {
  THUMB_WIDTH,
  edgePairs,
  firstMismatch,
  offsetForTrackPress,
  thumbGeometry,
  type ThumbBox,
} from "./scrollbar-model.js";

const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 460;
const FIXTURE_WIDTH = 180;
const FIXTURE_HEIGHT = 160;
const ROW_TOP = 16;
const ROW_BOTTOM = 200;
const COLUMNS = [16, 220, 424] as const;
const CONTENT_HEIGHT = 2000;
const SHORT_HEIGHT = 100;
/** The auto fixture's child, sampled below its own box. */
const OVERFLOW_DROP = 220;
/** How far outside the thumb the content sample sits. */
const BESIDE_THUMB = 20;
/** A layout rounded to a whole pixel may sit this far from the model. */
const BOX_TOLERANCE = 1;
/** The live protocol has no frame boundary, so every step settles first. */
const SETTLE_MS = 40;

/** The assertions a scenario context offers, without the host's type. */
type Asserts = Pick<
  Smoke.SmokeContext,
  "check" | "expectEqual" | "expectNear" | "expectSome"
>;

const ScrollAffordanceProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const viewportRef = useRef<PublicInstance | null>(null);
  const trackRef = useRef<PublicInstance | null>(null);
  const [clicks, setClicks] = useState(0);
  const [offset, setOffset] = useState(0);

  /** Scrolls the owned viewport and mirrors the runtime's new offset. */
  const scrollOwn = (target: number) => {
    setOffset(target);
    Option.match(Option.fromNullishOr(viewportRef.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollTo?.(id, 0, target),
    });
  };

  /** The mirror follows the runtime, never an accumulation of deltas. */
  const syncOffset = () => {
    Option.match(Option.fromNullishOr(viewportRef.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getScrollOffset?.(id)), {
          onNone: () => {},
          onSome: (current) => setOffset(current[1] ?? 0),
        }),
    });
  };

  /** A press maps the track's own box to an offset (plan `184`'s ref read). */
  const pressTrack = (event: { readonly y?: number }) => {
    Option.match(Option.fromNullishOr(trackRef.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getElementBounds?.(id)), {
          onNone: () => {},
          onSome: (box) =>
            scrollOwn(
              Math.round(
                offsetForTrackPress(
                  FIXTURE_HEIGHT,
                  CONTENT_HEIGHT,
                  (event.y ?? 0) - box.y,
                ),
              ),
            ),
        }),
    });
  };

  const thumb = thumbGeometry(FIXTURE_HEIGHT, CONTENT_HEIGHT, offset);
  const shortThumb = thumbGeometry(FIXTURE_HEIGHT, SHORT_HEIGHT, 0);

  /** The overlay: a track, and a thumb only when there is something to show. */
  const scrollbar = (prefix: string, position: Option.Option<ThumbBox>) => (
    <>
      <div
        testId={`${prefix}-track`}
        ref={prefix === "scroll-own" ? trackRef : undefined}
        onClick={prefix === "scroll-own" ? pressTrack : undefined}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: THUMB_WIDTH,
          height: FIXTURE_HEIGHT,
          backgroundColor: theme.colors.muted,
        }}
      />
      {Option.match(position, {
        onNone: () => null,
        onSome: (box) => (
          <div
            testId={`${prefix}-thumb`}
            style={{
              position: "absolute",
              right: 0,
              top: box.start,
              width: THUMB_WIDTH,
              height: box.length,
              borderRadius: THUMB_WIDTH / 2,
              backgroundColor: theme.colors.mutedForeground,
            }}
          />
        ),
      })}
    </>
  );

  const at = (
    testId: string,
    left: number,
    top: number,
    extra: Record<string, unknown> = {},
  ) => ({
    testId,
    style: {
      position: "absolute" as const,
      left,
      top,
      width: FIXTURE_WIDTH,
      height: FIXTURE_HEIGHT,
      ...extra,
    },
  });

  const control = (testId: string, label: string, onPress: () => void) => (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onPress}
      style={{
        paddingLeft: 8,
        paddingRight: 8,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.card,
        cursor: "pointer",
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </div>
  );

  return (
    <div
      testId="scroll-stage"
      style={{
        position: "relative",
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        backgroundColor: theme.colors.background,
      }}
    >
      <div {...at("scroll-plain", COLUMNS[0], ROW_TOP)}>
        <div
          testId="scroll-plain-child"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
      <div {...at("scroll-v", COLUMNS[1], ROW_TOP, { overflowY: "scroll" })}>
        <div
          testId="scroll-v-child"
          onClick={() => setClicks((current) => current + 1)}
          style={{
            width: "100%",
            height: CONTENT_HEIGHT,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
      <div {...at("scroll-h", COLUMNS[2], ROW_TOP, { overflowX: "scroll" })}>
        <div
          testId="scroll-h-child"
          style={{
            width: CONTENT_HEIGHT,
            height: "100%",
            backgroundColor: theme.colors.success,
          }}
        />
      </div>
      <div
        {...at("scroll-short", COLUMNS[0], ROW_BOTTOM, { overflowY: "scroll" })}
      >
        <div
          testId="scroll-short-child"
          style={{
            width: "100%",
            height: SHORT_HEIGHT,
            backgroundColor: theme.colors.card,
          }}
        />
        {scrollbar("scroll-short", shortThumb)}
      </div>
      <div {...at("scroll-own", COLUMNS[1], ROW_BOTTOM)}>
        <div
          testId="scroll-own-viewport"
          ref={viewportRef}
          onScroll={syncOffset}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: FIXTURE_WIDTH,
            height: FIXTURE_HEIGHT,
            overflowY: "scroll",
          }}
        >
          <div
            testId="scroll-own-child"
            style={{
              width: "100%",
              height: CONTENT_HEIGHT,
              backgroundColor: theme.colors.card,
            }}
          />
        </div>
        {scrollbar("scroll-own", thumb)}
      </div>
      <div
        {...at("scroll-auto", COLUMNS[2], ROW_BOTTOM, { overflowY: "auto" })}
      >
        <div
          testId="scroll-auto-child"
          style={{
            width: "100%",
            height: CONTENT_HEIGHT,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: COLUMNS[0],
          top: 396,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {control("scroll-own-down", "scroll", () => scrollOwn(-400))}
        {control("scroll-own-reset", "reset", () => scrollOwn(0))}
        <Readout testId="scroll-clicks">{`clicks=${clicks}`}</Readout>
        <Readout testId="scroll-own-offset">{`offset=${offset}`}</Readout>
      </div>
    </div>
  );
};

export const scrollAffordanceView = (): ReactNode => <ScrollAffordanceProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface ScrollDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly text: (testId: string) => Effect.Effect<string | null, E>;
  readonly bounds: (testId: string) => Effect.Effect<Smoke.Bounds | null, E>;
  readonly offset: (testId: string) => Effect.Effect<Smoke.Offset | null, E>;
  readonly wheel: (
    testId: string,
    dx: number,
    dy: number,
  ) => Effect.Effect<void, E>;
  readonly hover: (testId: string) => Effect.Effect<void, E>;
  readonly click: (testId: string) => Effect.Effect<void, E>;
  readonly clickWindow: (x: number, y: number) => Effect.Effect<void, E>;
  readonly wait: (millis: number) => Effect.Effect<void>;
}

/** `offset=-920` → `-920`; a missing or unparseable readout is `None`. */
const readNumber = (text: string | null, key: string): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(text), (line) =>
    Option.flatMap(Option.fromNullishOr(line.split(`${key}=`)[1]), (raw) => {
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? Option.some(parsed) : Option.none();
    }),
  );

/** One strip check: every trailing-edge sample must equal its neighbour. */
const expectUniformStrip = <E,>(
  ctx: Asserts,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  axis: "x" | "y",
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    const at = frameSampler(frame, window);
    const pairs = edgePairs(box, axis);
    const edgeSamples: Option.Option<ReadonlyArray<Pixels.Rgba>> = Option.all(
      Arr.map(pairs, (pair) => at(pair.edge.x, pair.edge.y)),
    );
    const innerSamples: Option.Option<ReadonlyArray<Pixels.Rgba>> = Option.all(
      Arr.map(pairs, (pair) => at(pair.inner.x, pair.inner.y)),
    );
    const outside = () =>
      new Smoke.SmokeAssertionError({
        label,
        expected: `${pairs.length} pairs inside the frame`,
        actual: "a sample fell outside the captured frame",
      });
    const compare = (
      edge: ReadonlyArray<Pixels.Rgba>,
      inner: ReadonlyArray<Pixels.Rgba>,
    ): Effect.Effect<void, Smoke.SmokeAssertionError> => {
      const mismatch = firstMismatch(edge, inner, TOLERANCE);
      const off = edge[mismatch];
      const on = inner[mismatch];
      if (mismatch === -1 || off === undefined || on === undefined) {
        return Effect.void;
      }
      return Effect.fail(
        new Smoke.SmokeAssertionError({
          label,
          expected: `the edge at stop ${mismatch} to be the content (${asHex(on)})`,
          actual: asHex(off),
        }),
      );
    };
    yield* ctx.check(
      label,
      Option.match(edgeSamples, {
        onNone: () => Effect.fail(outside()),
        onSome: (edge) =>
          Option.match(innerSamples, {
            onNone: () => Effect.fail(outside()),
            onSome: (inner) => compare(edge, inner),
          }),
      }),
    );
  });

/** The thumb's painted box against its derived box, relative to the track. */
const expectThumb = <E,>(
  ctx: Asserts,
  driver: ScrollDriver<E>,
  track: Smoke.Bounds,
  offset: number,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, driver.reader, "scroll-own-thumb");
    const derived = yield* ctx.expectSome(
      `the thumb geometry exists at ${offset}`,
      thumbGeometry(FIXTURE_HEIGHT, CONTENT_HEIGHT, offset),
    );
    yield* ctx.expectNear(
      "the owned thumb keeps its width",
      box.width,
      THUMB_WIDTH,
      BOX_TOLERANCE,
    );
    yield* ctx.expectNear(
      `the owned thumb's start follows offset ${offset}`,
      box.y - track.y,
      derived.start,
      BOX_TOLERANCE,
    );
    yield* ctx.expectNear(
      `the owned thumb's length follows offset ${offset}`,
      box.height,
      derived.length,
      BOX_TOLERANCE,
    );
    return box;
  });

/** The recipe's input path: a wheel, the control, then a track press. */
const recipeChecks = <E,>(
  ctx: Asserts,
  driver: ScrollDriver<E>,
  track: Smoke.Bounds,
  restFrame: Pixels.Pixels,
  window: Smoke.WindowSize,
  ink: Pixels.Rgba,
  card: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const mirror = Effect.flatMap(driver.text("scroll-own-offset"), (text) =>
      Effect.succeed(readNumber(text, "offset")),
    );

    const rest = yield* expectThumb(ctx, driver, track, 0);
    yield* expectColour(
      ctx,
      "the thumb paints the muted foreground",
      yield* pixelAtPoint(
        ctx,
        restFrame,
        window,
        rest.x + THUMB_WIDTH / 2,
        rest.y + rest.height / 2,
        "the thumb's centre",
      ),
      ink,
    );

    // A wheel: the component mirrors the runtime, not a delta chain.
    yield* driver.hover("scroll-own-viewport");
    yield* driver.wheel("scroll-own-viewport", 0, -100);
    yield* driver.wait(SETTLE_MS);
    const wheeled = yield* ctx.expectSome(
      "the owned viewport scrolls",
      Option.fromNullishOr(yield* driver.offset("scroll-own-viewport")),
    );
    yield* ctx.expectEqual(
      "the component mirrors the runtime offset",
      Option.getOrElse(yield* mirror, () => Number.NaN),
      wheeled.y,
    );
    yield* expectThumb(ctx, driver, track, wheeled.y);

    // The control: an exact -400, and the thumb follows it.
    yield* driver.click("scroll-own-down");
    yield* driver.wait(SETTLE_MS);
    const down = yield* ctx.expectSome(
      "the control sets the runtime offset",
      Option.fromNullishOr(yield* driver.offset("scroll-own-viewport")),
    );
    yield* ctx.expectEqual("the control scrolls to -400", down.y, -400);
    const moved = yield* expectThumb(ctx, driver, track, -400);
    const movedFrame = yield* driver.capture();
    yield* expectColour(
      ctx,
      "the moved thumb still paints the muted foreground",
      yield* pixelAtPoint(
        ctx,
        movedFrame,
        window,
        moved.x + THUMB_WIDTH / 2,
        moved.y + moved.height / 2,
        "the moved thumb's centre",
      ),
      ink,
    );
    yield* expectColour(
      ctx,
      "the content beside the thumb is the card",
      yield* pixelAtPoint(
        ctx,
        movedFrame,
        window,
        moved.x - BESIDE_THUMB,
        moved.y + moved.height / 2,
        "the content beside the thumb",
      ),
      card,
    );

    // A press on the track: the model's half-way offset, mirrored.
    yield* driver.clickWindow(
      track.x + THUMB_WIDTH / 2,
      track.y + FIXTURE_HEIGHT / 2,
    );
    yield* driver.wait(SETTLE_MS);
    const pressed = yield* ctx.expectSome(
      "the track press sets an offset",
      Option.fromNullishOr(yield* driver.offset("scroll-own-viewport")),
    );
    yield* ctx.expectNear(
      "the track press asks for the midpoint offset",
      pressed.y,
      offsetForTrackPress(FIXTURE_HEIGHT, CONTENT_HEIGHT, FIXTURE_HEIGHT / 2),
      2,
    );
    yield* ctx.expectEqual(
      "the mirror follows the track press",
      Option.getOrElse(yield* mirror, () => Number.NaN),
      pressed.y,
    );
    const pressedThumb = yield* expectThumb(ctx, driver, track, pressed.y);
    const pressedFrame = yield* driver.capture();
    yield* expectColour(
      ctx,
      "the pressed thumb paints the muted foreground",
      yield* pixelAtPoint(
        ctx,
        pressedFrame,
        window,
        pressedThumb.x + THUMB_WIDTH / 2,
        pressedThumb.y + pressedThumb.height / 2,
        "the pressed thumb's centre",
      ),
      ink,
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): ScrollDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  text: (testId) => Effect.sync(() => host.text(testId)),
  bounds: (testId) => Effect.sync(() => host.bounds(testId)),
  offset: (testId) => Effect.sync(() => host.scrollOffset(testId)),
  wheel: (testId, dx, dy) => Effect.sync(() => host.wheel(testId, dx, dy)),
  hover: (testId) => Effect.sync(() => host.hover(testId)),
  click: (testId) => Effect.sync(() => host.click(testId)),
  clickWindow: (x, y) => Effect.sync(() => host.clickWindow(x, y)),
  wait: () => Effect.void,
});

const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): ScrollDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () => captureLive(host),
  text: (testId) => host.text(testId),
  bounds: host.bounds,
  offset: (testId) => host.scrollOffset(testId),
  wheel: (testId, dx, dy) => host.wheel(testId, dx, dy),
  hover: host.hover,
  click: host.click,
  clickWindow: (x, y) => host.clickWindow(x, y),
  wait: (millis) => Effect.sleep(Duration.millis(millis)),
});

/** Geometry, the runtime's own path, then the recipe. */
const steps = <E,>(
  ctx: Asserts,
  driver: ScrollDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const frame = yield* driver.capture();
    const window = yield* driver.reader.windowSize();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const plain = yield* paintedBox(ctx, driver.reader, "scroll-plain");
    const plainChild = yield* paintedBox(
      ctx,
      driver.reader,
      "scroll-plain-child",
    );
    const v = yield* paintedBox(ctx, driver.reader, "scroll-v");
    const vChild = yield* paintedBox(ctx, driver.reader, "scroll-v-child");
    const h = yield* paintedBox(ctx, driver.reader, "scroll-h");
    const hChild = yield* paintedBox(ctx, driver.reader, "scroll-h-child");
    const auto = yield* paintedBox(ctx, driver.reader, "scroll-auto");
    const autoChild = yield* paintedBox(
      ctx,
      driver.reader,
      "scroll-auto-child",
    );
    const short = yield* paintedBox(ctx, driver.reader, "scroll-short");
    const shortChild = yield* paintedBox(
      ctx,
      driver.reader,
      "scroll-short-child",
    );

    yield* ctx.expectEqual(
      "the plain child fills its container",
      plainChild.width,
      plain.width,
    );
    yield* ctx.expectEqual(
      "a vertical scroller reserves no gutter",
      vChild.width,
      v.width,
    );
    yield* ctx.expectEqual(
      "a vertical scroller lays out its whole content",
      vChild.height,
      CONTENT_HEIGHT,
    );
    yield* ctx.expectEqual(
      "a horizontal scroller reserves no bottom gutter",
      hChild.height,
      h.height,
    );
    yield* ctx.expectEqual(
      "a horizontal scroller lays out its whole content",
      hChild.width,
      CONTENT_HEIGHT,
    );
    yield* ctx.expectEqual(
      "an auto scroller reserves no gutter either",
      autoChild.width,
      auto.width,
    );
    yield* ctx.expectEqual(
      "the short fixture's child keeps its own height",
      shortChild.height,
      SHORT_HEIGHT,
    );
    yield* ctx.expectEqual(
      "the short fixture is a scroller with nothing to scroll",
      short.width,
      FIXTURE_WIDTH,
    );

    yield* expectUniformStrip(
      ctx,
      driver.reader,
      frame,
      v,
      "x",
      "no thumb paints on a vertical scroller at rest",
    );
    yield* expectUniformStrip(
      ctx,
      driver.reader,
      frame,
      h,
      "y",
      "no thumb paints on a horizontal scroller at rest",
    );

    // The runtime's own scroll path.
    yield* ctx.expectEqual(
      "a scroller starts at the origin",
      Option.getOrElse(
        Option.map(
          Option.fromNullishOr(yield* driver.offset("scroll-v")),
          (offset) => offset.y,
        ),
        () => Number.NaN,
      ),
      0,
    );
    yield* driver.hover("scroll-v");
    yield* driver.wheel("scroll-v", 0, -100);
    yield* driver.wait(SETTLE_MS);
    const vScrolled = yield* ctx.expectSome(
      "a wheel moves a vertical scroller",
      Option.fromNullishOr(yield* driver.offset("scroll-v")),
    );
    yield* ctx.expectEqual("a -100 wheel is -100", vScrolled.y, -100);
    const scrolledFrame = yield* driver.capture();
    yield* expectUniformStrip(
      ctx,
      driver.reader,
      scrolledFrame,
      v,
      "x",
      "no thumb appears while scrolling",
    );
    yield* driver.hover("scroll-h");
    yield* driver.wheel("scroll-h", -240, 0);
    yield* driver.wait(SETTLE_MS);
    const hScrolled = yield* ctx.expectSome(
      "a deltaX wheel moves a horizontal scroller",
      Option.fromNullishOr(yield* driver.offset("scroll-h")),
    );
    yield* ctx.expectEqual("a -240 wheel is -240", hScrolled.x, -240);
    yield* driver.hover("scroll-short");
    yield* driver.wheel("scroll-short", 0, -100);
    yield* driver.wait(SETTLE_MS);
    const shortScrolled = yield* ctx.expectSome(
      "a short scroller still reports an offset",
      Option.fromNullishOr(yield* driver.offset("scroll-short")),
    );
    yield* ctx.expectEqual("a short scroller cannot move", shortScrolled.y, 0);

    // `auto` is inert: no offset, and the content is not clipped either.
    yield* driver.hover("scroll-auto");
    yield* driver.wheel("scroll-auto", 0, -100);
    yield* driver.wait(SETTLE_MS);
    yield* ctx.expectEqual(
      "an auto scroller reports no offset",
      Option.isNone(Option.fromNullishOr(yield* driver.offset("scroll-auto"))),
      true,
    );
    yield* expectColour(
      ctx,
      "an auto fixture paints its child below its own box",
      yield* pixelAtPoint(
        ctx,
        scrolledFrame,
        window,
        auto.x + auto.width / 2,
        auto.y + OVERFLOW_DROP,
        "below the auto fixture",
      ),
      yield* parseColour("the card token parses", palettes.dark.colors.card),
    );

    // The trailing strip belongs to the content, so it takes the click.
    yield* driver.clickWindow(v.x + v.width - 3, v.y + v.height / 2);
    yield* driver.wait(SETTLE_MS);
    yield* ctx.expectEqual(
      "a click 3 px inside the edge reaches the content",
      Option.getOrElse(
        Option.flatten(
          Option.map(
            Option.fromNullishOr(yield* driver.text("scroll-clicks")),
            (text) => readNumber(text, "clicks"),
          ),
        ),
        () => -1,
      ),
      1,
    );
    yield* ctx.expectEqual(
      "the edge click does not scroll",
      Option.getOrElse(
        Option.map(
          Option.fromNullishOr(yield* driver.offset("scroll-v")),
          (offset) => offset.y,
        ),
        () => Number.NaN,
      ),
      -100,
    );

    // The recipe: the track paints, the thumb is derived, and it moves.
    const track = yield* paintedBox(ctx, driver.reader, "scroll-own-track");
    const own = yield* paintedBox(ctx, driver.reader, "scroll-own");
    const ownChild = yield* paintedBox(ctx, driver.reader, "scroll-own-child");
    const ownViewport = yield* paintedBox(
      ctx,
      driver.reader,
      "scroll-own-viewport",
    );
    yield* ctx.expectEqual(
      "the track is the thumb's width",
      track.width,
      THUMB_WIDTH,
    );
    yield* ctx.expectEqual(
      "the track ends at the scroller's edge",
      track.x + track.width,
      own.x + FIXTURE_WIDTH,
    );
    yield* ctx.expectEqual(
      "the thumb overlays rather than reserving a gutter",
      ownChild.width,
      ownViewport.width,
    );
    yield* ctx.expectEqual(
      "the short fixture derives no thumb",
      Option.isNone(thumbGeometry(FIXTURE_HEIGHT, SHORT_HEIGHT, 0)),
      true,
    );
    const shortThumb = yield* driver.bounds("scroll-short-thumb");
    yield* ctx.expectEqual(
      "the short fixture paints no thumb",
      Option.isNone(Option.fromNullishOr(shortThumb)),
      true,
    );
    const shortTrack = yield* paintedBox(
      ctx,
      driver.reader,
      "scroll-short-track",
    );
    yield* expectColour(
      ctx,
      "the short fixture still paints its track",
      yield* pixelAtPoint(
        ctx,
        frame,
        window,
        shortTrack.x + THUMB_WIDTH / 2,
        shortTrack.y + FIXTURE_HEIGHT / 2,
        "the short track's centre",
      ),
      yield* parseColour("the muted token parses", palettes.dark.colors.muted),
    );
    yield* expectColour(
      ctx,
      "the track paints the muted role below the thumb",
      yield* pixelAtPoint(
        ctx,
        frame,
        window,
        track.x + THUMB_WIDTH / 2,
        track.y + FIXTURE_HEIGHT - 20,
        "the lower track",
      ),
      yield* parseColour("the muted token parses", palettes.dark.colors.muted),
    );

    yield* recipeChecks(
      ctx,
      driver,
      track,
      frame,
      window,
      yield* parseColour(
        "the thumb token parses",
        palettes.dark.colors.mutedForeground,
      ),
      yield* parseColour("the card token parses", palettes.dark.colors.card),
    );
  });

export const scrollAffordanceScenario: PlaygroundScenario = {
  id: "scroll-affordance",
  title: "Scroll affordance: the gutter, the missing thumb and the recipe",
  capability: "scroll",
  view: scrollAffordanceView,
  steps: (ctx) => steps(ctx, headlessDriver(ctx.host)),
};

export const scrollAffordanceLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-scroll-affordance",
  title: "Live scroll affordance: the gutter, the missing thumb and the recipe",
  capability: "scroll",
  steps: (ctx) => steps(ctx, liveDriver(ctx.host)),
};
