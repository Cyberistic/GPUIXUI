/**
 * The `media-player-lifecycle` probe: the **shipped** `MediaPlayer` painted in
 * a real window.
 *
 * `media-frame-lifecycle` measured the route a clip can take on this runtime —
 * an image buffer the app re-pushes, an interval the app owns and a transport
 * the app draws. That route is the *composition*, and the library now ships the
 * wrapper: `@gpuixui/media`'s `MediaPlayer` owns the clock, the transport, the
 * fill and the waveform, and the caller supplies the frames. The package proved
 * its own rules against the offscreen renderer; nothing had ever painted the
 * shipped component in a window, so every claim the package makes about the
 * **transport** — the clock's format, the fill's share, the seek's keys, the
 * disabled refusal — was held only by the package's own suite.
 *
 * The probe gives the shipped player the same clip the composition probe
 * measures and reads four things only a window can answer:
 *
 * 1. **The picture.** The frame the playhead names is the frame the picture
 *    paints — a pixel count inside the picture's own box, not a state read.
 * 2. **The waveform.** One tinted `<svg>` mask, drawn as a silhouette: the
 *    ink is inside its box and the box's first and last rows are the page
 *    behind it, so a filled rectangle cannot pass.
 * 3. **The transport.** The clock, the fill's share and the seek's keys, each
 *    read against the **package's own** arithmetic
 *    (`@gpuixui/media/player/logic`), so the window is measured against the
 *    rule the component ships rather than a copy of it. The pointer scrub is
 *    the same share read from the band a reader presses.
 * 4. **The refusal.** A disabled player keeps its picture and refuses every
 *    press and every key.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { MediaPlayer } from "@gpuixui/media/media-player";
import { progressWidth, timeLabel } from "@gpuixui/media/player/logic";
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
  PLAYER_IDS,
  PLAYER_PAGE,
  PLAYER_PEAKS,
  PLAYER_POSTER,
  PLAYER_REST,
  PLAYER_SCRUB_OFFSET,
  PLAYER_SEEK_STEP_MS,
  PLAYER_TICK_MS,
  PLAYER_TRACK,
  PLAYER_WAVEFORM,
  PLAYER_WAVEFORM_INK,
  playerReadout,
  playerReportOf,
  type PlayerReport,
} from "./media-player.js";
import { settleUntil } from "./settle.js";

/** The captures a reader can look at, one per painted state. */
const REST = "player-rest";
const SOUGHT = "player-sought";
const DISABLED = "player-disabled";

/** Long enough for a state change to reach the frame before it is captured. */
const SETTLE = Duration.millis(140);

/** How many re-reads a probe spends before it reports the last one. */
const ATTEMPTS = 120;

/**
 * The page: the shipped player, and what it reports to the app.
 *
 * The reports are the component's own contract with a caller — the playhead it
 * moved to and whether it is running — so the page records them and the probe
 * reads the record back.
 */
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
        the clock, the transport and the waveform.
      </text>
      <MediaPlayer
        duration={PLAYER_CLIP_MS}
        frameAt={frameAt}
        alt="A clip's frame"
        peaks={PLAYER_PEAKS}
        width={PLAYER_POSTER.width}
        height={PLAYER_POSTER.height}
        trackWidth={PLAYER_TRACK.width}
        tickMs={PLAYER_TICK_MS}
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

/** The probe's window: one page, laid out at the window's own size. */
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

/** One painted box, with a failure that names the locator. */
const boxOf = (ctx: Smoke.AsyncSmokeContext, testId: string) =>
  Effect.flatMap(ctx.host.bounds(testId), (bounds) =>
    ctx.expectSome(`the ${testId} paints a box`, Option.fromNullishOr(bounds)),
  );

/** Captures the window and decodes it. */
const frameOf = (ctx: Smoke.AsyncSmokeContext, name: string) =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    return yield* ctx.host.pixels(name);
  });

/** The capture's device scale, which the boxes are counted in. */
const scaleOf = (ctx: Smoke.AsyncSmokeContext, frame: Pixels.Pixels) =>
  Effect.gen(function* () {
    const size = yield* ctx.host.windowSize();
    return yield* ctx.expectSome(
      "the capture is the window at one whole scale",
      captureScale(frame, size),
    );
  });

/** How many pixels of `hex` paint inside `box`. */
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

/** The report a readout names, as a failed check rather than a thrown one. */
const reportIn = (ctx: Smoke.AsyncSmokeContext, readout: string) =>
  ctx.expectSome("the readout names a report", playerReportOf(readout));

