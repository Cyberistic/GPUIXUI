/**
 * The `typing-text-lifecycle` probe: what the shipped `TypingText` really
 * paints in a window.
 *
 * The catalogue's *Typing text* row claims the reveal is a timer over the
 * characters the string has, that a character is a **code point** (so an emoji
 * is never split), that `speed={0}` and the reduced preference paint the whole
 * string on the first frame, and that a caret sits after the run until the last
 * character lands. The component's renderer suite reads its text nodes; this
 * probe reads what the **runtime shaped** — the painted lines the renderer
 * reports — and the caret's own pixels.
 *
 * The reveal is a real-time timer, deliberately: the row notes that a paused
 * motion clock does not hold it, so the frames here are **found by polling**,
 * not by freezing anything.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { MotionProvider, TypingText } from "@gpuixui/components";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { type ReactNode } from "react";
import { palettes } from "../palettes.js";
import { captureScale } from "./frame.js";
import { settleUntil } from "./settle.js";
import {
  allPrefixes,
  isCodePointPrefix,
  partialLines,
  sawPartial,
  TYPING_IDS,
  TYPING_POLL_MS,
  TYPING_SAMPLES,
  TYPING_SPEED,
  TYPING_TEXT,
  wholeLines,
} from "./typing-text.js";

/** The palette the live runner provides every probe. */
const THEME: Theme = palettes.dark;

/** Where a reader looks: the caret while typing, and the run once it is whole. */
const TYPING = "typing-caret";
const DONE = "typing-done";

/** The view: a slow reveal with a caret, an instant one, an emoji one, a reduced one. */
export const TypingTextProbe = (): ReactNode => {
  const window = useWindowSize();
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  };
  return (
    <div
      testId={TYPING_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: THEME.spacing.xl,
        backgroundColor: THEME.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: THEME.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(THEME, "body"), color: THEME.colors.foreground }}
      >
        A reveal runs on a real-time timer: the runtime shapes only the
        characters that have arrived, and the caret beside them leaves when the
        last one lands.
      </text>
      <div style={row}>
        <TypingText
          testId={TYPING_IDS.slow}
          text={TYPING_TEXT.slow}
          speed={TYPING_SPEED.slowMs}
          caret
        />
      </div>
      <div style={row}>
        <TypingText
          testId={TYPING_IDS.instant}
          text={TYPING_TEXT.instant}
          speed={0}
        />
      </div>
      <div style={row}>
        <TypingText
          testId={TYPING_IDS.emoji}
          text={TYPING_TEXT.emoji}
          speed={TYPING_SPEED.emojiMs}
        />
      </div>
      <div style={row}>
        <MotionProvider preference="reduced">
          <TypingText
            testId={TYPING_IDS.reduced}
            text={TYPING_TEXT.reduced}
            speed={TYPING_SPEED.slowMs}
          />
        </MotionProvider>
      </div>
    </div>
  );
};

