/**
 * The `color-picker-lifecycle` probe: the shipped `ColorPicker` in a real
 * window.
 *
 * The component states its paint in the theme's roles and one derived mark. Its
 * six swatches are `primary`, `secondary`, `accent`, `muted`, `destructive` and
 * `foreground`, each cell filled with the role itself; the chosen cell carries a
 * marker the component builds from the **page** fill inside a body-ink ring, so
 * the marker has to be findable on a fill no role owns — including `foreground`,
 * the one role a body-ink ring would disappear into. A typed hex has one normal
 * form (`#f0a` → `#ff00aa`), and only the painted preview says the field's
 * commit reached the value.
 *
 * The behaviour suite reads `style.backgroundColor`, `aria-selected` and the
 * draft the host holds. This probe paints them: each cell is counted in its own
 * inner square, the marker is the page ink only the chosen cell holds, and the
 * destructive border of a refused draft is counted off the field's own box.
 *
 * A second, disabled picker proves the refusal: its swatches report nothing when
 * pressed, and neither they nor its read-only field are stops in the window's
 * own traversal.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { ColorPicker } from "@gpuixui/components";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  boxRegion,
  COLOR_PICKER_IDS,
  colorPickerReadout,
  ENTER_ROLE,
  INITIAL_ROLE,
  INVALID_DRAFT,
  innerRegion,
  markedRoles,
  partId,
  PRESSED_ROLE,
  SPACE_ROLE,
  formatRoles,
  swatchColour,
  swatchId,
  SWATCH_ROLES,
  TYPED_COLOUR,
  TYPED_DRAFT,
  unpaintedRoles,
  type ColorPickerState,
  type PaintedBox,
} from "./color-picker.js";

/** A picker's paint is one render behind the input that changed it. */
const SETTLE = Duration.millis(80);

/** The captures a reader can look at. */
const REST = "color-picker-rest";
const CHOSEN = "color-picker-chosen";
const DRAFTED = "color-picker-drafted";
const TYPED = "color-picker-typed";
const REFUSED = "color-picker-refused";
const RETURNED = "color-picker-returned";

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
          ...textStyle(theme, "caption"),
          width: 90,
          color: theme.colors.mutedForeground,
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
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A color picker offers the theme's six roles as swatches, marks the
        chosen one with a page-filled pip, commits a typed hex in one normal
        form, and refuses a draft it cannot read.
      </text>
      <Readout testId={COLOR_PICKER_IDS.readout}>
        {colorPickerReadout(state)}
      </Readout>
      <Row label="Enabled">
        <ColorPicker
          testId={COLOR_PICKER_IDS.enabled}
          label="Accent colour"
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

/** A capture, its decoded frame, and the device scale its points convert by. */
interface Frame {
  readonly pixels: Pixels.Pixels;
  readonly scale: number;
}

/** Captures `name` and reads it as a frame of this window. */
const capture = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<Frame, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    const pixels = yield* ctx.host.pixels(name);
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      `${name} is the window at a whole device scale`,
      captureScale(pixels, size),
    );
    return { pixels, scale } as const;
  });

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

/** The ink a region of `frame` paints, or `-1` for a region off the frame. */
const inkIn = (
  frame: Pixels.Pixels,
  region: Pixels.PixelRegion,
  ink: Pixels.Rgba,
): number =>
  Option.match(Option.fromNullishOr(Pixels.crop(frame, region)), {
    onNone: () => -1,
    onSome: (crop) => Pixels.countColour(crop, ink),
  });

/** One swatch's cell, the role it names, and the ink that role paints. */
interface Swatch {
  readonly role: (typeof SWATCH_ROLES)[number];
  readonly cell: PaintedBox;
  readonly ink: Pixels.Rgba;
}

