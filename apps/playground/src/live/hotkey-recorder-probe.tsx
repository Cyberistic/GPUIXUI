/**
 * The `hotkey-recorder-lifecycle` probe: the shipped `HotkeyRecorder` driven by
 * a real window.
 *
 * The recorder's page states the contract that a recorded key is **swallowed**,
 * so the application's own binding does not fire. Its suite reads the
 * renderer's tree, where `preventDefault` is a declaration; only a window says
 * what the runtime does with the key afterwards, because the app-level handler
 * is installed on the window root and runs after the focused element. This
 * probe answers that, and the rest of the recorder's window contract with it:
 * a press arms it, a modifier on its own is not a chord, the captured chord is
 * stored in its canonical form and painted as platform glyphs, Escape cancels,
 * the clear control reports `null` without arming, Space is a chord rather than
 * an activation, and a disabled recorder is refused on both routes and skipped
 * by the tab walk.
 *
 * Every check is a `ctx.expect*` at the step that makes it — the helpers only
 * read — so the count the README prints is the number of assertion sites.
 *
 * Captures: `hotkey-armed` and `hotkey-bound`.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { HotkeyRecorder } from "@gpuixui/components";
import type { Smoke } from "@gpuixui/testing";
import { currentPlatform, textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-handlers.js";
import {
  capturedChord,
  HOTKEY_CAPTURES,
  HOTKEY_IDS,
  HOTKEY_KEYCAPS,
  HOTKEY_KEYS,
  HOTKEY_PLACEHOLDER,
  HOTKEY_RECORDING,
  hotkeyClearId,
  hotkeyOffReadout,
  hotkeyReadout,
  paintsKeycaps,
  SPACE_CHORD,
  windowKeyLog,
  windowSaw,
} from "./hotkey-recorder.js";

/** An input and the state it produces need a frame to commit. */
const SETTLE = Duration.millis(60);

/** The width the enabled recorder is laid out at. */
const RECORDER_WIDTH = 360;

/** The plain control the tab walk must land on after the disabled twin. */
const PlainControl = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={HOTKEY_IDS.plain}
      role="button"
      tabIndex={0}
      style={{
        width: RECORDER_WIDTH,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
      }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        plain
      </text>
    </div>
  );
};

export const HotkeyRecorderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState<string | null>(null);
  const [reports, setReports] = useState(0);
  const [offReports, setOffReports] = useState(0);
  const [keys, setKeys] = useState<ReadonlyArray<string>>([]);

  useWindowKey((event) => {
    if (event.key === undefined) return;
    setKeys((seen) => Arr.append(seen, event.key ?? "none"));
  });

  return (
    <div
      testId={HOTKEY_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A recorder in a window: the chord the runtime delivers, the glyphs the
        stored value paints, and whether the application still hears the key.
      </text>
      <div style={{ width: RECORDER_WIDTH }}>
        <HotkeyRecorder
          testId={HOTKEY_IDS.recorder}
          label="Toggle command palette"
          value={value}
          onChange={(next) => {
            setValue(next);
            setReports((count) => count + 1);
          }}
        />
      </div>
      <Readout testId={HOTKEY_IDS.readout}>
        {hotkeyReadout(value, reports)}
      </Readout>
      <div style={{ width: RECORDER_WIDTH }}>
        <HotkeyRecorder
          testId={HOTKEY_IDS.off}
          label="Disabled recorder"
          value={null}
          disabled
          onChange={() => setOffReports((count) => count + 1)}
        />
      </div>
      <Readout testId={HOTKEY_IDS.offReadout}>
        {hotkeyOffReadout(offReports)}
      </Readout>
      <PlainControl />
      <Readout testId={HOTKEY_IDS.windowLog}>{windowKeyLog(keys)}</Readout>
    </div>
  );
};

