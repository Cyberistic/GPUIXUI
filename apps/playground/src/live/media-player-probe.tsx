import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { MediaPlayer } from "@gpuixui/media/media-player";
import {
  bufferedWidth,
  progressWidth,
  timeLabel,
} from "@gpuixui/media/player/logic";
import { Button } from "@gpuixui/primitives/button";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import { countPaint } from "./box-paint.js";
import { captureScale } from "./frame.js";
import {
  frameAt,
  frameHex,
  PLAYER_CLIP_MS,
  PLAYER_BUFFERED,
  PLAYER_CHROME_HEIGHT,
  PLAYER_IDS,
  PLAYER_IDLE_MS,
  PLAYER_POSTER,
  PLAYER_REST,
  PLAYER_SCRUB_OFFSET,
  PLAYER_SEEK_STEP_MS,
  PLAYER_TICK_MS,
  PLAYER_TRACK,
  playerReadout,
  playerReportOf,
  type PlayerReport,
} from "./media-player.js";
import { settleUntil } from "./settle.js";

const REST = "player-rest";
const SOUGHT = "player-sought";
const DISABLED = "player-disabled";

const SETTLE = Duration.millis(140);

const ATTEMPTS = 120;

const MediaPlayerPage = (): ReactNode => {
  const theme = useTheme();
  const [report, setReport] = useState<PlayerReport>(PLAYER_REST);
  const [disabled, setDisabled] = useState(false);

  return (
    <div
      testId={PLAYER_IDS.root}
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
        The shipped MediaPlayer: the app supplies the frames, the component owns
        the clock, the transport and Mux's chrome.
      </text>
      <MediaPlayer
        duration={PLAYER_CLIP_MS}
        frameAt={frameAt}
        alt="A clip's frame"
        width={PLAYER_POSTER.width}
        height={PLAYER_POSTER.height}
        buffered={PLAYER_BUFFERED}
        tickMs={PLAYER_TICK_MS}
        idleMs={PLAYER_IDLE_MS}
        disabled={disabled}
        onPlayheadChange={(playhead) =>
          setReport((current) => ({
            ...current,
            playhead,
            reports: current.reports + 1,
          }))
        }
        onPlayingChange={(playing) =>
          setReport((current) => ({
            ...current,
            playing,
            reports: current.reports + 1,
          }))
        }
      />
      <Readout testId={PLAYER_IDS.readout}>{playerReadout(report)}</Readout>
      <Button
        testId={PLAYER_IDS.disable}
        onActivate={() => setDisabled((current) => !current)}
      >
        {disabled ? "Enable" : "Disable"}
      </Button>
    </div>
  );
};

export const MediaPlayerProbe = (): ReactNode => {
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
      <MediaPlayerPage />
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

const scaleOf = (ctx: Smoke.AsyncSmokeContext, frame: Pixels.Pixels) =>
  Effect.gen(function* () {
    const size = yield* ctx.host.windowSize();
    return yield* ctx.expectSome(
      "the capture is the window at one whole scale",
      captureScale(frame, size),
    );
  });

const countIn = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  scale: number,
  hex: string,
) =>
  ctx.expectSome(
    `the capture holds the ${hex} inside its own box`,
    countPaint(frame, box, scale, hex),
  );

const reportIn = (ctx: Smoke.AsyncSmokeContext, readout: string) =>
  ctx.expectSome("the readout names a report", playerReportOf(readout));

