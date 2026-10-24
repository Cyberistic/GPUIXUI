/**
 * `log-viewer-lifecycle`: the shipped `@gpuixui/files` `LogViewer` in a window.
 *
 * The headless `log-viewer` scenario measured the runtime's virtual list —
 * `alignment="bottom"` plus `followTail` — around a probe-local list. This
 * probe mounts the **component** the Tier 4 *Log viewers* row ships: its
 * toolbar, its level filter and its controlled `followTail`/`enabledLevels`
 * props, over 240 lines of ten 24-point rows in a 240-point viewport.
 *
 * What a window alone answers: whether the tail is the row on screen, whether an
 * append follows it, whether a reader who wheels up is left where they stopped,
 * and whether the follow flag is a hold, a jump or both — the headless probe
 * inferred "app state plus a scroll", and this one reads the shipped toggle.
 *
 * Every check is a `ctx.expect*` at the step that makes it — the helpers only
 * read — so the count the README prints is the number of assertion sites.
 *
 * Captures: `log-viewer-tail`.
 */

import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { LogViewer } from "@gpuixui/files";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Readout } from "../ui.js";
import {
  LOG_AFTER_FIRST_APPEND,
  LOG_AFTER_SECOND_APPEND,
  LOG_AFTER_THIRD_APPEND,
  LOG_APPEND,
  LOG_ERRORS_ONLY,
  LOG_IDS,
  LOG_LINES,
  LOG_REST,
  LOG_ROW_HEIGHT,
  LOG_VIEWPORT,
  logLines,
  logMessage,
  logReadout,
  type LogState,
} from "./log-viewer.js";
import { settleUntil } from "./settle.js";

/** The one capture: the tail the run leaves on screen. */
const CAPTURE = "log-viewer-tail";

const CAPTION =
  "The shipped LogViewer: the tail is the row on screen, an append follows it, a reader who wheels up is left where they stopped, and the level filter narrows the rows.";

