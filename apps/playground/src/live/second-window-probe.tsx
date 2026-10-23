/**
 * The `second-window-lifecycle` probe: what happens when a running application
 * asks the binding for a second window.
 *
 * Tier 4's *detachable tabs* and the cross-window half of drag-and-drop rest on
 * "the binding opens one window per process", a sentence five documents state
 * and none cites. This probe makes the attempt where an application would — a
 * second renderer's `init()`, the only published verb that opens a window —
 * while its own window is running, and then proves the first window still
 * paints and still takes a press.
 *
 * The view and the steps live here rather than in `scenarios.tsx` so the
 * measurement is one module; the registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { GpuixRenderer } from "@gpuix/react";
import { useWindowSize } from "@gpuix/react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import {
  NO_SECOND_WINDOW,
  SECOND_WINDOW_IDS,
  SECOND_WINDOW_MARKER,
  SECOND_WINDOW_REFUSAL,
  SECOND_WINDOW_SIZE,
  SECOND_WINDOW_TITLE,
  recordMarkerPress,
  recordSecondWindowAttempt,
  secondWindowOutcome,
  secondWindowReadout,
  type SecondWindowTally,
} from "./second-window.js";

/** A press may arrive a frame after the input that moved the target. */
const SETTLE = Duration.millis(40);

/** The capture the paint check reads. */
const CAPTURE = "second-window";

/** The running window's marker, painted in the literal the check counts. */
const MARKER_SIZE = 40;

/** The probe's window: an attempt, the running window's marker and the readout. */
export const SecondWindowProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [tally, setTally] = useState<SecondWindowTally>(NO_SECOND_WINDOW);

  // The press handler is the boundary: `init` is an imperative native call that
  // may throw, and there is no Effect runtime inside a render, so the answer is
  // captured as the readout the steps assert on.
  const attempt = (): void => {
    const second = new GpuixRenderer();
    const answer = Effect.runSync(
      secondWindowOutcome({
        init: () =>
          second.init({
            title: SECOND_WINDOW_TITLE,
            width: SECOND_WINDOW_SIZE.width,
            height: SECOND_WINDOW_SIZE.height,
          }),
        isInitialized: () => second.isInitialized(),
      }),
    );
    setTally((held) => recordSecondWindowAttempt(held, answer));
  };

  return (
    <div
      testId={SECOND_WINDOW_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex" as const,
        flexDirection: "column" as const,
        alignItems: "flex-start" as const,
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        One window is open. Ask the binding for a second one.
      </text>
      <div
        testId={SECOND_WINDOW_IDS.attempt}
        role="button"
        tabIndex={0}
        onClick={attempt}
        style={{
          height: theme.density.controlHeight.md,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.primary,
          display: "flex" as const,
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.primaryForeground,
          }}
        >
          Open a second window
        </text>
      </div>
      <div
        testId={SECOND_WINDOW_IDS.marker}
        role="button"
        tabIndex={0}
        onClick={() => setTally(recordMarkerPress)}
        style={{
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          backgroundColor: SECOND_WINDOW_MARKER,
        }}
      />
      <text
        testId={SECOND_WINDOW_IDS.readout}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {secondWindowReadout(tally)}
      </text>
    </div>
  );
};

export const secondWindowSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SECOND_WINDOW_IDS.probe);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the probe starts without an attempt",
      yield* ctx.host.text(SECOND_WINDOW_IDS.readout),
      "attempts=0 refused=0 opened=0",
    );

    yield* ctx.host.click(SECOND_WINDOW_IDS.attempt);
    yield* Effect.sleep(SETTLE);
    const first = yield* ctx.host.text(SECOND_WINDOW_IDS.readout);
    yield* ctx.expectContains(
      "the second window is refused before it opens",
      first,
      "attempts=1 refused=1 opened=0 started=false",
    );
    yield* ctx.expectContains(
      "the refusal names the application already running on the thread",
      first,
      SECOND_WINDOW_REFUSAL,
    );

    // A refusal that only happened once would be an artefact of the first call;
    // the rule is that no attempt opens a window while one is running.
    yield* ctx.host.click(SECOND_WINDOW_IDS.attempt);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a second attempt is refused the same way",
      yield* ctx.host.text(SECOND_WINDOW_IDS.readout),
      "attempts=2 refused=2 opened=0 started=false",
    );

    // The application is unharmed: its own window still reports a size, paints
    // its own content and hears a press after both refusals.
    const window = yield* ctx.host.windowSize();
    yield* ctx.expectEqual(
      "the running window still reports a paintable size",
      window.width > 0 && window.height > 0,
      true,
    );
    yield* ctx.host.capture(CAPTURE);
    const frame = yield* ctx.host.pixels(CAPTURE);
    const marker = yield* ctx.expectSome(
      "the marker names a colour a frame can carry",
      Option.fromNullishOr(Pixels.hexToRgba(SECOND_WINDOW_MARKER)),
    );
    yield* ctx.expectEqual(
      "the running window still paints its own content",
      Pixels.countColour(frame, marker) > 0,
      true,
    );
    yield* ctx.host.click(SECOND_WINDOW_IDS.marker);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the running window still takes a press",
      yield* ctx.host.text(SECOND_WINDOW_IDS.readout),
      "after=1",
    );
    yield* ctx.host.capture(`${CAPTURE}-pressed`);
  });
