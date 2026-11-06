import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize, type ImgInstance } from "@gpuix/react";
import { Button } from "@gpuixui/primitives/button";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  advancePlayhead,
  fillWidth,
  frameColour,
  frameHex,
  framePixels,
  MEDIA_BUFFER,
  MEDIA_CLIP_MS,
  MEDIA_FILL,
  MEDIA_IDS,
  MEDIA_POSTER,
  MEDIA_REST,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  MEDIA_TRACK,
  mediaReadout,
  playheadOf,
  timeLabel,
  type MediaState,
} from "./media-frame.js";

const REST = "media-rest";
const PLAYING = "media-playing";
const PAUSED = "media-paused";
const SOUGHT = "media-sought";

const SETTLE = Duration.millis(140);

const POLL = Duration.millis(50);
const POLL_ATTEMPTS = 100;

const MediaFramePage = (): ReactNode => {
  const theme = useTheme();
  const image = useRef<ImgInstance>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setPlayhead((current) => advancePlayhead(current, MEDIA_TICK_MS));
    }, MEDIA_TICK_MS);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (playing && playhead >= MEDIA_CLIP_MS) setPlaying(false);
  }, [playing, playhead]);

  useLayoutEffect(() => {
    const instance = image.current;
    if (instance === null) return;
    instance.setImagePixels(
      MEDIA_BUFFER.width,
      MEDIA_BUFFER.height,
      Buffer.from(framePixels(frameColour(playhead))),
    );
  }, [playhead]);

  const toggle = (): void => {
    if (!playing && playhead >= MEDIA_CLIP_MS) setPlayhead(0);
    setPlaying((current) => !current);
  };

  const seek = (event: { readonly key?: string }): void => {
    const key = event.key ?? "";
    if (key === "home") setPlayhead(0);
    if (key === "end") setPlayhead(MEDIA_CLIP_MS);
    if (key === "left")
      setPlayhead((current) => advancePlayhead(current, -MEDIA_SEEK_STEP_MS));
    if (key === "right")
      setPlayhead((current) => advancePlayhead(current, MEDIA_SEEK_STEP_MS));
  };

  const state: MediaState = { playing, playhead };

  return (
    <div
      testId={MEDIA_IDS.probe}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A clip has no host element, so this card is the whole player: an image
        whose buffer is re-pushed for every frame, an interval the app owns, and
        a transport it draws.
      </text>
      <img
        testId={MEDIA_IDS.poster}
        ref={image}
        alt="A clip's frame"
        objectFit="fill"
        style={{
          width: MEDIA_POSTER.width,
          height: MEDIA_POSTER.height,
          backgroundColor: theme.colors.muted,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <Button testId={MEDIA_IDS.play} onActivate={toggle}>
          {playing ? "Pause" : "Play"}
        </Button>
        <div
          testId={MEDIA_IDS.track}
          style={{
            width: MEDIA_TRACK.width,
            height: MEDIA_TRACK.height,
            borderRadius: MEDIA_TRACK.height,
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId={MEDIA_IDS.fill}
            style={{
              width: fillWidth(playhead),
              height: MEDIA_TRACK.height,
              borderRadius: MEDIA_TRACK.height,
              backgroundColor: MEDIA_FILL,
            }}
          />
        </div>
        <text
          testId={MEDIA_IDS.time}
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          {timeLabel(playhead)}
        </text>
      </div>
      <div
        testId={MEDIA_IDS.seek}
        tabIndex={0}
        onKeyDown={seek}
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.card,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          Seek: Home, End, Left, Right
        </text>
      </div>
      <Readout testId={MEDIA_IDS.readout}>{mediaReadout(state)}</Readout>
    </div>
  );
};

export const MediaFrameProbe = (): ReactNode => {
  const window = useWindowSize();
  const theme = useTheme();
  return (
    <div
      style={{
        width: window.width,
        height: window.height,
        backgroundColor: theme.colors.background,
      }}
    >
      <MediaFramePage />
    </div>
  );
};

const boxOf = (ctx: Smoke.AsyncSmokeContext, testId: string) =>
  Effect.flatMap(ctx.host.bounds(testId), (bounds) =>
    ctx.expectSome(`the ${testId} paints a box`, Option.fromNullishOr(bounds)),
  );

const frameOf = (ctx: Smoke.AsyncSmokeContext, name: string) =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    return yield* ctx.host.pixels(name);
  });

const countOf = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  hex: string,
) =>
  Effect.map(
    ctx.expectSome(
      `the capture decodes the colour ${hex}`,
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ),
    (colour) => Pixels.countColour(frame, colour),
  );