export const mediaPlayerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PLAYER_IDS.poster);
    yield* ctx.host.waitFor(PLAYER_IDS.waveform);
    yield* ctx.host.waitFor(PLAYER_IDS.readout);

    // ---- the shipped player at rest ----
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
      "the shipped transport starts paused",
      yield* ctx.host.text(PLAYER_IDS.play),
      "Play",
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
    yield* ctx.expectEqual(
      "the shipped player has reported nothing before it moves",
      yield* ctx.host.text(PLAYER_IDS.readout),
      playerReadout(PLAYER_REST),
    );

    // ---- the waveform ----
    const waveform = yield* boxOf(ctx, PLAYER_IDS.waveform);
    yield* ctx.expectNear(
      "the waveform paints the track's width",
      waveform.width,
      PLAYER_WAVEFORM.width,
      1,
    );
    yield* ctx.expectNear(
      "the waveform paints the height the component draws it in",
      waveform.height,
      PLAYER_WAVEFORM.height,
      1,
    );

    // ---- the picture, at rest ----
    const rest = yield* frameOf(ctx, REST);
    const scale = yield* scaleOf(ctx, rest);
    const posterArea =
      PLAYER_POSTER.width * PLAYER_POSTER.height * scale * scale;
    yield* ctx.expectNear(
      "the shipped picture paints the frame the playhead names",
      yield* countIn(ctx, rest, poster, scale, frameHex(0)),
      posterArea,
      Math.round(posterArea * 0.05),
    );
    yield* ctx.expectEqual(
      "no later frame paints at the clip's start",
      yield* countIn(ctx, rest, poster, scale, frameHex(PLAYER_SEEK_STEP_MS)),
      0,
    );

    // ---- the waveform's own paint ----
    const waveArea =
      PLAYER_WAVEFORM.width * PLAYER_WAVEFORM.height * scale * scale;
    const wavePaper = yield* countIn(ctx, rest, waveform, scale, PLAYER_PAGE);
    yield* ctx.expectEqual(
      "the waveform paints ink of its own",
      waveArea - wavePaper > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the waveform paints a silhouette, not a filled box",
      wavePaper < waveArea,
      true,
    );
    // A row is one device pixel tall, so the box is given in logical points.
    const row = { width: waveform.width, height: 1 / scale };
    yield* ctx.expectEqual(
      "the waveform's first row is the page behind it",
      yield* countIn(
        ctx,
        rest,
        { ...row, x: waveform.x, y: waveform.y },
        scale,
        PLAYER_PAGE,
      ),
      Math.round(waveform.width * scale),
    );
    yield* ctx.expectEqual(
      "the waveform's last row is the page behind it",
      yield* countIn(
        ctx,
        rest,
        {
          ...row,
          x: waveform.x,
          y: waveform.y + waveform.height - 1 / scale,
        },
        scale,
        PLAYER_PAGE,
      ),
      Math.round(waveform.width * scale),
    );
    yield* ctx.expectEqual(
      "the waveform paints the muted foreground the component tints it with",
      (yield* countIn(ctx, rest, waveform, scale, PLAYER_WAVEFORM_INK)) > 0,
      true,
    );

    // ---- the transport ----
    yield* ctx.host.click(PLAYER_IDS.play);
    yield* settleUntil(
      ctx.host.text(PLAYER_IDS.play),
      (text) => text === "Pause",
      ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "a press starts the shipped transport",
      yield* ctx.host.text(PLAYER_IDS.play),
      "Pause",
    );
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

    // Pause: the clock holds, so the label and the report agree exactly.
    yield* ctx.host.click(PLAYER_IDS.play);
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
    yield* ctx.expectEqual(
      "the shipped transport offers play again",
      yield* ctx.host.text(PLAYER_IDS.play),
      "Play",
    );
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

    // ---- the seek pad ----
    yield* ctx.host.focusElement(PLAYER_IDS.seek);
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

    // ---- the picture, after the seek ----
    const soughtFrame = yield* frameOf(ctx, SOUGHT);
    yield* ctx.expectNear(
      "the seek paints the frame the playhead landed on",
      yield* countIn(
        ctx,
        soughtFrame,
        poster,
        scale,
        frameHex(3 * PLAYER_SEEK_STEP_MS),
      ),
      posterArea,
      Math.round(posterArea * 0.05),
    );
    yield* ctx.expectEqual(
      "no earlier frame paints after the seek",
      yield* countIn(ctx, soughtFrame, poster, scale, frameHex(0)),
      0,
    );

    // ---- the pointer scrub ----
    // The band is the clip's whole length, so a press's share of its width is
    // its share of the clip. The rail inside the band is pointer-transparent,
    // so the registered band is the element that hears the press.
    yield* ctx.host.key("home");
    yield* settleUntil(
      ctx.host.text(PLAYER_IDS.time),
      (text) => text === timeLabel(0, PLAYER_CLIP_MS),
      ATTEMPTS,
    );
    // A press with no travel is the down/up pair a click makes, aimed a
    // quarter of the band right of its centre — three quarters along the clip.
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

    // The pointer travels to the band's trailing edge, held down, and the
    // release is outside the rail the press began on.
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
    const draggedReport = yield* reportIn(
      ctx,
      yield* ctx.host.text(PLAYER_IDS.readout),
    );
    yield* ctx.expectEqual(
      "a drag on the track reports the playhead it reached",
      draggedReport.playhead,
      PLAYER_CLIP_MS,
    );

    // The release ended the gesture: a pointer that rests on the band reports
    // nothing, so a scrub cannot stay armed on the first hover.
    const released = yield* ctx.host.text(PLAYER_IDS.readout);
    yield* ctx.host.hover(PLAYER_IDS.trackHit);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a hover after the release reports nothing",
      yield* ctx.host.text(PLAYER_IDS.readout),
      released,
    );

    // ---- a disabled player refuses the transport, and keeps its picture ----
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
    yield* ctx.host.click(PLAYER_IDS.play);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled transport refuses the press",
      yield* ctx.host.text(PLAYER_IDS.play),
      "Play",
    );
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
        poster,
        scale,
        frameHex(PLAYER_CLIP_MS),
      )) > 0,
      true,
    );
  });
