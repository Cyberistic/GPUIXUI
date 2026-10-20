/**
 * `text-decoration-pixels` / `live-text-decoration`: does a declared
 * `underline` or `line-through` reach the frame?
 *
 * Every existing decoration claim reads the **authored** style
 * (`paintedStyle`) or the **source** run (`getPaintedText`). A runtime that
 * accepted `textDecoration` and drew no line would leave the shipped `link`
 * Button variant's hover affordance invisible while the suite stayed green.
 *
 * The probe mounts four roles on one stage — no declaration, `underline`,
 * `line-through`, and the `link` variant's shape (a wrapper `div` that declares
 * `underline`) — decodes one frame per host, and classifies a decoration as a
 * continuous near-full-width ink row in a named band. Glyph rows are short
 * strokes, so they cannot qualify. The pure metric lives in
 * `text-decoration-model.ts`; capture and device-scale mapping are shared in
 * `frames.ts`.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
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
  type FrameReader,
} from "./frames.js";
import {
  DECORATION_FIXTURES,
  DECORATION_FONT_SIZE,
  DECORATION_PANEL_HEIGHT,
  DECORATION_PANEL_WIDTH,
  DECORATION_RUN,
  LINE_TOLERANCE,
  MIN_INK_PIXELS,
  STRIKE_BAND,
  UNDERLINE_BAND,
  anyDecoration,
  decorationFixtures,
  decorationFixturesDistinct,
  decorationPresent,
  hasInk,
  scanDecoration,
  type Band,
  type DecorationFixture,
  type DecorationScan,
} from "./text-decoration-model.js";

/** The stage's logical inset, so an outside point is not a panel. */
const STAGE_INSET = 20;

const TextDecorationProbe = () => {
  const theme = useTheme();
  const ink = theme.colors.foreground;
  return (
    <div
      testId="decoration-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      {DECORATION_FIXTURES.map((fixture) => (
        <div
          key={fixture.testId}
          testId={fixture.panelId}
          style={{
            position: "absolute",
            left: fixture.left,
            top: fixture.top,
            width: DECORATION_PANEL_WIDTH,
            height: DECORATION_PANEL_HEIGHT,
            padding: 8,
            backgroundColor: theme.colors.card,
          }}
        >
          {fixture.kind === "wrapper" ? (
            <div
              testId="decoration-inherited-box"
              style={{ textDecoration: "underline" }}
            >
              <DecorationRun testId={fixture.testId} colour={ink} />
            </div>
          ) : (
            <DecorationRun
              testId={fixture.testId}
              colour={ink}
              decoration={
                fixture.kind === "none"
                  ? undefined
                  : fixture.kind === "underline"
                    ? "underline"
                    : "line-through"
              }
            />
          )}
        </div>
      ))}
    </div>
  );
};

const DecorationRun = (props: {
  readonly testId: string;
  readonly colour: string;
  readonly decoration?: "underline" | "line-through";
}) => (
  <text
    testId={props.testId}
    style={{
      fontSize: DECORATION_FONT_SIZE,
      lineHeight: DECORATION_FONT_SIZE,
      color: props.colour,
      ...(props.decoration === undefined
        ? {}
        : { textDecoration: props.decoration }),
    }}
  >
    {DECORATION_RUN}
  </text>
);

export const textDecorationView = (): ReactNode => <TextDecorationProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface DecorationDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
}

const lineFailure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

const describe = (scan: DecorationScan): string =>
  Option.match(scan.widest, {
    onNone: () => `no ink row in ${scan.sampled} pixels`,
    onSome: (row) =>
      `widest ${row.span}px at y=${row.y.toFixed(2)} (${asHex(row.colour)})`,
  });