const scaleOf = (ctx: Smoke.AsyncSmokeContext, frame: Pixels.Pixels) =>
  Effect.gen(function* () {
    const size = yield* ctx.host.windowSize();
    return yield* ctx.expectSome(
      "the capture is the window at one whole scale",
      captureScale(frame, size),
    );
  });

const waitForText = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
  ready: (text: string) => boolean,
  attempts = POLL_ATTEMPTS,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const text = yield* ctx.host.text(testId);
    if (ready(text) || attempts <= 0) return text;
    yield* Effect.sleep(POLL);
    return yield* waitForText(ctx, testId, ready, attempts - 1);
  });

const playheadIn = (ctx: Smoke.AsyncSmokeContext, readout: string) =>
  ctx.expectSome(
    `the readout ${readout} names a playhead`,
    playheadOf(readout),
  );

export const mediaFrameSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MEDIA_IDS.poster);
    yield* ctx.host.waitFor(MEDIA_IDS.readout);

    const poster = yield* boxOf(ctx, MEDIA_IDS.poster);
    yield* ctx.expectNear(
      "the poster paints the card's box",
      poster.width,
      MEDIA_POSTER.width,
      1,
    );
    yield* ctx.expectNear(
      "the poster is the clip's aspect",
      poster.height,
      MEDIA_POSTER.height,
      1,
    );
    yield* ctx.expectEqual(
      "the clip starts paused at its first frame",
      yield* ctx.host.text(MEDIA_IDS.readout),
      mediaReadout(MEDIA_REST),
    );
    yield* ctx.expectEqual(
      "the transport offers play",
      yield* ctx.host.text(MEDIA_IDS.play),
      "Play",
    );
    yield* ctx.expectEqual(
      "the transport starts at the clip's first tick",
      yield* ctx.host.text(MEDIA_IDS.time),
      timeLabel(0),
    );

    const rest = yield* frameOf(ctx, REST);
    const scale = yield* scaleOf(ctx, rest);
    const area = MEDIA_POSTER.width * MEDIA_POSTER.height * scale * scale;
    yield* ctx.expectNear(
      "the poster paints its frame from a buffer, not from a host element",
      yield* countOf(ctx, rest, frameHex(0)),
      area,
      Math.round(area * 0.05),
    );
    yield* ctx.expectEqual(
      "no later frame paints at the clip's start",
      yield* countOf(ctx, rest, frameHex(MEDIA_SEEK_STEP_MS)),
      0,
    );
    yield* ctx.expectEqual(
      "the fill is empty at the clip's start",
      yield* countOf(ctx, rest, MEDIA_FILL),
      0,
    );

    yield* ctx.host.click(MEDIA_IDS.play);
    const started = yield* waitForText(ctx, MEDIA_IDS.readout, (text) =>
      Option.match(playheadOf(text), {
        onNone: () => false,
        onSome: (value) => value > 0,
      }),
    );
    yield* ctx.expectContains(
      "a press starts the clip and its app clock advances it",
      started,
      "playing=true",
    );
    const first = yield* playheadIn(ctx, started);
    yield* ctx.expectEqual(
      "the app's clock advances the playhead in whole ticks",
      first % MEDIA_TICK_MS,
      0,
    );
    yield* ctx.expectEqual(
      "the fill grows while the clip plays",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width > 0,
      true,
    );
    const moving = yield* waitForText(ctx, MEDIA_IDS.readout, (text) =>
      Option.match(playheadOf(text), {
        onNone: () => false,
        onSome: (value) => value > first,
      }),
    );
    yield* ctx.expectEqual(
      "the clock keeps ticking while the clip plays",
      Option.getOrElse(playheadOf(moving), () => 0) > first,
      true,
    );
    const playingFrame = yield* frameOf(ctx, PLAYING);
    yield* ctx.expectEqual(
      "the playing poster is painted, not a blank",
      (yield* countOf(ctx, playingFrame, frameHex(0))) > 0,
      true,
    );

    yield* ctx.host.click(MEDIA_IDS.play);
    const paused = yield* waitForText(ctx, MEDIA_IDS.readout, (text) =>
      text.includes("playing=false"),
    );
    yield* ctx.expectContains(
      "a second press pauses the clip",
      paused,
      "playing=false",
    );
    const heldAt = yield* playheadIn(ctx, paused);
    yield* ctx.expectNear(
      "the progress fill paints the share the paused playhead names",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width,
      fillWidth(heldAt),
      1,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the playhead holds while paused",
      yield* ctx.host.text(MEDIA_IDS.readout),
      paused,
    );
    yield* ctx.expectNear(
      "the fill holds while paused",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width,
      fillWidth(heldAt),
      0,
    );
    const held = yield* frameOf(ctx, PAUSED);
    yield* ctx.expectNear(
      "the paused poster keeps the frame the playhead stopped on",
      yield* countOf(ctx, held, frameHex(heldAt)),
      area,
      Math.round(area * 0.05),
    );

    yield* ctx.host.focusElement(MEDIA_IDS.seek);
    yield* ctx.host.key("home");
    yield* ctx.expectEqual(
      "Home seeks the clip to its start",
      yield* ctx.host.text(MEDIA_IDS.time),
      timeLabel(0),
    );
    yield* ctx.expectEqual(
      "a seek does not start the clip",
      yield* ctx.host.text(MEDIA_IDS.play),
      "Play",
    );

    yield* ctx.host.key("end");
    yield* ctx.expectEqual(
      "End seeks the clip to its end",
      yield* waitForText(
        ctx,
        MEDIA_IDS.time,
        (text) => text === timeLabel(MEDIA_CLIP_MS),
      ),
      timeLabel(MEDIA_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the fill covers the whole track at the clip's end",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width,
      MEDIA_TRACK.width,
      1,
    );

    yield* ctx.host.key("home");
    yield* Effect.forEach(Arr.range(1, 3), () => ctx.host.key("right"), {
      concurrency: 1,
      discard: true,
    });
    yield* ctx.expectEqual(
      "three steps seek to three quarters of the clip",
      yield* waitForText(
        ctx,
        MEDIA_IDS.time,
        (text) => text === timeLabel(3 * MEDIA_SEEK_STEP_MS),
      ),
      timeLabel(3 * MEDIA_SEEK_STEP_MS),
    );
    yield* ctx.expectNear(
      "the fill paints three quarters of the track",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width,
      fillWidth(3 * MEDIA_SEEK_STEP_MS),
      1,
    );
    yield* Effect.sleep(SETTLE);
    const sought = yield* frameOf(ctx, SOUGHT);
    yield* ctx.expectNear(
      "the seek paints the frame the playhead landed on",
      yield* countOf(ctx, sought, frameHex(3 * MEDIA_SEEK_STEP_MS)),
      area,
      Math.round(area * 0.05),
    );
    yield* ctx.expectEqual(
      "no other frame paints after the seek",
      yield* countOf(ctx, sought, frameHex(0)),
      0,
    );

    yield* ctx.host.click(MEDIA_IDS.play);
    yield* ctx.host.focusElement(MEDIA_IDS.seek);
    yield* ctx.host.key("end");
    const ended = yield* waitForText(ctx, MEDIA_IDS.readout, (text) =>
      text.includes(`playing=false playhead=${MEDIA_CLIP_MS}`),
    );
    yield* ctx.expectEqual(
      "a playhead taken to the clip's end while playing stops the transport",
      ended,
      mediaReadout({ playing: false, playhead: MEDIA_CLIP_MS }),
    );
    yield* ctx.expectEqual(
      "the transport offers play again",
      yield* ctx.host.text(MEDIA_IDS.play),
      "Play",
    );
    yield* ctx.expectNear(
      "the fill ends full",
      (yield* boxOf(ctx, MEDIA_IDS.fill)).width,
      MEDIA_TRACK.width,
      1,
    );
    const last = yield* boxOf(ctx, MEDIA_IDS.poster);
    yield* ctx.expectEqual(
      "the frame sequence never reflows the poster",
      `${last.width}x${last.height}`,
      `${poster.width}x${poster.height}`,
    );
  });
