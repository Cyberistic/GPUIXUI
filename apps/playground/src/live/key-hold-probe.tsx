import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Button,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-handlers.js";
import {
  heldKeyLog,
  KEY_HOLD_IDS,
  KEY_HOLD_KEYS,
  keyHoldReadout,
  windowKeyLog,
  type HeldKey,
} from "./key-hold.js";

const SETTLE = Duration.millis(40);

const RawControl = ({
  onDown,
  onUp,
}: {
  readonly onDown: (key: string, held: boolean) => void;
  readonly onUp: () => void;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={KEY_HOLD_IDS.raw}
      tabIndex={0}
      role="button"
      onKeyDown={(event) => onDown(event.key ?? "none", event.isHeld === true)}
      onKeyUp={onUp}
      style={{
        width: 200,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
      }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        unguarded
      </text>
    </div>
  );
};

export const KeyHoldProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [activations, setActivations] = useState(0);
  const [presses, setPresses] = useState(0);
  const [downs, setDowns] = useState<ReadonlyArray<HeldKey>>([]);
  const [ups, setUps] = useState(0);
  const [buttonDowns, setButtonDowns] = useState<ReadonlyArray<HeldKey>>([]);
  const [windowDowns, setWindowDowns] = useState<ReadonlyArray<HeldKey>>([]);

  const record = (key: string, held: boolean): void =>
    setWindowDowns((seen) => Arr.append(seen, { key, held }));

  useWindowKey((event) => {
    if (event.key === undefined) return;
    record(event.key, event.isHeld === true);
  });

  return (
    <div
      testId={KEY_HOLD_IDS.probe}
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
        A held key in a window: the repeat flag the payload carries, and the
        shipped Button&apos;s guard against it.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <Button
            testId={KEY_HOLD_IDS.button}
            variant="primary"
            onClick={() => setPresses((count) => count + 1)}
            onActivate={() => setActivations((count) => count + 1)}
            onKeyDown={(event) =>
              setButtonDowns((seen) =>
                Arr.append(seen, {
                  key: event.key ?? "none",
                  held: event.isHeld === true,
                }),
              )
            }
          >
            Run
          </Button>
          <RawControl
            onDown={(key, held) =>
              setDowns((seen) => Arr.append(seen, { key, held }))
            }
            onUp={() => setUps((count) => count + 1)}
          />
        </div>
      </PrimitiveThemeProvider>
      <Readout testId={KEY_HOLD_IDS.readout}>
        {keyHoldReadout(activations, presses)}
      </Readout>
      <Readout testId={KEY_HOLD_IDS.rawLog}>{heldKeyLog(downs, ups)}</Readout>
      <Readout testId={KEY_HOLD_IDS.buttonLog}>
        {heldKeyLog(buttonDowns, 0)}
      </Readout>
      <Readout testId={KEY_HOLD_IDS.windowLog}>
        {windowKeyLog(windowDowns)}
      </Readout>
    </div>
  );
};