/** The view: the shipped viewer over its own controls and a readout. */
export const LogViewerProbe = (): ReactNode => {
  const theme = useTheme();
  const [state, setState] = useState<LogState>(LOG_REST);
  const lines = useMemo(() => logLines(state.lines), [state.lines]);
  const append = (): void =>
    setState((current) => ({ ...current, lines: current.lines + LOG_APPEND }));
  return (
    <div
      testId={LOG_IDS.viewer}
      style={{
        width: 620,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {CAPTION}
      </text>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Pressable testId={LOG_IDS.append} onClick={append}>
          <text style={{ color: theme.colors.foreground }}>Append 40</text>
        </Pressable>
        <Pressable
          testId={LOG_IDS.follow}
          onClick={() =>
            setState((current) => ({ ...current, follow: !current.follow }))
          }
        >
          <text style={{ color: theme.colors.foreground }}>
            {state.follow ? "Follow: on" : "Follow: off"}
          </text>
        </Pressable>
        <Pressable
          testId={LOG_IDS.errors}
          onClick={() =>
            setState((current) => ({ ...current, levels: LOG_ERRORS_ONLY }))
          }
        >
          <text style={{ color: theme.colors.foreground }}>Errors only</text>
        </Pressable>
        <Pressable
          testId={LOG_IDS.all}
          onClick={() =>
            setState((current) => ({ ...current, levels: LOG_REST.levels }))
          }
        >
          <text style={{ color: theme.colors.foreground }}>All levels</text>
        </Pressable>
      </div>
      <div testId={LOG_IDS.frame} style={{ display: "flex" }}>
        <LogViewer
          lines={lines}
          height={LOG_VIEWPORT}
          rowHeight={LOG_ROW_HEIGHT}
          followTail={state.follow}
          onFollowTailChange={(follow) =>
            setState((current) => ({ ...current, follow }))
          }
          enabledLevels={state.levels}
          onEnabledLevelsChange={(levels) =>
            setState((current) => ({ ...current, levels }))
          }
          testId={LOG_IDS.list}
        />
      </div>
      <Readout testId={LOG_IDS.readout}>{logReadout(state)}</Readout>
    </div>
  );
};

/** The probe's steps: the tail, the reader's wheel, the toggle and the filter. */
export const logViewerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(LOG_IDS.viewer);
    // A capture stalls the animation clock and the list anchors on its first
    // measurement, so the rest state is read once the mount has painted.
    yield* Effect.sleep(Duration.millis(400));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    /** Whether a row's message is painted in the last frame. */
    const painted = (
      label: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.paintedText(), (lines) =>
        lines.some((line) => line === label),
      );

    /** The readout once it names `expected`, which a press reports a frame later. */
    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(LOG_IDS.readout), (line) =>
        line.includes(expected),
      );

    /** The row the list is anchored at: the first row of the painted window. */
    const anchor = (): Effect.Effect<number, Failure> =>
      Effect.gen(function* () {
        const read = yield* ctx.expectSome(
          "the log paints a virtual-list anchor",
          Option.fromNullishOr(yield* ctx.host.listAnchor(LOG_IDS.list)),
        );
        return read.itemIndex;
      });

    /** A row's painted state once it stops changing, so a tween cannot race it. */
    const settled = (
      label: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      settleUntil(painted(label), (isPainted) => isPainted);

    /** An absence a step waits for, so a retired row cannot pass as unpainted. */
    const retired = (
      label: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(
        settleUntil(painted(label), (isPainted) => !isPainted),
        (isPainted) => !isPainted,
      );

    /** The viewer's own text: its toolbar and the rows the list paints. */
    const viewerText = (): Effect.Effect<string, Smoke.SmokeHostError> =>
      ctx.host.text(LOG_IDS.viewer);

    // ── At rest: the tail is the last row, and the toolbar paints ───────────
    yield* ctx.expectContains(
      "the readout reports the lines it was handed and the tail it follows",
      yield* readout(logReadout(LOG_REST)),
      logReadout(LOG_REST),
    );
    yield* ctx.expectEqual(
      "the list starts at the tail",
      yield* settled(logMessage(LOG_LINES - 1)),
      true,
    );
    yield* ctx.expectEqual(
      "the head is outside the painted window",
      yield* painted(logMessage(0)),
      false,
    );
    yield* ctx.expectContains(
      "the component's own toolbar paints its follow control",
      yield* viewerText(),
      "Follow tail",
    );
    yield* ctx.expectContains(
      "every level the filter offers paints",
      yield* viewerText(),
      "Trace",
    );
    const rest = yield* ctx.expectSome(
      "the list reports the anchor a virtual list holds",
      Option.fromNullishOr(yield* ctx.host.listAnchor(LOG_IDS.list)),
    );
    yield* ctx.expectEqual(
      "the viewer gives its list the definite viewport it was asked for",
      rest.viewportHeight,
      LOG_VIEWPORT,
    );
    const restAnchor = rest.itemIndex;

    // ── An append at the tail follows it ────────────────────────────────────
    yield* ctx.host.click(LOG_IDS.append);
    yield* ctx.expectContains(
      "an append reaches the viewer",
      yield* readout(logReadout(LOG_AFTER_FIRST_APPEND)),
      logReadout(LOG_AFTER_FIRST_APPEND),
    );
    yield* ctx.expectEqual(
      "the new tail is the row on screen",
      yield* settled(logMessage(LOG_LINES + LOG_APPEND - 1)),
      true,
    );
    yield* ctx.expectEqual(
      "the row that was the tail scrolled out of the window",
      yield* retired(logMessage(LOG_LINES - 1)),
      true,
    );
    const followedAnchor = yield* anchor();
    yield* ctx.expectEqual(
      "the anchor moved with the tail",
      followedAnchor > restAnchor,
      true,
    );

    // ── A reader who wheels up leaves the tail and stays there ──────────────
    // The runtime's wheel scrolls down on a negative `deltaY`, so the reader
    // moves towards the head — away from the tail — with a positive one.
    yield* ctx.host.wheel(LOG_IDS.frame, 0, LOG_VIEWPORT);
    const scrolledAnchor = yield* settleUntil(
      anchor(),
      (index) => index < followedAnchor,
    );
    yield* ctx.expectEqual(
      "a wheel up moves the anchor towards the head",
      scrolledAnchor < followedAnchor,
      true,
    );
    yield* ctx.expectEqual(
      "the row the wheel pushed out of the window stops painting",
      yield* retired(logMessage(LOG_LINES + LOG_APPEND - 1)),
      true,
    );
    yield* ctx.expectEqual(
      "the row the wheel revealed paints",
      yield* settled(logMessage(LOG_LINES + LOG_APPEND - 1 - 10)),
      true,
    );

    yield* ctx.host.click(LOG_IDS.append);
    yield* ctx.expectContains(
      "an append by a scrolled-up reader still reaches the viewer",
      yield* readout(logReadout(LOG_AFTER_SECOND_APPEND)),
      logReadout(LOG_AFTER_SECOND_APPEND),
    );
    yield* ctx.expectEqual(
      "the new tail does not paint itself over the reader",
      yield* retired(logMessage(LOG_LINES + LOG_APPEND * 2 - 1)),
      true,
    );
    yield* ctx.expectEqual(
      "the anchor is exactly where the reader left it",
      yield* anchor(),
      scrolledAnchor,
    );

    // ── The flag off: appends may not move the reader at all ────────────────
    yield* ctx.host.click(LOG_IDS.follow);
    yield* ctx.expectContains(
      "the toggle reports the follow flag it turned off",
      yield* readout(logReadout({ ...LOG_AFTER_SECOND_APPEND, follow: false })),
      logReadout({ ...LOG_AFTER_SECOND_APPEND, follow: false }),
    );
    yield* ctx.host.click(LOG_IDS.append);
    yield* ctx.expectContains(
      "an append with the flag off reaches the viewer",
      yield* readout(logReadout({ ...LOG_AFTER_THIRD_APPEND, follow: false })),
      logReadout({ ...LOG_AFTER_THIRD_APPEND, follow: false }),
    );
    yield* ctx.expectEqual(
      "no arriving row paints with the flag off",
      yield* retired(logMessage(LOG_LINES + LOG_APPEND * 3 - 1)),
      true,
    );
    yield* ctx.expectEqual(
      "the anchor did not move with the flag off",
      yield* anchor(),
      scrolledAnchor,
    );

    // ── The flag on returns the reader to the tail, and keeps them there ────
    yield* ctx.host.click(LOG_IDS.follow);
    yield* ctx.expectContains(
      "the toggle reports the follow flag it turned on",
      yield* readout(logReadout(LOG_AFTER_THIRD_APPEND)),
      logReadout(LOG_AFTER_THIRD_APPEND),
    );
    yield* ctx.expectEqual(
      "turning the flag on paints the tail the reader left",
      yield* settled(logMessage(LOG_AFTER_THIRD_APPEND.lines - 1)),
      true,
    );
    yield* ctx.expectNear(
      "turning the flag on anchors the list at the tail",
      yield* anchor(),
      LOG_AFTER_THIRD_APPEND.lines - 1,
      10,
    );
    yield* ctx.host.click(LOG_IDS.append);
    yield* ctx.expectEqual(
      "the next append follows the tail the flag holds",
      yield* settled(logMessage(LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND - 1)),
      true,
    );

    // ── The level filter narrows the rows to the level it was given ─────────
    yield* ctx.host.click(LOG_IDS.errors);
    yield* ctx.expectContains(
      "the readout reports the one level the filter keeps",
      yield* readout(
        logReadout({
          ...LOG_AFTER_THIRD_APPEND,
          lines: LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND,
          levels: LOG_ERRORS_ONLY,
        }),
      ),
      "levels=error",
    );
    yield* ctx.expectEqual(
      "the newest row of the kept level paints",
      yield* settled(logMessage(LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND - 5)),
      true,
    );
    yield* ctx.expectEqual(
      "a row of a level the filter dropped does not paint",
      yield* retired(logMessage(LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND - 1)),
      true,
    );

    yield* ctx.host.click(LOG_IDS.all);
    yield* ctx.expectContains(
      "the readout reports every level restored",
      yield* readout(
        logReadout({
          ...LOG_AFTER_THIRD_APPEND,
          lines: LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND,
        }),
      ),
      "levels=all",
    );
    yield* ctx.expectEqual(
      "the newest line paints again",
      yield* settled(logMessage(LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND - 1)),
      true,
    );

    // Captures come last: a screenshot stalls the animation clock.
    yield* ctx.host.capture(CAPTURE);
  });
