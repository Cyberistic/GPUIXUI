/**
 * The `color-picker-lifecycle` probe: the shipped `ColorPicker` in a real
 * window.
 *
 * The window is the only place that can say the panel is a floating surface
 * below its trigger, that a press on the area commits the colour under the
 * pointer, and that a refused draft paints the field's destructive edge. The
 * behaviour suite reads `aria-valuetext` and the reported value; this probe
 * reads the paint.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { ColorPicker } from "@gpuixui/components";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  AREA_POINT,
  boxRegion,
  COLOR_PICKER_IDS,
  colorPickerReadout,
  INITIAL_ROLE,
  INVALID_DRAFT,
  inkIn,
  partId,
  areaOf,
  pointIn,
  presetId,
  PRESSED_ROLE,
  swatchColour,
  TYPED_COLOUR,
  TYPED_DRAFT,
  type ColorPickerState,
  type PaintedBox,
} from "./color-picker.js";

/** A picker's paint is one render behind the input that changed it. */
const SETTLE = Duration.millis(120);

/** One labelled picker row. */
const Row = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          width: 90,
          color: theme.colors.mutedForeground,
          fontSize: 12,
        }}
      >
        {label}
      </text>
      <div>{children}</div>
    </div>
  );
};

/** The probe's window: the picker it drives and the disabled one beside it. */
export const ColorPickerProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const colours = palettes.dark.colors;
  const [value, setValue] = useState<string>(
    swatchColour(colours, INITIAL_ROLE),
  );
  const [changes, setChanges] = useState(0);
  const [refused, setRefused] = useState(0);
  const state: ColorPickerState = { value, changes, refused };

  return (
    <div
      testId={COLOR_PICKER_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
      }}
    >
      <text style={{ color: theme.colors.foreground }}>
        A colour picker opens a saturation area, hue and alpha rails, a hex
        field and presets, and reports the colour it commits.
      </text>
      <Readout testId={COLOR_PICKER_IDS.readout}>
        {colorPickerReadout(state)}
      </Readout>
      <Row label="Enabled">
        <ColorPicker
          testId={COLOR_PICKER_IDS.enabled}
          label="Accent colour"
          background={colours.background}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setChanges((count) => count + 1);
          }}
        />
      </Row>
      <Row label="Disabled">
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <div
            testId={COLOR_PICKER_IDS.before}
            tabIndex={0}
            style={{ width: 8, height: 8 }}
          />
          <ColorPicker
            testId={COLOR_PICKER_IDS.disabled}
            label="Locked colour"
            value={swatchColour(colours, "secondary")}
            disabled
            onValueChange={() => setRefused((count) => count + 1)}
          />
          <div
            testId={COLOR_PICKER_IDS.after}
            tabIndex={0}
            style={{ width: 8, height: 8 }}
          />
        </div>
      </Row>
    </div>
  );
};

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  PaintedBox,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

