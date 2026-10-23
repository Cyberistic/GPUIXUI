/**
 * The `faded-hitbox-lifecycle` probe: what a box painted at `opacity: 0` still
 * does to the pointer and the keyboard.
 *
 * `opacity-paint` measured the paint of the share; this measures the hitbox the
 * same box keeps. That is the question the motion seam turns on: a leaving
 * surface fades to zero and `presenceStyle` has to guard its pointer path, and
 * a dismissed shell that keeps its controls mounted is covered by
 * `PresenceShield`. If the fade removed the hitbox those guards would be
 * ceremony; if it does not, a ghost swallows the press meant for the screen
 * behind it.
 *
 * The view and the steps live here rather than in `scenarios.tsx` so the
 * measurement is one module; the registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { palettes } from "../palettes.js";
import { captureScale, colourAt, differs, type Point } from "./frame.js";
import {
  FADED_HEIGHT,
  FADED_IDS,
  FADED_KEY,
  FADED_OPACITY,
  FADED_WIDTH,
  fadedReadout,
  type FadedPresses,
} from "./opacity-hit.js";

/** A press may arrive a frame after the input that moved the target. */
const SETTLE = Duration.millis(40);

/** The resting counters the readout starts from. */
const NO_PRESSES: FadedPresses = {
  faded: 0,
  keys: 0,
  cover: 0,
  target: 0,
  inertCover: 0,
  inertTarget: 0,
};