export const colorPickerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(COLOR_PICKER_IDS.probe);
    yield* Effect.sleep(SETTLE);
    const colours = palettes.dark.colors;
    const readout = () => ctx.host.text(COLOR_PICKER_IDS.readout);
    const initial = swatchColour(colours, INITIAL_ROLE);
    const pressed = swatchColour(colours, PRESSED_ROLE);
    const spaced = swatchColour(colours, SPACE_ROLE);
    const entered = swatchColour(colours, ENTER_ROLE);
    const page = yield* ctx.expectSome(
      "the theme's page role is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(colours.background)),
    );
    const destructive = yield* ctx.expectSome(
      "the theme's destructive role is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(colours.destructive)),
    );
    const typed = yield* ctx.expectSome(
      "the committed hex is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(TYPED_COLOUR)),
    );
    const atStart = yield* ctx.expectSome(
      "the colour the picker starts on is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(initial)),
    );
    const atPress = yield* ctx.expectSome(
      "the pressed colour is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(pressed)),
    );

    // 1. The picker starts on the caller's value, and every cell paints the
    //    theme role it names.
    yield* ctx.expectEqual(
      "the picker starts on the caller's colour",
      yield* readout(),
      colorPickerReadout({ value: initial, changes: 0, refused: 0 }),
    );
    const swatches = yield* Effect.forEach(
      SWATCH_ROLES,
      (
        role,
      ): Effect.Effect<
        Swatch,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.gen(function* () {
          const ink = yield* ctx.expectSome(
            `the theme's ${role} role is paintable`,
            Option.fromNullishOr(Pixels.hexToRgba(swatchColour(colours, role))),
          );
          const cell = yield* paintedBox(
            ctx,
            swatchId(COLOR_PICKER_IDS.enabled, role),
          );
          return { role, cell, ink } as const;
        }),
      { concurrency: 1 },
    );
    const preview = yield* paintedBox(
      ctx,
      partId(COLOR_PICKER_IDS.enabled, "preview"),
    );
    const field = yield* paintedBox(
      ctx,
      partId(COLOR_PICKER_IDS.enabled, "hex"),
    );
    const rest = yield* capture(ctx, REST);
    const restCounts = Arr.map(swatches, (swatch) =>
      inkIn(rest.pixels, innerRegion(swatch.cell, rest.scale), swatch.ink),
    );
    yield* ctx.expectEqual(
      "every swatch paints the role it names",
      formatRoles(unpaintedRoles(restCounts)),
      "",
    );
    yield* ctx.expectEqual(
      "only the chosen swatch carries the marker",
      formatRoles(
        markedRoles(
          Arr.map(swatches, (swatch) =>
            inkIn(rest.pixels, innerRegion(swatch.cell, rest.scale), page),
          ),
        ),
      ),
      INITIAL_ROLE,
    );
    yield* ctx.expectEqual(
      "the preview paints the chosen colour",
      inkIn(rest.pixels, innerRegion(preview, rest.scale), atStart) > 0,
      true,
    );

    // 2. A press chooses a swatch: the value, the marker and the preview all
    //    move to it.
    yield* ctx.host.click(swatchId(COLOR_PICKER_IDS.enabled, PRESSED_ROLE));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a pressed swatch becomes the value",
      yield* readout(),
      colorPickerReadout({ value: pressed, changes: 1, refused: 0 }),
    );
    const chosen = yield* capture(ctx, CHOSEN);
    yield* ctx.expectEqual(
      "the marker moves to the swatch the press chose",
      formatRoles(
        markedRoles(
          Arr.map(swatches, (swatch) =>
            inkIn(chosen.pixels, innerRegion(swatch.cell, chosen.scale), page),
          ),
        ),
      ),
      PRESSED_ROLE,
    );
    yield* ctx.expectEqual(
      "the preview follows the press",
      inkIn(chosen.pixels, innerRegion(preview, chosen.scale), atPress) > 0,
      true,
    );

    // 3. Space is the release key and Enter the press key, and both reach the
    //    swatch the window focused.
    yield* ctx.host.focusElement(
      swatchId(COLOR_PICKER_IDS.enabled, SPACE_ROLE),
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the focus lands on the swatch the next key reaches",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      swatchId(COLOR_PICKER_IDS.enabled, SPACE_ROLE),
    );
    yield* ctx.host.key("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a Space press chooses nothing",
      yield* readout(),
      colorPickerReadout({ value: pressed, changes: 1, refused: 0 }),
    );
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a Space release chooses the focused swatch",
      yield* readout(),
      colorPickerReadout({ value: spaced, changes: 2, refused: 0 }),
    );
    yield* ctx.host.focusElement(
      swatchId(COLOR_PICKER_IDS.enabled, ENTER_ROLE),
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an Enter press chooses the focused swatch",
      yield* readout(),
      colorPickerReadout({ value: entered, changes: 3, refused: 0 }),
    );

    // 4. A typed shorthand commits through one normal form, and a colour no
    //    swatch holds leaves no marker behind.
    yield* ctx.host.click(partId(COLOR_PICKER_IDS.enabled, "hex"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the hex field gives it the window's focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      partId(COLOR_PICKER_IDS.enabled, "hex"),
    );
    yield* ctx.host.key("cmd-a");
    yield* Effect.forEach(
      Arr.fromIterable(Str.split("")(TYPED_DRAFT)),
      (letter) => ctx.host.key(letter),
      { concurrency: 1 },
    );
    // The three keys land inside one frame, so the last edit has to commit
    // before Enter: a submit delivered in the same frame reads the draft from
    // before it, which is the draft the field was written with.
    yield* Effect.sleep(SETTLE);
    const drafted = yield* capture(ctx, DRAFTED);
    yield* ctx.expectEqual(
      "a readable draft paints no refusal",
      inkIn(drafted.pixels, boxRegion(field, drafted.scale), destructive),
      0,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a typed shorthand commits as its expanded lowercase colour",
      yield* readout(),
      colorPickerReadout({ value: TYPED_COLOUR, changes: 4, refused: 0 }),
    );
    const painted = yield* capture(ctx, TYPED);
    yield* ctx.expectEqual(
      "a colour no swatch holds leaves no marker",
      formatRoles(
        markedRoles(
          Arr.map(swatches, (swatch) =>
            inkIn(
              painted.pixels,
              innerRegion(swatch.cell, painted.scale),
              page,
            ),
          ),
        ),
      ),
      "",
    );
    yield* ctx.expectEqual(
      "the preview paints the typed colour",
      inkIn(painted.pixels, innerRegion(preview, painted.scale), typed) > 0,
      true,
    );

    // 5. A draft the normal form refuses marks the field and commits nothing.
    yield* ctx.host.click(partId(COLOR_PICKER_IDS.enabled, "hex"));
    yield* ctx.host.key("cmd-a");
    yield* Effect.forEach(
      Arr.fromIterable(Str.split("")(INVALID_DRAFT)),
      (letter) => ctx.host.key(letter),
      { concurrency: 1 },
    );
    yield* Effect.sleep(SETTLE);
    const refused = yield* capture(ctx, REFUSED);
    yield* ctx.expectEqual(
      "an invalid draft marks the field destructive",
      inkIn(refused.pixels, boxRegion(field, refused.scale), destructive) > 0,
      true,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an invalid draft commits nothing",
      yield* readout(),
      colorPickerReadout({ value: TYPED_COLOUR, changes: 4, refused: 0 }),
    );
    const returned = yield* capture(ctx, RETURNED);
    yield* ctx.expectEqual(
      "the refused draft returns the field to its value",
      inkIn(returned.pixels, boxRegion(field, returned.scale), destructive),
      0,
    );

    // 6. A disabled picker refuses the press, and the window's traversal skips
    //    its swatches and its read-only field.
    yield* ctx.host.click(swatchId(COLOR_PICKER_IDS.disabled, INITIAL_ROLE));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a disabled swatch reports nothing",
      Option.getOrElse(
        Option.map(
          Option.fromNullishOr(/refused=(\d+)/.exec(yield* readout())?.[1]),
          Number,
        ),
        () => -1,
      ),
      0,
    );
    yield* ctx.host.focusElement(COLOR_PICKER_IDS.before);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the traversal starts on the stop before the disabled picker",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      COLOR_PICKER_IDS.before,
    );
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a traversal skips the disabled picker's swatches and field",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      COLOR_PICKER_IDS.after,
    );
  });