export const colorPickerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(COLOR_PICKER_IDS.probe);
    yield* Effect.sleep(SETTLE);
    const colours = palettes.dark.colors;
    const readout = () => ctx.host.text(COLOR_PICKER_IDS.readout);
    const initial = swatchColour(colours, INITIAL_ROLE);
    const pressed = swatchColour(colours, PRESSED_ROLE);
    const destructive = yield* ctx.expectSome(
      "the theme's destructive role is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(colours.destructive)),
    );

    // 1. The readout starts on the caller's colour.
    yield* ctx.expectEqual(
      "the picker starts on the caller's colour",
      yield* readout(),
      colorPickerReadout({ value: initial, changes: 0, refused: 0 }),
    );

    // 2. The trigger opens a panel below itself.
    yield* ctx.expectEqual(
      "a closed picker paints no panel",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(partId(COLOR_PICKER_IDS.enabled, "panel")),
        ),
      ),
      true,
    );
    yield* ctx.host.click(COLOR_PICKER_IDS.enabled);
    yield* Effect.sleep(SETTLE);
    yield* paintedBox(ctx, partId(COLOR_PICKER_IDS.enabled, "panel"));
    yield* ctx.expectEqual(
      "the trigger opens the panel",
      Option.isSome(
        Option.fromNullishOr(
          yield* ctx.host.bounds(partId(COLOR_PICKER_IDS.enabled, "panel")),
        ),
      ),
      true,
    );

    // 3. A press on the area commits the colour under the pointer.
    const area = yield* paintedBox(
      ctx,
      partId(COLOR_PICKER_IDS.enabled, "area"),
    );
    yield* ctx.host.clickAt(
      partId(COLOR_PICKER_IDS.enabled, "area"),
      pointIn(area, AREA_POINT),
    );
    yield* Effect.sleep(SETTLE);
    const pressedAt = areaOf((yield* readout()).slice(6, 13));
    yield* ctx.expectEqual(
      "an area press commits the colour under the pointer",
      `${Math.abs(pressedAt.s - AREA_POINT.x) < 0.02} ${Math.abs(pressedAt.v - (1 - AREA_POINT.y)) < 0.02}`,
      "true true",
    );

    // 4. A preset press commits the role it paints.
    yield* ctx.host.click(presetId(COLOR_PICKER_IDS.enabled, 2));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a pressed preset becomes the value",
      yield* readout(),
      colorPickerReadout({ value: pressed, changes: 2, refused: 0 }),
    );

    // 5. The alpha rail's key commits the hex with its alpha digits.
    yield* ctx.host.focusElement(partId(COLOR_PICKER_IDS.enabled, "alpha"));
    yield* ctx.host.key("pagedown");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an alpha step reaches the value as two alpha digits",
      (yield* readout()).endsWith("E6 changes=3 refused=0"),
      true,
    );

    // 6. A typed shorthand commits through one normal form.
    yield* ctx.host.focusElement(partId(COLOR_PICKER_IDS.enabled, "hex"));
    yield* ctx.host.key("cmd-a");
    yield* Effect.forEach(
      Arr.fromIterable(TYPED_DRAFT.split("")),
      (letter) => ctx.host.key(letter),
      { concurrency: 1 },
    );
    // The keys land inside one frame: the submit has to read the draft the
    // field was written with, not the one before it.
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a typed shorthand commits as its expanded colour",
      yield* readout(),
      colorPickerReadout({ value: TYPED_COLOUR, changes: 4, refused: 0 }),
    );

    // 7. A draft the normal form refuses paints the field and commits nothing.
    const field = yield* paintedBox(
      ctx,
      partId(COLOR_PICKER_IDS.enabled, "hex"),
    );
    yield* ctx.host.key("cmd-a");
    yield* Effect.forEach(
      Arr.fromIterable(INVALID_DRAFT.split("")),
      (letter) => ctx.host.key(letter),
      { concurrency: 1 },
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("color-picker-refused");
    const pixels = yield* ctx.host.pixels("color-picker-refused");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the refused capture is the window at a whole device scale",
      captureScale(pixels, size),
    );
    yield* ctx.expectEqual(
      "an invalid draft marks the field destructive",
      inkIn(pixels, boxRegion(field, scale), destructive) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "an invalid draft commits nothing",
      yield* readout(),
      colorPickerReadout({ value: TYPED_COLOUR, changes: 4, refused: 0 }),
    );

    // 8. A disabled picker refuses the open, and the traversal skips it.
    yield* ctx.host.click(COLOR_PICKER_IDS.disabled);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled picker opens nothing",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(partId(COLOR_PICKER_IDS.disabled, "panel")),
        ),
      ),
      true,
    );
    yield* ctx.host.focusElement(COLOR_PICKER_IDS.before);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a traversal skips the disabled picker",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      COLOR_PICKER_IDS.after,
    );
    yield* ctx.expectEqual(
      "the disabled picker reported nothing",
      (yield* readout()).endsWith("refused=0"),
      true,
    );
  });