/** A control-shaped box a press can reach, with its own count. */
const PressTarget = ({
  testId,
  label,
  onPress,
  style,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly style?: Record<string, unknown>;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      onClick={onPress}
      style={{
        width: FADED_WIDTH,
        height: FADED_HEIGHT,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
        display: "flex" as const,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        ...style,
      }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        {label}
      </text>
    </div>
  );
};

/** A target with a transparent layer over it, the shape a leaving shell paints. */
const CoveredTarget = ({
  target,
  cover,
  label,
  inert,
  onTarget,
  onCover,
}: {
  readonly target: string;
  readonly cover: string;
  readonly label: string;
  readonly inert: boolean;
  readonly onTarget: () => void;
  readonly onCover: () => void;
}): ReactNode => (
  <div
    style={{
      position: "relative" as const,
      width: FADED_WIDTH,
      height: FADED_HEIGHT,
    }}
  >
    <PressTarget testId={target} label={label} onPress={onTarget} />
    <div
      testId={cover}
      onClick={onCover}
      style={{
        position: "absolute" as const,
        left: 0,
        top: 0,
        width: FADED_WIDTH,
        height: FADED_HEIGHT,
        opacity: FADED_OPACITY,
        ...(inert ? { pointerEvents: "none" as const } : {}),
      }}
    />
  </div>
);

/** The probe's window: a faded control and two covered targets. */
export const FadedHitboxProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [presses, setPresses] = useState<FadedPresses>(NO_PRESSES);
  const count = (field: keyof FadedPresses): void =>
    setPresses((held) => ({ ...held, [field]: held[field] + 1 }));

  return (
    <div
      testId={FADED_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex" as const,
        flexDirection: "column" as const,
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A box at opacity zero paints nothing: does it still take the press, the
        key and the Tab stop?
      </text>
      <PressTarget
        testId={FADED_IDS.before}
        label="Before the faded control"
        onPress={() => {}}
      />
      <div
        testId={FADED_IDS.control}
        tabIndex={0}
        role="button"
        onClick={() => count("faded")}
        onKeyDown={() => count("keys")}
        style={{
          width: FADED_WIDTH,
          height: FADED_HEIGHT,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
          display: "flex" as const,
          flexDirection: "row" as const,
          alignItems: "center" as const,
          opacity: FADED_OPACITY,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          Faded control
        </text>
      </div>
      <CoveredTarget
        target={FADED_IDS.coveredTarget}
        cover={FADED_IDS.cover}
        label="Covered target"
        inert={false}
        onTarget={() => count("target")}
        onCover={() => count("cover")}
      />
      <CoveredTarget
        target={FADED_IDS.inertTarget}
        cover={FADED_IDS.inertCover}
        label="Target under an inert cover"
        inert
        onTarget={() => count("inertTarget")}
        onCover={() => count("inertCover")}
      />
      <text
        testId={FADED_IDS.readout}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {fadedReadout(presses)}
      </text>
    </div>
  );
};

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** The colour at a logical point of a capture, failing by name if outside. */
const sampleAt = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(label, colourAt(frame, point, scale));

/** Whether `sample` is the paint `expected` within the frame's tolerance. */
const expectPaint = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  sample: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, differs(sample, expected), false);

/** A box's centre, which is inside the control and clear of its label. */
const centreOf = (box: Smoke.Bounds): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/** A point past the label a target paints at its left edge. */
const paintPointOf = (box: Smoke.Bounds): Point => ({
  x: box.x + box.width * 0.8,
  y: box.y + box.height / 2,
});

export const fadedHitboxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FADED_IDS.probe);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("faded-hitbox");

    const page = yield* ctx.expectSome(
      "the theme names the page fill",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.background)),
    );
    const fill = yield* ctx.expectSome(
      "the theme names the control's own fill",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.muted)),
    );
    const frame = yield* ctx.host.pixels("faded-hitbox");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    // 1. The fade removes the ink, not the box: it still lays out at its own
    //    size and paints the page where its fill would be.
    const faded = yield* ctx.expectSome(
      "the faded control still reports a laid-out box",
      Option.fromNullishOr(yield* ctx.host.bounds(FADED_IDS.control)),
    );
    yield* ctx.expectNear(
      "the faded control keeps the width it was built at",
      faded.width,
      FADED_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the faded control keeps the height it was built at",
      faded.height,
      FADED_HEIGHT,
      1,
    );
    yield* expectPaint(
      ctx,
      "the faded control paints the page at its centre",
      yield* sampleAt(
        ctx,
        frame,
        centreOf(faded),
        scale,
        "the frame holds the faded control's box",
      ),
      page,
    );

    // 2. The Tab traversal still visits it: a fade removes neither the stop nor
    //    the focus. This is the order the probe is built in.
    yield* ctx.host.focusElement(FADED_IDS.before);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab reaches the faded control",
      yield* focusedId(ctx),
      FADED_IDS.control,
    );

    // 3. A press and a key reach it while it holds the focus.
    yield* ctx.host.click(FADED_IDS.control);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press at the faded control reaches it",
      yield* ctx.host.text(FADED_IDS.readout),
      "faded=1",
    );
    yield* ctx.host.focusElement(FADED_IDS.control);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key(FADED_KEY);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a key typed at the faded control reaches it",
      yield* ctx.host.text(FADED_IDS.readout),
      "keys=1",
    );

    // 4. The transparent cover is still in the pointer's path: the press lands on
    //    it and the target behind keeps its count, while the target's fill is
    //    what the reader sees through the cover.
    const coverBox = yield* ctx.expectSome(
      "the transparent cover reports the target's box",
      Option.fromNullishOr(yield* ctx.host.bounds(FADED_IDS.cover)),
    );
    yield* expectPaint(
      ctx,
      "the target's fill paints through the transparent cover",
      yield* sampleAt(
        ctx,
        frame,
        paintPointOf(coverBox),
        scale,
        "the frame holds the transparent cover's box",
      ),
      fill,
    );
    yield* ctx.host.click(FADED_IDS.coveredTarget);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the transparent cover takes the press",
      yield* ctx.host.text(FADED_IDS.readout),
      "cover=1 target=0",
    );

    // 5. The opt-out the library's shields declare: the press reaches the target
    //    under the cover. The cover's own handler still runs — opting out removes
    //    the fill's hitbox, not the handler (the rule `hover-routing-lifecycle`
    //    measured for hover).
    const inertBox = yield* ctx.expectSome(
      "the inert cover reports the target's box",
      Option.fromNullishOr(yield* ctx.host.bounds(FADED_IDS.inertTarget)),
    );
    yield* expectPaint(
      ctx,
      "the target's fill paints under the inert cover",
      yield* sampleAt(
        ctx,
        frame,
        paintPointOf(inertBox),
        scale,
        "the frame holds the inert cover's box",
      ),
      fill,
    );
    yield* ctx.host.click(FADED_IDS.inertTarget);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the inert cover lets the press through to its target",
      yield* ctx.host.text(FADED_IDS.readout),
      "inertCover=1 inertTarget=1",
    );
    yield* ctx.host.capture("faded-hitbox-pressed");
  });