export const keyHoldSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(KEY_HOLD_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(KEY_HOLD_IDS.readout);
    const rawLog = () => ctx.host.text(KEY_HOLD_IDS.rawLog);
    const windowLog = () => ctx.host.text(KEY_HOLD_IDS.windowLog);
    const focused = () =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    const keyDown = yield* ctx.expectSome(
      "the window exposes a key down with its repeat flag",
      Option.fromNullishOr(ctx.host.keyDown),
    );
    const down = (keystroke: string, isHeld: boolean) =>
      Effect.flatMap(keyDown(keystroke, isHeld), () => Effect.sleep(SETTLE));
    const up = (keystroke: string) =>
      Effect.flatMap(ctx.host.keyUp(keystroke), () => Effect.sleep(SETTLE));
    const focus = (testId: string) =>
      Effect.flatMap(ctx.host.focusElement(testId), () => Effect.sleep(SETTLE));

    yield* focus(KEY_HOLD_IDS.raw);
    yield* ctx.expectEqual(
      "the code focus reaches the unguarded control",
      yield* focused(),
      KEY_HOLD_IDS.raw,
    );
    yield* down(KEY_HOLD_KEYS.raw, false);
    yield* ctx.expectEqual(
      "the first press arrives with the flag clear",
      yield* rawLog(),
      heldKeyLog([{ key: KEY_HOLD_KEYS.raw, held: false }], 0),
    );
    yield* down(KEY_HOLD_KEYS.raw, true);
    yield* ctx.expectEqual(
      "a repeat arrives with the flag set",
      yield* rawLog(),
      heldKeyLog(
        [
          { key: KEY_HOLD_KEYS.raw, held: false },
          { key: KEY_HOLD_KEYS.raw, held: true },
        ],
        0,
      ),
    );
    yield* up(KEY_HOLD_KEYS.raw);
    yield* ctx.expectEqual(
      "the release reaches the control it was pressed on",
      yield* rawLog(),
      heldKeyLog(
        [
          { key: KEY_HOLD_KEYS.raw, held: false },
          { key: KEY_HOLD_KEYS.raw, held: true },
        ],
        1,
      ),
    );

    yield* ctx.expectEqual(
      "the window handler saw both halves with the flag they carried",
      yield* windowLog(),
      windowKeyLog([
        { key: KEY_HOLD_KEYS.raw, held: false },
        { key: KEY_HOLD_KEYS.raw, held: true },
      ]),
    );

    yield* focus(KEY_HOLD_IDS.button);
    yield* ctx.expectEqual(
      "a code focus lands on the button without activating it",
      yield* focused(),
      KEY_HOLD_IDS.button,
    );
    yield* ctx.expectEqual(
      "the button starts unactivated",
      yield* readout(),
      keyHoldReadout(0, 0),
    );
    yield* down(KEY_HOLD_KEYS.press, false);
    yield* ctx.expectEqual(
      "the button's own handler sees the press",
      yield* ctx.host.text(KEY_HOLD_IDS.buttonLog),
      heldKeyLog([{ key: KEY_HOLD_KEYS.press, held: false }], 0),
    );
    yield* ctx.expectEqual(
      "Enter activates the focused button on its press",
      yield* readout(),
      keyHoldReadout(1, 0),
    );
    yield* down(KEY_HOLD_KEYS.press, true);
    yield* ctx.expectEqual(
      "a held Enter does not activate again",
      yield* readout(),
      keyHoldReadout(1, 0),
    );
    yield* down(KEY_HOLD_KEYS.press, true);
    yield* ctx.expectEqual(
      "a second repeat is refused as well",
      yield* readout(),
      keyHoldReadout(1, 0),
    );
    yield* up(KEY_HOLD_KEYS.press);
    yield* ctx.expectEqual(
      "the release of Enter adds no activation",
      yield* readout(),
      keyHoldReadout(1, 0),
    );

    yield* down(KEY_HOLD_KEYS.release, false);
    yield* ctx.expectEqual(
      "a Space press does not activate yet",
      yield* readout(),
      keyHoldReadout(1, 0),
    );
    yield* down(KEY_HOLD_KEYS.release, true);
    yield* ctx.expectEqual(
      "a held Space does not activate either",
      yield* readout(),
      keyHoldReadout(1, 0),
    );
    yield* up(KEY_HOLD_KEYS.release);
    yield* ctx.expectEqual(
      "the Space release activates once",
      yield* readout(),
      keyHoldReadout(2, 0),
    );

    yield* Effect.flatMap(ctx.host.click(KEY_HOLD_IDS.button), () =>
      Effect.sleep(SETTLE),
    );
    yield* ctx.expectEqual(
      "a pointer press runs onClick and onActivate",
      yield* readout(),
      keyHoldReadout(3, 1),
    );
  });
