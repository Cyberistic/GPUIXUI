/**
 * `media-surface` — the runtime half of a waveform seek surface (plan `520`).
 *
 * 0.10.0 has no media element, no transport and no audio device: the closed
 * `ElementType` union and the JSX intrinsics list have twelve tags and none is
 * media, so a player is an app-owned platform integration and this probe does
 * not pretend to play. What a component can own is measured here:
 *
 * - a 64-bar envelope at a 7.5 px slot with bottom-aligned bars, or one `<img>`
 *   SVG data URL of the same fixture (one retained node instead of 64);
 * - a 4 px/s seek: a press maps a stage x to a clamped time, a held move keeps
 *   scrubbing, and Home/End/arrows step;
 * - **the gesture's hit target is load-bearing**: moves go to the pressed
 *   element, so a plane *under* the envelope never scrubs. The plane on top and
 *   a `pointerEvents: "none"` layer with the plane beneath both work.
 *
 * The geometry and the seek are pure (`media-model.ts`); the view and the steps
 * call the same functions.
 */
import { useCallback, useRef, useState } from "react";
import { Effect, Option } from "effect";
import * as Arr from "effect/Array";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { alpha } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout, Toolbar } from "../ui.js";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import { captureHeadless, readSync } from "./frames.js";
import {
  PLAYED_ALPHA,
  mediaEnvelopeChecks,
  mediaImageChecks,
  mediaPlayedChecks,
} from "./media-pixels.js";
import {
  BAR_WIDTH,
  BARS,
  DURATION,
  STAGE,
  barRect,
  describeMedia,
  envelopeDataUrl,
  nextPlane,
  positionLabel,
  stepTime,
  timeAt,
  xAt,
} from "./media-model.js";
import type { PlaneMode } from "./media-model.js";
import {
  elementTypeOf,
  focusedId,
  node,
  read,
  readoutField,
  text,
  treeOf,
} from "./probes.js";

/** The first, middle and last bars are addressable: 64 testIds add no evidence. */
const ADDRESSABLE = [0, 32, 63] as const;
const barTestId = (index: number): string | undefined =>
  Arr.contains(ADDRESSABLE, index) ? `media-bar-${index}` : undefined;

const pointOf = (event: EventPayload): { x: number; y: number } => ({
  x: event.x ?? 0,
  y: event.y ?? 0,
});

const MediaProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [pos, setPos] = useState(0);
  const [plane, setPlane] = useState<PlaneMode>("over");
  const [route, setRoute] = useState<"bars" | "image">("bars");
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  const stageId = useRef<Option.Option<number>>(Option.none());
  // A held gesture is read by the very next native event, often before the
  // commit that renders `pos` (plan `385` §10).
  const held = useRef(false);

  const stageRef = useCallback((instance: PublicInstance | null) => {
    stageId.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  /** The pointer's window x as a clip time, or `None` before the first paint. */
  const timeOf = (event: EventPayload): Option.Option<number> =>
    Option.map(
      Option.flatMap(stageId.current, (id) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(id)),
      ),
      (bounds) => timeAt(pointOf(event).x - bounds.x),
    );

  const seek = (entry: string, event: EventPayload): void => {
    Option.match(timeOf(event), {
      onNone: () => undefined,
      onSome: (next) => {
        setPos(next);
        record(entry);
      },
    });
  };

  const reset = (): void => {
    setPos(0);
    setPlane("over");
    setRoute("bars");
    setLog([]);
    held.current = false;
  };

  const moveBy = (seconds: number): void =>
    setPos((previous) => timeAt(xAt(previous + seconds)));

  const onKeyDown = (event: EventPayload): void =>
    setPos((previous) =>
      stepTime(previous, event.key ?? "", event.modifiers?.shift === true),
    );

  const seekPlane = (
    <div
      testId="media-seek"
      role="slider"
      aria-label="Playback position"
      aria-valuetext={positionLabel(pos)}
      tabIndex={0}
      onMouseDown={(event) => {
        held.current = true;
        seek("down:seek", event);
      }}
      onMouseMove={(event) => {
        if (!held.current) return;
        seek("move:seek", event);
      }}
      onMouseUp={() => {
        if (!held.current) return;
        held.current = false;
        record("up:seek");
      }}
      onKeyDown={onKeyDown}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: STAGE.width,
        height: STAGE.height,
        backgroundColor: "transparent",
        cursor: "pointer",
      }}
    />
  );

  const envelope =
    route === "bars" ? (
      Arr.map(Arr.range(0, BARS - 1), (index) => {
        const bar = barRect(index);
        return (
          <div
            key={index}
            testId={barTestId(index)}
            style={{
              position: "absolute",
              left: bar.x,
              top: bar.top,
              width: BAR_WIDTH,
              height: bar.height,
              backgroundColor: theme.colors.mutedForeground,
            }}
          />
        );
      })
    ) : (
      <img
        testId="media-envelope-image"
        src={envelopeDataUrl(theme.colors.mutedForeground)}
        alt=""
        style={{ width: STAGE.width, height: STAGE.height }}
      />
    );

  return (
    <div
      testId="media-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        width: 560,
        backgroundColor: theme.colors.background,
      }}
    >
      <Toolbar>
        <Pressable
          testId="media-plane"
          onClick={() => setPlane(nextPlane(plane))}
        >
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            {`plane ${plane}`}
          </text>
        </Pressable>
        <Pressable
          testId="media-route"
          onClick={() => setRoute(route === "bars" ? "image" : "bars")}
        >
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            {`route ${route}`}
          </text>
        </Pressable>
        <Pressable testId="media-back" onClick={() => moveBy(-5)}>
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            -5s
          </text>
        </Pressable>
        <Pressable testId="media-forward" onClick={() => moveBy(5)}>
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            +5s
          </text>
        </Pressable>
        <Pressable testId="media-reset" onClick={reset}>
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            reset
          </text>
        </Pressable>
      </Toolbar>

      <div
        ref={stageRef}
        testId="media-wave"
        role="group"
        aria-label="Audio waveform"
        style={{
          position: "relative",
          width: STAGE.width,
          height: STAGE.height,
          overflow: "hidden",
          // No border: the stage's bounds are the seek's coordinate origin, and
          // a border would inset every absolute child by its width (plan 520).
          backgroundColor: theme.colors.card,
        }}
      >
        {plane === "over" ? null : seekPlane}

        {/*
          Everything painted is one non-interactive layer. In `pass` mode it
          lets the press reach the plane underneath; in `under` mode it takes
          the press, which is the failing route this probe measures.
        */}
        <div
          testId="media-envelope-layer"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE.width,
            height: STAGE.height,
            pointerEvents: plane === "pass" ? "none" : undefined,
          }}
        >
          {envelope}

          {pos > 0 ? (
            <div
              testId="media-progress"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: xAt(pos),
                height: STAGE.height,
                backgroundColor: alpha(theme.colors.primary, PLAYED_ALPHA),
              }}
            />
          ) : null}

          <div
            testId="media-playhead"
            style={{
              position: "absolute",
              left: xAt(pos),
              top: 0,
              width: 2,
              height: STAGE.height,
              backgroundColor: theme.colors.foreground,
            }}
          />
        </div>

        {plane === "over" ? seekPlane : null}
      </div>

      <Readout testId="media-readout">
        {describeMedia(pos, plane, route)}
      </Readout>
      <Readout testId="media-log">{Arr.join(log, ">")}</Readout>
      <Readout testId="media-duration">{`duration=${DURATION}s`}</Readout>
    </div>
  );
};