/** The probe's steps: the first frames, the caret, the emoji, the whole run. */
export const typingTextSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(TYPING_IDS.probe);
    // No settle: the reveal is real time, so a sleep here would eat the frames.

    /** The box `testId` paints, failing by name when it paints nothing. */
    const box = (
      testId: string,
    ): Effect.Effect<
      {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
      },
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the runtime paints ${testId}`,
          Option.fromNullishOr(yield* ctx.host.bounds(testId)),
        );
      });

    /** Captures `name` and hands back the frame with its device scale. */
    const captureFrame = (
      name: string,
    ): Effect.Effect<
      { readonly frame: Pixels.Pixels; readonly scale: number },
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const frame = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        const scale = yield* ctx.expectSome(
          `the ${name} capture is the window at a whole device scale`,
          captureScale(frame, size),
        );
        return { frame, scale };
      });

    /** How many pixels of the theme's `primary` role a box paints. */
    const caretPaint = (
      captured: { readonly frame: Pixels.Pixels; readonly scale: number },
      at: {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
      },
    ): Effect.Effect<
      number,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        const ink = yield* ctx.expectSome(
          "the theme's primary role is a colour it ships",
          Option.fromNullishOr(Pixels.hexToRgba(THEME.colors.primary)),
        );
        const crop = yield* ctx.expectSome(
          "the text's box lies inside the capture",
          Option.fromNullishOr(
            Pixels.crop(
              captured.frame,
              new Pixels.PixelRegion({
                x: Math.round(at.x * captured.scale),
                y: Math.round(at.y * captured.scale),
                width: Math.round(at.width * captured.scale),
                height: Math.round(at.height * captured.scale),
              }),
            ),
          ),
        );
        return Pixels.countColour(crop, ink);
      });

    const slow = yield* box(TYPING_IDS.slow);
    yield* box(TYPING_IDS.instant);
    yield* box(TYPING_IDS.reduced);
    yield* box(TYPING_IDS.emoji);

    // ── The two frames that paint the whole string at once ──────────────────
    yield* ctx.expectEqual(
      "a zero-speed reveal paints its whole string on the first frame",
      yield* ctx.host.text(TYPING_IDS.instant),
      TYPING_TEXT.instant,
    );
    yield* ctx.expectEqual(
      "a reduced preference paints its whole string on the first frame",
      yield* ctx.host.text(TYPING_IDS.reduced),
      TYPING_TEXT.reduced,
    );

    // ── The slow reveal: a partial run, and a caret beside it ───────────────
    const first = yield* ctx.host.text(TYPING_IDS.slow);
    yield* ctx.expectEqual(
      "the slow reveal has not painted the whole string yet",
      first !== TYPING_TEXT.slow && isCodePointPrefix(first, TYPING_TEXT.slow),
      true,
    );
    const caretFrame = yield* captureFrame(TYPING);
    const caret = yield* caretPaint(caretFrame, slow);
    yield* ctx.expectEqual(
      "the caret paints the theme's primary role while the reveal runs",
      caret > 0,
      true,
    );
    const earlyLines = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the renderer paints the partial run rather than the whole string",
      partialLines(earlyLines, TYPING_TEXT.slow) >= 1,
      true,
    );
    const second = yield* ctx.host.text(TYPING_IDS.slow);
    yield* ctx.expectEqual(
      "a later read is a longer prefix of the same string",
      isCodePointPrefix(second, TYPING_TEXT.slow) &&
        second.length >= first.length &&
        second !== TYPING_TEXT.slow,
      true,
    );

    // ── The emoji reveal: every frame is a whole code point ─────────────────
    const samples = yield* Effect.forEach(
      Arr.range(1, TYPING_SAMPLES),
      () =>
        Effect.gen(function* () {
          const read = yield* ctx.host.text(TYPING_IDS.emoji);
          yield* Effect.sleep(Duration.millis(TYPING_POLL_MS));
          return read;
        }),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "every frame of the emoji reveal is a code-point prefix",
      allPrefixes(samples, TYPING_TEXT.emoji),
      true,
    );
    yield* ctx.expectEqual(
      "the emoji reveal was seen mid-way, not only whole",
      sawPartial(samples, TYPING_TEXT.emoji),
      true,
    );

    // ── The end: the whole line, and no caret ───────────────────────────────
    const whole = yield* settleUntil(
      ctx.host.text(TYPING_IDS.slow),
      (line) => line === TYPING_TEXT.slow,
      80,
    );
    yield* ctx.expectEqual(
      "the last character lands as the whole string",
      whole,
      TYPING_TEXT.slow,
    );
    const emoji = yield* settleUntil(
      ctx.host.text(TYPING_IDS.emoji),
      (line) => line === TYPING_TEXT.emoji,
      80,
    );
    yield* ctx.expectEqual(
      "the emoji reveal completes as the three code points it was given",
      emoji,
      TYPING_TEXT.emoji,
    );
    const doneLines = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the completed run is one painted line",
      wholeLines(doneLines, TYPING_TEXT.slow),
      1,
    );
    yield* ctx.expectEqual(
      "no partial run is left painted once the string is whole",
      partialLines(doneLines, TYPING_TEXT.slow),
      0,
    );
    const doneFrame = yield* captureFrame(DONE);
    yield* ctx.expectEqual(
      "the caret leaves once the last character lands",
      yield* caretPaint(doneFrame, slow),
      0,
    );
  });
