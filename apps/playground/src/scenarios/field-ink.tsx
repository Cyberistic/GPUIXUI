/**
 * `field-ink-pixels` / `live-field-ink`: what a native editor actually paints.
 *
 * `nativeTextTheme` maps the design system onto a field's theme and claims to
 * keep its placeholder, caret and selection in the palette. Nothing read a
 * field's pixels, so a runtime that ignored the theme passed every check. This
 * probe mounts the shipped `Input` and reads decoded frames:
 *
 * - the text ink is `inputForeground`;
 * - the placeholder is the runtime's fixed grey, **not** the `placeholder`
 *   token (measured in `input.rs` and in the frame);
 * - the selection wash is the runtime's fixed indigo, **not** the `selection`
 *   token;
 * - the caret is `theme.caret` in the runtime's source, but it paints only in
 *   an **active** window (`caret_shown`) and this host's automation window is
 *   never active — measured at two blink phases, live and offscreen — so the
 *   caret stays source evidence and is not claimed here.
 *
 * The model, the two runtime constants and the guards live in
 * `field-ink-model.ts`; capture, device scale and comparison are `frames.ts`.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import {
  Input,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  asHex,
  captureHeadless,
  captureLive,
  expectColour,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  scanBox,
  type FrameReader,
} from "./frames.js";
import {
  FIELD_IDS,
  FIELD_INK_MINIMUM,
  RUNTIME_PLACEHOLDER,
  RUNTIME_SELECTION,
  fieldFixtures,
  tokensSeparate,
  washOver,
} from "./field-ink-model.js";

/** Glyph interiors may be tinted; a role is still more than ten times further. */
const INK_TOLERANCE = 6;
/** A flat wash is exact; this is the frame's own slack. */
const FILL_TOLERANCE = 2;
/** A point inside the stage, clear of every field. */
const STAGE_INSET = 16;

const FieldInkProbe = () => {
  const theme = useTheme();
  return (
    <PrimitiveThemeProvider theme={theme}>
      <div
        testId={FIELD_IDS.stage}
        style={{
          position: "relative",
          width: 420,
          height: 200,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: 300,
          }}
        >
          <Input testId={FIELD_IDS.text} value="MMMMMM" />
          <Input testId={FIELD_IDS.placeholder} value="" placeholder="MMMMMM" />
          <Input testId={FIELD_IDS.selected} value="MMMMMM" />
        </div>
      </div>
    </PrimitiveThemeProvider>
  );
};

export const fieldInkView = (): ReactNode => <FieldInkProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface FieldDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly click: (testId: string) => Effect.Effect<void, E>;
  readonly key: (keys: string) => Effect.Effect<void, E>;
  readonly wait: (millis: number) => Effect.Effect<void>;
}

const inkFailure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

/**
 * One scan recorded as one check.
 *
 * `None` means "this ink must be **absent**": the cross checks that keep the
 * token and the runtime's fixed colour from being confused.
 */
const expectInk = (
  ctx: Pick<Smoke.SmokeContext, "check">,
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  expected: Pixels.Rgba,
  expectation: Option.Option<number>,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const scan = scanBox(
      frame,
      window,
      box,
      expected,
      Option.isSome(expectation) ? INK_TOLERANCE : FILL_TOLERANCE,
    );
    const passed = Option.match(expectation, {
      onNone: () => scan.near === 0,
      onSome: (pixels) => scan.near >= pixels,
    });
    yield* ctx.check(
      label,
      passed
        ? Effect.void
        : inkFailure(
            label,
            Option.match(expectation, {
              onNone: () => "no pixel near the colour",
              onSome: (pixels) =>
                `at least ${pixels} pixels near ${asHex(expected)}`,
            }),
            `${scan.near}/${scan.sampled} pixels, closest ${asHex(scan.closest)}`,
          ),
    );
  });