/** A painted element's bounds, or a labelled failure naming the absent id. */
const boxOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} painted`,
    Option.map(Option.fromNullishOr(ctx.host.bounds(testId)), (bounds) => ({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })),
  );

/** One `key=value` field of the media readout, or `"none"`. */
const field = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "media-readout", key), () => "none");

/** A whole press/move/release at window coordinates, flushed for React. */
const dragFrom = (
  ctx: Smoke.SmokeContext,
  from: { readonly x: number; readonly y: number },
  deltaX: number,
): void => {
  ctx.host.pressWindow(from.x, from.y);
  ctx.host.movePointer(from.x + deltaX, from.y);
  ctx.host.releasePointer(from.x + deltaX, from.y);
  ctx.host.advance(0);
};

export const mediaScenario: PlaygroundScenario = {
  id: "media-surface",
  title: "Media surface: no player, a waveform envelope and a seek plane",
  capability: "media",
  view: () => <MediaProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const stage = yield* boxOf(ctx, "media-wave");
      const bar0 = yield* boxOf(ctx, "media-bar-0");
      const bar32 = yield* boxOf(ctx, "media-bar-32");
      const bar63 = yield* boxOf(ctx, "media-bar-63");

      // 1. The stage is the coordinate space; 64 bars bottom-align in it.
      yield* ctx.expectNear(
        "the wave stage is 480 wide",
        stage.width,
        480,
        0.5,
      );
      yield* ctx.expectNear("the wave stage is 96 tall", stage.height, 96, 0.5);
      yield* ctx.expectEqual(
        "a bar is a host div",
        elementTypeOf(ctx, "media-bar-32"),
        "div",
      );
      yield* ctx.expectNear(
        "bar 0 starts at the stage origin",
        bar0.x,
        stage.x,
        0.5,
      );
      yield* ctx.expectNear("bar 0 is 6 px wide", bar0.width, BAR_WIDTH, 0.5);
      yield* ctx.expectNear(
        "bar 0's height is the first amplitude",
        bar0.height,
        12,
        0.5,
      );
      yield* ctx.expectNear(
        "bar 0's bottom edge is the stage's",
        bar0.y + bar0.height,
        stage.y + STAGE.height,
        0.5,
      );
      yield* ctx.expectNear(
        "bar 63 sits on the last slot",
        bar63.x,
        stage.x + 472.5,
        0.5,
      );
      yield* ctx.expectEqual(
        "the initial readout names the plane, route and duration",
        read(ctx, "media-readout"),
        "pos=0 duration=120 plane=over route=bars",
      );
      yield* ctx.expectEqual(
        "no progress wash is painted at zero",
        ctx.host.bounds("media-progress") === null,
        true,
      );

      // 2. Pixels: the bars paint their token with a gap between them.
      yield* mediaEnvelopeChecks(
        ctx,
        readSync(ctx.host),
        yield* captureHeadless(ctx.host),
        bar0,
        bar32,
        palettes.dark.colors,
      );

      // 3. A press maps a stage x onto the clip: 120 px is 30 s.
      ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a press 120 px in seeks to 30 s",
        field(ctx, "pos"),
        "30",
      );
      const playhead = yield* boxOf(ctx, "media-playhead");
      yield* ctx.expectNear(
        "the playhead sits at the seek x",
        playhead.x - stage.x,
        120,
        0.5,
      );
      const wash = yield* boxOf(ctx, "media-progress");
      yield* ctx.expectNear(
        "the played wash starts at the left",
        wash.x,
        stage.x,
        0.5,
      );
      yield* ctx.expectNear(
        "the played wash is 120 px wide",
        wash.width,
        120,
        0.5,
      );

      // 4. Pixels: the wash covers the stage and the bars, and the playhead
      // paints its own column.
      yield* mediaPlayedChecks(
        ctx,
        readSync(ctx.host),
        yield* captureHeadless(ctx.host),
        stage,
        bar0,
        30,
        palettes.dark.colors,
      );

      // 5. A held drag keeps scrubbing: +60 px is +15 s. The reset clears the
      // press that step 3 logged, so this asserts one whole gesture.
      ctx.host.click("media-reset");
      ctx.host.advance(0);
      dragFrom(ctx, { x: stage.x + 120, y: stage.y + 48 }, 60);
      yield* ctx.expectEqual(
        "a held drag 60 px to the right seeks to 45 s",
        field(ctx, "pos"),
        "45",
      );
      const dragged = yield* boxOf(ctx, "media-playhead");
      yield* ctx.expectNear(
        "the playhead follows the drag",
        dragged.x - stage.x,
        180,
        0.5,
      );
      const draggedWash = yield* boxOf(ctx, "media-progress");
      yield* ctx.expectNear(
        "the wash follows the drag",
        draggedWash.width,
        180,
        0.5,
      );
      yield* ctx.expectEqual(
        "the gesture is down, move and up on the seek plane",
        read(ctx, "media-log"),
        "down:seek>move:seek>up:seek",
      );

      // 6. The pointer is clamped to the clip at both ends.
      dragFrom(ctx, { x: stage.x + 120, y: stage.y + 48 }, 2000);
      yield* ctx.expectEqual(
        "a drag past the right edge clamps at the end",
        field(ctx, "pos"),
        "120",
      );
      dragFrom(ctx, { x: stage.x + 400, y: stage.y + 48 }, -1200);
      yield* ctx.expectEqual(
        "a drag past the left edge clamps at zero",
        field(ctx, "pos"),
        "0",
      );

      // 7. Keyboard seeking is the same scale, through native focus.
      ctx.host.click("media-reset");
      ctx.host.advance(0);
      ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the seek plane takes native focus",
        focusedId(ctx),
        "media-seek",
      );
      ctx.host.key("right");
      ctx.host.advance(0);
      yield* ctx.expectEqual("right steps one second", field(ctx, "pos"), "31");
      ctx.host.key("shift-right");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "shift+right steps five seconds",
        field(ctx, "pos"),
        "36",
      );
      ctx.host.key("end");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "End seeks to the clip end",
        field(ctx, "pos"),
        "120",
      );
      ctx.host.key("right");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "right at the end is a clamped no-op",
        field(ctx, "pos"),
        "120",
      );
      ctx.host.key("home");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "Home seeks to the clip start",
        field(ctx, "pos"),
        "0",
      );
      ctx.host.key("left");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "left at the start is a clamped no-op",
        field(ctx, "pos"),
        "0",
      );

      // 8. The position is announced as a slider with an exact value.
      ctx.host.clickWindow(stage.x + 144, stage.y + 48);
      ctx.host.advance(0);
      const tree = yield* treeOf(ctx);
      const slider = yield* node(ctx, tree, "Slider", "Playback position");
      yield* ctx.expectEqual(
        "the slider's value is the position out of the duration",
        text(slider.value),
        "36s of 120s",
      );

      // 9. The transport buttons step and clamp like the keys.
      ctx.host.click("media-forward");
      ctx.host.advance(0);
      yield* ctx.expectEqual("+5 s adds five seconds", field(ctx, "pos"), "41");
      ctx.host.click("media-back");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "-5 s removes five seconds",
        field(ctx, "pos"),
        "36",
      );
      Arr.forEach(Arr.range(1, 8), () => ctx.host.click("media-back"));
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "repeated -5 s presses clamp at zero",
        field(ctx, "pos"),
        "0",
      );
      // A button click moves focus to that button, so seek with the plane
      // focused before the keyboard reaches the end.
      ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      ctx.host.advance(0);
      ctx.host.key("end");
      ctx.host.advance(0);
      ctx.host.click("media-forward");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "+5 s at the end clamps at the end",
        field(ctx, "pos"),
        "120",
      );

      // 10. The gesture's hit target: a plane under the painted layer loses it.
      ctx.host.click("media-reset");
      ctx.host.advance(0);
      ctx.host.click("media-plane");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a press cycles the plane under the envelope",
        field(ctx, "plane"),
        "under",
      );
      dragFrom(ctx, { x: stage.x + 120, y: stage.y + 48 }, 60);
      yield* ctx.expectEqual(
        "a press on the envelope does not scrub",
        field(ctx, "pos"),
        "0",
      );
      yield* ctx.expectEqual(
        "the envelope press reaches no seek handler",
        read(ctx, "media-log"),
        "",
      );
      ctx.host.click("media-plane");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a second press makes the envelope pass the pointer",
        field(ctx, "plane"),
        "pass",
      );
      dragFrom(ctx, { x: stage.x + 120, y: stage.y + 48 }, 60);
      yield* ctx.expectEqual(
        "a passing envelope lets the plane under it scrub",
        field(ctx, "pos"),
        "45",
      );
      ctx.host.click("media-plane");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a third press puts the plane back on top",
        field(ctx, "plane"),
        "over",
      );

      // 11. The static image route is one node; the bar route is 64.
      const bars = yield* ctx.expectSome(
        "the host reports retained elements",
        Option.fromNullishOr(ctx.host.retainedElements()),
      );
      ctx.host.click("media-route");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the route switches to one image",
        field(ctx, "route"),
        "image",
      );
      const image = yield* boxOf(ctx, "media-envelope-image");
      yield* ctx.expectNear(
        "the envelope image is 480 wide",
        image.width,
        480,
        0.5,
      );
      yield* ctx.expectNear(
        "the envelope image is 96 tall",
        image.height,
        96,
        0.5,
      );
      yield* ctx.expectEqual(
        "the image is an img host node",
        elementTypeOf(ctx, "media-envelope-image"),
        "img",
      );
      yield* ctx.expectEqual(
        "a valid data URL paints no image fallback",
        Arr.some(ctx.host.paintedText(), (line) =>
          line.includes("img: load failed"),
        ),
        false,
      );
      yield* ctx.expectEqual(
        "the bar nodes no longer exist in the image route",
        ctx.host.bounds("media-bar-0") === null,
        true,
      );
      const images = yield* ctx.expectSome(
        "the host still reports retained elements",
        Option.fromNullishOr(ctx.host.retainedElements()),
      );
      yield* ctx.expectEqual(
        "64 bars retain 63 more host nodes than one image",
        bars - images,
        BARS - 1,
      );

      // 12. Pixels: the image route paints the same envelope, and its
      // transparent slot shows the stage.
      yield* mediaImageChecks(
        ctx,
        readSync(ctx.host),
        yield* captureHeadless(ctx.host),
        image,
        palettes.dark.colors,
      );

      // 13. The seek is independent of the envelope's route.
      ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the image route still seeks to 30 s",
        field(ctx, "pos"),
        "30",
      );
      const imageWash = yield* boxOf(ctx, "media-progress");
      yield* ctx.expectNear(
        "the image route paints the same 120 px wash",
        imageWash.width,
        120,
        0.5,
      );
      ctx.host.click("media-route");
      ctx.host.advance(0);
      const restored = yield* ctx.expectSome(
        "the host reports retained elements after the route returns",
        Option.fromNullishOr(ctx.host.retainedElements()),
      );
      yield* ctx.expectEqual(
        "returning to the bars restores the same node count",
        restored,
        bars,
      );
    }),
};
