import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Input,
  TextArea,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Pressable, Readout } from "../ui.js";
import { useWindowKey } from "../window-handlers.js";
import {
  TEXT_UNDO_IDS,
  TEXT_UNDO_KEYS,
  TEXT_UNDO_TEXT,
  textUndoAreaReadout,
  textUndoKeyLog,
  textUndoReadout,
} from "./text-undo.js";

const SETTLE = Duration.millis(40);

const GROUP = Duration.millis(900);

const fieldStyle = {
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 8,
} as const;

export const TextUndoProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState("");
  const [changes, setChanges] = useState(0);
  const [area, setArea] = useState("");
  const [areaChanges, setAreaChanges] = useState(0);
  const [renders, setRenders] = useState(0);
  const [keys, setKeys] = useState<ReadonlyArray<string>>([]);

  useWindowKey((event) => {
    if (event.modifiers?.cmd !== true) return;
    const key = event.key;
    if (key === undefined) return;
    setKeys((seen) => (Arr.contains(seen, key) ? seen : Arr.append(seen, key)));
  });

  const edited = (next: string): void => {
    setValue(next);
    setChanges((count) => count + 1);
  };

  return (
    <div
      testId={TEXT_UNDO_IDS.probe}
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
        A field&apos;s own undo in a window: does the app hear it, what clears
        it, and who owns the chord.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <div style={fieldStyle}>
          <Input
            testId={TEXT_UNDO_IDS.field}
            label="Single line"
            value={value}
            onChange={edited}
          />
          <TextArea
            testId={TEXT_UNDO_IDS.area}
            label="Multi line"
            value={area}
            onChange={(next: string) => {
              setArea(next);
              setAreaChanges((count) => count + 1);
            }}
          />
        </div>
      </PrimitiveThemeProvider>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Pressable
          testId={TEXT_UNDO_IDS.rerender}
          onClick={() => setRenders((count) => count + 1)}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Re-render
          </text>
        </Pressable>
        <Pressable
          testId={TEXT_UNDO_IDS.load}
          onClick={() => setValue(TEXT_UNDO_TEXT.loaded)}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Load a value
          </text>
        </Pressable>
        <div
          testId={TEXT_UNDO_IDS.control}
          tabIndex={0}
          role="button"
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            another focus
          </text>
        </div>
      </div>
      <Readout testId={TEXT_UNDO_IDS.readout}>
        {textUndoReadout(value, changes, renders)}
      </Readout>
      <Readout testId={TEXT_UNDO_IDS.areaReadout}>
        {textUndoAreaReadout(area, areaChanges)}
      </Readout>
      <Readout testId={TEXT_UNDO_IDS.keys}>{textUndoKeyLog(keys)}</Readout>
    </div>
  );
};

export const textUndoSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(TEXT_UNDO_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(TEXT_UNDO_IDS.readout);
    const areaReadout = () => ctx.host.text(TEXT_UNDO_IDS.areaReadout);
    const keyLog = () => ctx.host.text(TEXT_UNDO_IDS.keys);

    const press = (testId: string) =>
      Effect.flatMap(ctx.host.click(testId), () => Effect.sleep(SETTLE));
    const key = (chord: string) =>
      Effect.flatMap(ctx.host.key(chord), () => Effect.sleep(SETTLE));

    yield* ctx.expectEqual(
      "the field starts empty and the app has seen no edit",
      yield* readout(),
      textUndoReadout("", 0, 0),
    );

    yield* press(TEXT_UNDO_IDS.field);
    yield* ctx.expectEqual(
      "a press focuses the field",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      TEXT_UNDO_IDS.field,
    );

    yield* key(TEXT_UNDO_TEXT.typed);
    yield* ctx.expectEqual(
      "a typed key reaches the controlled onChange",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.typed, 1, 0),
    );

    yield* press(TEXT_UNDO_IDS.rerender);
    yield* ctx.expectEqual(
      "an unrelated re-render keeps the value",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.typed, 1, 1),
    );

    yield* press(TEXT_UNDO_IDS.field);
    yield* key(TEXT_UNDO_KEYS.undo);
    yield* ctx.expectEqual(
      "cmd-z restores the empty value and reaches the controlled onChange",
      yield* readout(),
      textUndoReadout("", 2, 1),
    );

    yield* ctx.expectEqual(
      "the field's undo reaches no window handler",
      yield* keyLog(),
      textUndoKeyLog([]),
    );

    yield* key(TEXT_UNDO_KEYS.redo);
    yield* ctx.expectEqual(
      "shift-cmd-z redoes the edit the undo removed",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.typed, 3, 1),
    );

    yield* key(TEXT_UNDO_KEYS.undo);
    yield* ctx.expectEqual(
      "a second cmd-z undoes the redone edit again",
      yield* readout(),
      textUndoReadout("", 4, 1),
    );

    yield* press(TEXT_UNDO_IDS.load);
    yield* ctx.expectEqual(
      "the loaded value paints without an edit event",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.loaded, 4, 1),
    );

    yield* press(TEXT_UNDO_IDS.field);
    yield* key(TEXT_UNDO_KEYS.undo);
    yield* ctx.expectEqual(
      "cmd-z after a value pushed in from outside changes nothing",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.loaded, 4, 1),
    );

    yield* Effect.sleep(GROUP);
    yield* key(TEXT_UNDO_TEXT.later);
    yield* ctx.expectEqual(
      "an edit after the push is reported",
      yield* readout(),
      textUndoReadout(`${TEXT_UNDO_TEXT.loaded}${TEXT_UNDO_TEXT.later}`, 5, 1),
    );
    yield* key(TEXT_UNDO_KEYS.undo);
    yield* ctx.expectEqual(
      "undoing it returns to the value the app pushed in",
      yield* readout(),
      textUndoReadout(TEXT_UNDO_TEXT.loaded, 6, 1),
    );

    yield* press(TEXT_UNDO_IDS.area);
    yield* key(TEXT_UNDO_TEXT.areaTyped);
    yield* ctx.expectEqual(
      "the text area reports its typed key",
      yield* areaReadout(),
      textUndoAreaReadout(TEXT_UNDO_TEXT.areaTyped, 1),
    );
    yield* key(TEXT_UNDO_KEYS.undo);
    yield* ctx.expectEqual(
      "the text area's undo reaches its controlled onChange",
      yield* areaReadout(),
      textUndoAreaReadout("", 2),
    );

    yield* press(TEXT_UNDO_IDS.control);
    yield* key(TEXT_UNDO_KEYS.control);
    yield* ctx.expectEqual(
      "a chord no field binds reaches the window handler",
      yield* keyLog(),
      textUndoKeyLog(["k"]),
    );
  });