/** The two guards, then the static frame: text, placeholder and selection. */
const staticChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: FieldDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const fixtures = fieldFixtures(palettes.dark.colors);
    const selection = yield* ctx.expectSome(
      "the selection token composites over the field",
      washOver(fixtures.selection, fixtures.input),
    );
    const runtimeSelection = yield* ctx.expectSome(
      "the runtime selection wash composites over the field",
      washOver(RUNTIME_SELECTION, fixtures.input),
    );
    const placeholderToken = yield* parseColour(
      "the placeholder token parses",
      fixtures.placeholder,
    );
    const textInk = yield* parseColour("the editor ink parses", fixtures.text);
    const runtimePlaceholder = yield* parseColour(
      "the runtime placeholder parses",
      RUNTIME_PLACEHOLDER,
    );

    yield* ctx.expectEqual(
      "the selection washes are far enough apart to fail a swap",
      tokensSeparate(RUNTIME_SELECTION, fixtures.selection, FILL_TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "the placeholder inks are far enough apart to fail a swap",
      tokensSeparate(RUNTIME_PLACEHOLDER, fixtures.placeholder, INK_TOLERANCE),
      true,
    );

    const frame = yield* driver.capture();
    const window = yield* driver.reader.windowSize();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const text = yield* paintedBox(ctx, driver.reader, FIELD_IDS.text);
    yield* expectInk(
      ctx,
      frame,
      window,
      text,
      textInk,
      Option.some(FIELD_INK_MINIMUM),
      "the text field paints its token",
    );
    yield* expectInk(
      ctx,
      frame,
      window,
      text,
      placeholderToken,
      Option.none(),
      "the text field does not paint the placeholder ink",
    );

    const placeholder = yield* paintedBox(
      ctx,
      driver.reader,
      FIELD_IDS.placeholder,
    );
    yield* expectInk(
      ctx,
      frame,
      window,
      placeholder,
      runtimePlaceholder,
      Option.some(FIELD_INK_MINIMUM),
      "the placeholder paints the runtime's fixed grey",
    );
    yield* expectInk(
      ctx,
      frame,
      window,
      placeholder,
      placeholderToken,
      Option.none(),
      "the placeholder ignores the placeholder token",
    );
    yield* expectInk(
      ctx,
      frame,
      window,
      placeholder,
      textInk,
      Option.none(),
      "an empty placeholder field paints no editor ink",
    );

    const selected = yield* paintedBox(ctx, driver.reader, FIELD_IDS.selected);
    yield* expectInk(
      ctx,
      frame,
      window,
      selected,
      runtimeSelection,
      Option.some(FIELD_INK_MINIMUM),
      "the selection paints the runtime wash",
    );
    yield* expectInk(
      ctx,
      frame,
      window,
      selected,
      selection,
      Option.none(),
      "the selection ignores the selection token",
    );

    const stage = yield* paintedBox(ctx, driver.reader, FIELD_IDS.stage);
    yield* expectColour(
      ctx,
      "the stage point is the background token",
      yield* pixelAtPoint(
        ctx,
        frame,
        window,
        stage.x + stage.width - STAGE_INSET,
        stage.y + stage.height - STAGE_INSET,
        "the stage point",
      ),
      yield* parseColour(
        "the background role parses",
        palettes.dark.colors.background,
      ),
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): FieldDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  click: (testId) => Effect.sync(() => host.click(testId)),
  key: (keys) => Effect.sync(() => host.key(keys)),
  wait: () => Effect.void,
});

const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): FieldDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () => captureLive(host),
  click: host.click,
  key: host.key,
  wait: (millis) => Effect.sleep(Duration.millis(millis)),
});

export const fieldInkScenario: PlaygroundScenario = {
  id: "field-ink-pixels",
  title: "Field ink: text, placeholder and the selection wash",
  capability: "input",
  view: fieldInkView,
  steps: (ctx) =>
    Effect.gen(function* () {
      const driver = headlessDriver(ctx.host);
      yield* driver.click(FIELD_IDS.selected);
      yield* driver.key("cmd-a");
      yield* staticChecks(ctx, driver);
    }),
};

export const fieldInkLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-field-ink",
  title: "Live field ink: text, placeholder and the selection wash",
  capability: "input",
  steps: (ctx) =>
    Effect.gen(function* () {
      const driver = liveDriver(ctx.host);
      yield* driver.click(FIELD_IDS.selected);
      yield* driver.wait(120);
      yield* driver.key("cmd-a");
      yield* driver.wait(120);
      yield* staticChecks(ctx, driver);
    }),
};