const expectLine = <Host,>(
  ctx: Smoke.SmokeContext<Host>,
  scan: DecorationScan,
  width: number,
  factor: number,
  band: Band,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.check(
    label,
    decorationPresent(scan, width, factor, band)
      ? Effect.void
      : lineFailure(
          label,
          `a line spanning >= ${Math.round(width * factor * 0.6)}px at y ${band[0]}..${band[1]}`,
          describe(scan),
        ),
  );

const expectLineInk = <Host,>(
  ctx: Smoke.SmokeContext<Host>,
  scan: DecorationScan,
  ink: Pixels.Rgba,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.check(
    label,
    Option.match(scan.widest, {
      onNone: () => lineFailure(label, asHex(ink), "no line to sample"),
      onSome: (row) =>
        Pixels.rgbaNear(row.colour, ink, LINE_TOLERANCE)
          ? Effect.void
          : lineFailure(label, asHex(ink), asHex(row.colour)),
    }),
  );

const fixtureOf = (kind: DecorationFixture["kind"]): DecorationFixture =>
  decorationFixtures[kind];

const decorationChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: DecorationDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    yield* ctx.expectEqual(
      "the decoration fixtures are distinct",
      decorationFixturesDistinct(DECORATION_FIXTURES),
      true,
    );
    const ink = yield* parseColour(
      "the foreground role parses",
      palettes.dark.colors.foreground,
    );
    const frame = yield* driver.capture();
    const window = yield* driver.reader.windowSize();
    const factor = yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    /**
     * Scan the fixture's **panel**, not the run's box.
     *
     * Measured: an underline is painted ~1.5 device px below the `<text>`'s
     * reported box (the line sits in the leading space under the baseline), so
     * a scan bounded by the run cannot see it. The panel contains the run and
     * its padding, and the four panels are disjoint.
     */
    const scanOf = (fixture: DecorationFixture) =>
      Effect.gen(function* () {
        const box = yield* paintedBox(ctx, driver.reader, fixture.panelId);
        return {
          scan: scanDecoration(frame, window, box, ink, LINE_TOLERANCE),
          width: box.width,
        };
      });

    const none = yield* scanOf(fixtureOf("none"));
    yield* ctx.check(
      "the undeclared run paints no line",
      anyDecoration(none.scan, none.width, factor)
        ? lineFailure(
            "the undeclared run paints no line",
            "no near-full-width ink row",
            describe(none.scan),
          )
        : Effect.void,
    );
    yield* ctx.expectEqual(
      "the undeclared run has ink",
      hasInk(none.scan, MIN_INK_PIXELS),
      true,
    );

    const underline = yield* scanOf(fixtureOf("underline"));
    yield* expectLine(
      ctx,
      underline.scan,
      underline.width,
      factor,
      UNDERLINE_BAND,
      "the underline paints a line in its band",
    );
    yield* expectLineInk(
      ctx,
      underline.scan,
      ink,
      "the underline carries the run's ink",
    );

    const strike = yield* scanOf(fixtureOf("strike"));
    yield* expectLine(
      ctx,
      strike.scan,
      strike.width,
      factor,
      STRIKE_BAND,
      "the line-through paints a line in its band",
    );
    yield* expectLineInk(
      ctx,
      strike.scan,
      ink,
      "the line-through carries the run's ink",
    );

    yield* ctx.check(
      "the underline sits below the line-through",
      Option.match(Option.all([underline.scan.widest, strike.scan.widest]), {
        onNone: () =>
          lineFailure(
            "the underline sits below the line-through",
            "two measured lines",
            `${describe(underline.scan)} / ${describe(strike.scan)}`,
          ),
        onSome: ([under, through]) =>
          under.y > through.y
            ? Effect.void
            : lineFailure(
                "the underline sits below the line-through",
                "the underline's y greater than the line-through's",
                `${under.y.toFixed(2)} <= ${through.y.toFixed(2)}`,
              ),
      }),
    );

    const inherited = yield* scanOf(fixtureOf("wrapper"));
    yield* expectLine(
      ctx,
      inherited.scan,
      inherited.width,
      factor,
      UNDERLINE_BAND,
      "the wrapper's decoration reaches its child run",
    );

    const stageBox = yield* paintedBox(ctx, driver.reader, "decoration-stage");
    yield* expectColour(
      ctx,
      "the stage point is the background token",
      yield* pixelAtPoint(
        ctx,
        frame,
        window,
        stageBox.x + stageBox.width - STAGE_INSET,
        stageBox.y + stageBox.height - STAGE_INSET,
        "the stage point",
      ),
      yield* parseColour(
        "the background role parses",
        palettes.dark.colors.background,
      ),
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): DecorationDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): DecorationDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const textDecorationScenario: PlaygroundScenario = {
  id: "text-decoration-pixels",
  title: "Text decoration: underline and line-through reach the frame",
  capability: "text",
  view: textDecorationView,
  steps: (ctx) => decorationChecks(ctx, headlessDriver(ctx.host)),
};

export const textDecorationLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-text-decoration",
  title: "Live text decoration: underline and line-through in a window",
  capability: "text",
  steps: (ctx) => decorationChecks(ctx, liveDriver(ctx.host)),
};