export const mediaPlayerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PLAYER_IDS.poster);
    yield* ctx.host.waitFor(PLAYER_IDS.controls);
    yield* ctx.host.waitFor(PLAYER_IDS.readout);

    const poster = yield* boxOf(ctx, PLAYER_IDS.poster);
    yield* ctx.expectNear(
      "the shipped picture paints the player's own width",
      poster.width,
      PLAYER_POSTER.width,
      1,
    );
    yield* ctx.expectNear(
      "the shipped picture paints the player's own height",
      poster.height,
      PLAYER_POSTER.height,
      1,
    );
    yield* ctx.expectEqual(
      "the shipped clock reads the clip's own start",
      yield* ctx.host.text(PLAYER_IDS.time),
      timeLabel(0, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the shipped fill starts empty",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      0,
      0,
    );
    yield* ctx.expectNear(
      "the shipped buffered range paints the app's own share",
      (yield* boxOf(ctx, PLAYER_IDS.buffered)).width,
      bufferedWidth(PLAYER_BUFFERED, PLAYER_CLIP_MS, PLAYER_TRACK.width),
      1,
    );
    yield* ctx.expectEqual(
      "the shipped player has reported nothing before it moves",
      yield* ctx.host.text(PLAYER_IDS.readout),
      playerReadout(PLAYER_REST),
    );
    yield* ctx.expectNear(
      "the timeline paints the frame less the bar's two insets",
      (yield* boxOf(ctx, PLAYER_IDS.track)).width,
      PLAYER_TRACK.width,
      1,
    );

    yield* Effect.sleep(Duration.millis(PLAYER_IDLE_MS * 2));
    const rest = yield* frameOf(ctx, REST);
    const scale = yield* scaleOf(ctx, rest);
    const picture = {
      ...poster,
      height: poster.height - PLAYER_CHROME_HEIGHT,
    };
    const posterArea = picture.width * picture.height * scale * scale;
    yield* ctx.expectNear(
      "the shipped picture paints the frame the playhead names",
      yield* countIn(ctx, rest, picture, scale, frameHex(0)),
      posterArea,
      Math.round(posterArea * 0.05),
    );
    yield* ctx.expectEqual(
      "no later frame paints at the clip's start",
      yield* countIn(ctx, rest, picture, scale, frameHex(PLAYER_SEEK_STEP_MS)),
      0,
    );

    yield* ctx.host.click(PLAYER_IDS.play);
    const running = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.readout),
      (text) =>
        Option.match(playerReportOf(text), {
          onNone: () => false,
          onSome: (report) =>
            report.playing && report.playhead >= PLAYER_CLIP_MS / 4,
        }),
      ATTEMPTS,
    );
    const started = yield* reportIn(ctx, running);
    yield* ctx.expectEqual(
      "the shipped player reports that it is playing",
      started.playing,
      true,
    );
    yield* ctx.expectEqual(
      "the shipped player reports the playhead it moved to",
      started.playhead >= PLAYER_CLIP_MS / 4,
      true,
    );
    yield* ctx.expectEqual(
      "the shipped player reports every move it made",
      started.reports > 1,
      true,
    );

    yield* ctx.host.click(PLAYER_IDS.playBar);
    const paused = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.readout),
      (text) =>
        Option.match(playerReportOf(text), {
          onNone: () => false,
          onSome: (report) => !report.playing,
        }),
      ATTEMPTS,
    );
    const held = yield* reportIn(ctx, paused);
    const clock = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(held.playhead, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "the shipped clock holds the paused playhead",
      clock,
      timeLabel(held.playhead, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the shipped fill paints the paused playhead's share",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      progressWidth(held.playhead, PLAYER_CLIP_MS, PLAYER_TRACK.width),
      1,
    );

    yield* ctx.host.focusElement(PLAYER_IDS.trackHit);
    yield* ctx.host.key("end");
    const ended = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "End seeks the shipped player to the clip's end",
      ended,
      timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the shipped fill ends full",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      PLAYER_TRACK.width,
      1,
    );

    yield* ctx.host.key("home");
    const home = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(0, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "Home seeks the shipped player back to its start",
      home,
      timeLabel(0, PLAYER_CLIP_MS),
    );

    yield* Effect.forEach(Arr.range(1, 3), () => ctx.host.key("right"), {
      concurrency: 1,
      discard: true,
    });
    const sought = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "three steps seek the shipped player to three quarters",
      sought,
      timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the shipped fill paints three quarters of the track",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      progressWidth(
        3 * PLAYER_SEEK_STEP_MS,
        PLAYER_CLIP_MS,
        PLAYER_TRACK.width,
      ),
      1,
    );

    const soughtFrame = yield* frameOf(ctx, SOUGHT);
    yield* ctx.expectNear(
      "the seek paints the frame the playhead landed on",
      yield* countIn(
        ctx,
        soughtFrame,
        picture,
        scale,
        frameHex(3 * PLAYER_SEEK_STEP_MS),
      ),
      posterArea,
      Math.round(posterArea * 0.05),
    );
    yield* ctx.expectEqual(
      "no earlier frame paints after the seek",
      yield* countIn(ctx, soughtFrame, picture, scale, frameHex(0)),
      0,
    );

    yield* ctx.host.key("home");
    yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(0, PLAYER_CLIP_MS),
      ATTEMPTS,
    );

    yield* ctx.host.drag(PLAYER_IDS.trackHit, 0, 0, {
      offset: { x: PLAYER_SCRUB_OFFSET, y: 0 },
      steps: 1,
    });
    const pressed = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "a press three quarters along the track seeks to that share",
      pressed,
      timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the fill paints the share a press on the track names",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      progressWidth(
        3 * PLAYER_SEEK_STEP_MS,
        PLAYER_CLIP_MS,
        PLAYER_TRACK.width,
      ),
      1,
    );
    const pressedReport = yield* reportIn(
      ctx,
      yield* ctx.host.text(PLAYER_IDS.readout),
    );
    yield* ctx.expectEqual(
      "a press on the track reports the playhead it named",
      pressedReport.playhead,
      3 * PLAYER_SEEK_STEP_MS,
    );

    yield* ctx.host.drag(PLAYER_IDS.trackHit, PLAYER_SCRUB_OFFSET, 0, {
      offset: { x: PLAYER_SCRUB_OFFSET, y: 0 },
      steps: 8,
    });
    const dragged = yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "a drag along the track follows the pointer to the clip's end",
      dragged,
      timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS),
    );
    yield* ctx.expectNear(
      "the fill reaches the track's end with the drag",
      (yield* boxOf(ctx, PLAYER_IDS.fill)).width,
      progressWidth(PLAYER_CLIP_MS, PLAYER_CLIP_MS, PLAYER_TRACK.width),
      1,
    );

    const released = yield* ctx.host.text(PLAYER_IDS.readout);
    yield* ctx.host.hover(PLAYER_IDS.trackHit);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a hover after the release reports nothing",
      yield* ctx.host.text(PLAYER_IDS.readout),
      released,
    );

    yield* ctx.host.click(PLAYER_IDS.disable);
    yield* settleUntil(
      ctx.host.text(PLAYER_IDS.disable),
      (text) => text === "Enable",
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "the probe's own switch turns the player off",
      yield* ctx.host.text(PLAYER_IDS.disable),
      "Enable",
    );
    const before = yield* ctx.host.text(PLAYER_IDS.time);
    yield* ctx.host.click(PLAYER_IDS.playBar);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled player does not move its playhead",
      yield* ctx.host.text(PLAYER_IDS.time),
      before,
    );
    yield* ctx.host.drag(PLAYER_IDS.trackHit, 0, 0, {
      offset: { x: PLAYER_SCRUB_OFFSET, y: 0 },
      steps: 1,
    });
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled track refuses a press",
      yield* ctx.host.text(PLAYER_IDS.time),
      before,
    );
    const disabledFrame = yield* frameOf(ctx, DISABLED);
    yield* ctx.expectEqual(
      "a disabled player still paints its frame",
      (yield* countIn(
        ctx,
        disabledFrame,
        picture,
        scale,
        frameHex(PLAYER_CLIP_MS),
      )) > 0,
      true,
    );
  });