export const hotkeyRecorderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(HOTKEY_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const recorderText = () => ctx.host.text(HOTKEY_IDS.recorder);
    const offText = () => ctx.host.text(HOTKEY_IDS.off);
    const readout = () => ctx.host.text(HOTKEY_IDS.readout);
    const offReadout = () => ctx.host.text(HOTKEY_IDS.offReadout);
    const windowLog = () => ctx.host.text(HOTKEY_IDS.windowLog);
    const focused = () =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    const keyDown = yield* ctx.expectSome(
      "the window exposes a key down",
      Option.fromNullishOr(ctx.host.keyDown),
    );
    const down = (keystroke: string) =>
      Effect.flatMap(keyDown(keystroke, false), () => Effect.sleep(SETTLE));
    const up = (keystroke: string) =>
      Effect.flatMap(ctx.host.keyUp(keystroke), () => Effect.sleep(SETTLE));
    const click = (testId: string) =>
      Effect.flatMap(ctx.host.click(testId), () => Effect.sleep(SETTLE));
    const focus = (testId: string) =>
      Effect.flatMap(ctx.host.focusElement(testId), () => Effect.sleep(SETTLE));
    const focusNext = () =>
      Effect.flatMap(ctx.host.focusNext(), () => Effect.sleep(SETTLE));

    // 1. At rest: the placeholder, no chord, nothing reported.
    yield* ctx.expectEqual(
      "the recorder starts on its placeholder",
      yield* recorderText(),
      HOTKEY_PLACEHOLDER,
    );
    yield* ctx.expectEqual(
      "the recorder starts with no chord and no report",
      yield* readout(),
      hotkeyReadout(null, 0),
    );

    // 2. A press arms it. The paint is the state: "Press keys…".
    yield* click(HOTKEY_IDS.recorder);
    yield* ctx.expectEqual(
      "a press arms the recorder",
      yield* recorderText(),
      HOTKEY_RECORDING,
    );
    yield* ctx.host.capture(HOTKEY_CAPTURES.armed);

    // 3. A modifier on its own is not a chord, so the recorder keeps listening
    //    and reports nothing.
    yield* down(HOTKEY_KEYS.modifier);
    yield* ctx.expectEqual(
      "a modifier on its own leaves the recorder listening",
      yield* recorderText(),
      HOTKEY_RECORDING,
    );
    yield* ctx.expectEqual(
      "a modifier on its own reports nothing",
      yield* readout(),
      hotkeyReadout(null, 0),
    );

    // 4. The chord: stored in its canonical form, then painted as glyphs.
    yield* down(HOTKEY_KEYS.chord);
    const chord = capturedChord(currentPlatform);
    yield* ctx.expectEqual(
      "the chord is captured in its canonical form",
      yield* readout(),
      hotkeyReadout(chord, 1),
    );
    yield* ctx.expectEqual(
      "the stored chord paints as keycaps, not as its raw value",
      paintsKeycaps(yield* recorderText(), HOTKEY_KEYCAPS.base),
      true,
    );
    yield* ctx.host.capture(HOTKEY_CAPTURES.bound);

    // 5. The runtime sends the release too, and it must not re-arm or report.
    yield* up(HOTKEY_KEYS.chordKey);
    yield* ctx.expectEqual(
      "the release of the captured key leaves one report",
      yield* readout(),
      hotkeyReadout(chord, 1),
    );

    // 6. The app-level channel: the page promises the recorded key is
    //    swallowed, so whether the window handler hears it is the measurement.
    yield* ctx.expectEqual(
      "the application's window handler still hears the swallowed key",
      windowSaw(yield* windowLog(), HOTKEY_KEYS.chordKey),
      true,
    );

    // 7. Clearing is a control, and it must not arm the recorder on the way.
    yield* click(hotkeyClearId(HOTKEY_IDS.recorder));
    yield* ctx.expectEqual(
      "the clear control reports no chord",
      yield* readout(),
      hotkeyReadout(null, 2),
    );
    yield* ctx.expectEqual(
      "clearing does not start a recording",
      yield* recorderText(),
      HOTKEY_PLACEHOLDER,
    );

    // 8. Escape cancels rather than being recorded.
    yield* click(HOTKEY_IDS.recorder);
    yield* ctx.expectEqual(
      "a press arms the recorder after a clear",
      yield* recorderText(),
      HOTKEY_RECORDING,
    );
    yield* down(HOTKEY_KEYS.cancel);
    yield* ctx.expectEqual(
      "Escape cancels without reporting a chord",
      yield* readout(),
      hotkeyReadout(null, 2),
    );
    yield* ctx.expectEqual(
      "Escape returns the recorder to its placeholder",
      yield* recorderText(),
      HOTKEY_PLACEHOLDER,
    );

    // 9. Space is a named key while recording, not the other half of an
    //    activation: it is recorded once and its release adds nothing.
    yield* click(HOTKEY_IDS.recorder);
    yield* down(HOTKEY_KEYS.space);
    yield* ctx.expectEqual(
      "Space is a chord while recording",
      yield* readout(),
      hotkeyReadout(SPACE_CHORD, 3),
    );
    yield* ctx.expectEqual(
      "the Space chord paints its own keycap",
      paintsKeycaps(yield* recorderText(), HOTKEY_KEYCAPS.space),
      true,
    );
    yield* up(HOTKEY_KEYS.space);
    yield* ctx.expectEqual(
      "the Space release adds no activation",
      yield* readout(),
      hotkeyReadout(SPACE_CHORD, 3),
    );

    // 10. The tab walk: the recorder, then its clear control, then past the
    //     disabled twin to the plain control.
    yield* focus(HOTKEY_IDS.recorder);
    yield* ctx.expectEqual(
      "the code focus lands on the recorder",
      yield* focused(),
      HOTKEY_IDS.recorder,
    );
    yield* focusNext();
    yield* ctx.expectEqual(
      "the first Tab stop inside the recorder is its clear control",
      yield* focused(),
      hotkeyClearId(HOTKEY_IDS.recorder),
    );
    yield* focusNext();
    yield* ctx.expectEqual(
      "the tab walk skips the disabled recorder",
      yield* focused(),
      HOTKEY_IDS.plain,
    );

    // 11. A disabled recorder refuses both routes: the press arms nothing, and
    //     a focused one refuses the activating key too.
    yield* click(HOTKEY_IDS.off);
    yield* ctx.expectEqual(
      "a press on a disabled recorder records nothing",
      yield* offReadout(),
      hotkeyOffReadout(0),
    );
    yield* ctx.expectEqual(
      "a disabled recorder keeps its placeholder",
      yield* offText(),
      HOTKEY_PLACEHOLDER,
    );
    yield* focus(HOTKEY_IDS.off);
    yield* ctx.expectEqual(
      "a code focus reaches the disabled recorder",
      yield* focused(),
      HOTKEY_IDS.off,
    );
    yield* down(HOTKEY_KEYS.refused);
    yield* ctx.expectEqual(
      "a disabled recorder refuses the key route too",
      yield* offReadout(),
      hotkeyOffReadout(0),
    );
  });
