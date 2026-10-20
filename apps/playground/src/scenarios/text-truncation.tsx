/**
 * `text-truncation-pixels` / `live-truncation`: does truncation paint an
 * ellipsis glyph, and does a constrained run keep its ink inside its box?
 *
 * Plan `335` measured truncation as **geometry** and recorded that
 * `getPaintedText()` returns the source run, so the `…` was never asserted. A
 * runtime that clipped the glyph run instead of drawing an ellipsis would pass
 * every existing check while every truncated label ended mid-glyph.
 *
 * This probe mounts four runs on one static stage, decodes one frame per host,
 * and compares each run's right-edge ink profile: a dot run is short, a clipped
 * capital is tall. It also scans the strip beside each box for ink, so a run
 * that paints past its layout box fails by name. The metric and the fixtures
 * live in `truncation-model.ts`; capture is the shared `frames.ts` chain.
 */
import { Duration, Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
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
  EDGE_BAND,
  MIN_INK_PIXELS,
  TRUNCATION_BOX_HEIGHT,
  TRUNCATION_BOX_WIDTH,
  TRUNCATION_FIXTURES,
  TRUNCATION_FONT_SIZE,
  TRUNCATION_PANEL_HEIGHT,
  TRUNCATION_PANEL_WIDTH,
  TRUNCATION_TOLERANCE,
  describeProfile,
  edgeProfile,
  hasInk,
  looksClipped,
  looksLikeDots,
  noSpill,
  scanBox,
  spillScan,
  truncationFixtures,
  truncationFixturesDistinct,
  type EdgeProfile,
  type SpillScan,
  type TruncationFixture,
  type TruncationKind,
} from "./truncation-model.js";

/** The stage's logical inset, so an outside point is not a panel. */
const STAGE_INSET = 20;

const TruncationRun = (props: {
  readonly fixture: TruncationFixture;
  readonly colour: string;
}) => (
  <div
    testId={props.fixture.boxId}
    style={{
      width: TRUNCATION_BOX_WIDTH,
      height: TRUNCATION_BOX_HEIGHT,
      ...(props.fixture.clipBox ? { overflow: "hidden" } : {}),
    }}
  >
    <text
      testId={props.fixture.testId}
      style={{
        fontSize: TRUNCATION_FONT_SIZE,
        lineHeight: TRUNCATION_FONT_SIZE,
        color: props.colour,
        whiteSpace: "nowrap",
        ...(props.fixture.textOverflow === undefined
          ? {}
          : { textOverflow: props.fixture.textOverflow }),
      }}
    >
      {props.fixture.run}
    </text>
  </div>
);

const TextTruncationProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="truncation-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      {TRUNCATION_FIXTURES.map((fixture) => (
        <div
          key={fixture.testId}
          testId={fixture.panelId}
          style={{
            position: "absolute",
            left: fixture.left,
            top: fixture.top,
            width: TRUNCATION_PANEL_WIDTH,
            height: TRUNCATION_PANEL_HEIGHT,
            padding: 8,
            backgroundColor: theme.colors.card,
            ...(fixture.clipPanel ? { overflow: "hidden" } : {}),
          }}
        >
          <TruncationRun fixture={fixture} colour={theme.colors.foreground} />
        </div>
      ))}
    </div>
  );
};

export const textTruncationView = (): ReactNode => <TextTruncationProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface TruncationDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
}

const failure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

interface Measurement {
  readonly fixture: TruncationFixture;
  readonly profile: EdgeProfile;
  readonly spill: SpillScan;
}

const measure = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: TruncationDriver<E>,
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  ink: Pixels.Rgba,
  kind: TruncationKind,
): Effect.Effect<Measurement, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const fixture = truncationFixtures[kind];
    const box = yield* paintedBox(ctx, driver.reader, fixture.testId);
    const panel = yield* paintedBox(ctx, driver.reader, fixture.panelId);
    return {
      fixture,
      profile: edgeProfile(
        frame,
        window,
        box,
        ink,
        TRUNCATION_TOLERANCE,
        EDGE_BAND,
      ),
      spill: spillScan(frame, window, box, panel, ink, TRUNCATION_TOLERANCE),
    };
  });

const truncationChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: TruncationDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    yield* ctx.expectEqual(
      "the truncation fixtures are distinct",
      truncationFixturesDistinct(TRUNCATION_FIXTURES),
      true,
    );
    const ink = yield* parseColour(
      "the foreground role parses",
      palettes.dark.colors.foreground,
    );
    const frame = yield* driver.capture();
    const window = yield* driver.reader.windowSize();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const ellipsis = yield* measure(
      ctx,
      driver,
      frame,
      window,
      ink,
      "ellipsis",
    );
    const clip = yield* measure(ctx, driver, frame, window, ink, "clip");
    const nowrap = yield* measure(ctx, driver, frame, window, ink, "nowrap");
    const short = yield* measure(ctx, driver, frame, window, ink, "short");

    const shortBox = yield* paintedBox(
      ctx,
      driver.reader,
      short.fixture.testId,
    );
    const shortInk = scanBox(
      frame,
      window,
      shortBox,
      ink,
      TRUNCATION_TOLERANCE,
    );
    yield* ctx.check(
      "the short control paints ink",
      hasInk(
        {
          sampled: shortInk.sampled,
          ink: shortInk.ink,
          columnRatio: 0,
          rowRatio: 0,
        },
        MIN_INK_PIXELS,
      )
        ? Effect.void
        : failure(
            "the short control paints ink",
            `>= ${MIN_INK_PIXELS} ink pixels`,
            `${shortInk.ink}/${shortInk.sampled}`,
          ),
    );

    yield* ctx.check(
      "the short control's right edge is blank",
      short.profile.ink === 0
        ? Effect.void
        : failure(
            "the short control's right edge is blank",
            "0 ink pixels in the edge band",
            describeProfile(short.profile),
          ),
    );
    yield* ctx.check(
      "the ellipsis paints a dot run at the right edge",
      looksLikeDots(ellipsis.profile)
        ? Effect.void
        : failure(
            "the ellipsis paints a dot run at the right edge",
            "a short ink column like an ellipsis dot",
            describeProfile(ellipsis.profile),
          ),
    );
    yield* ctx.check(
      "the clipped run's right edge is taller than the ellipsis's",
      clip.profile.columnRatio > ellipsis.profile.columnRatio &&
        looksClipped(clip.profile)
        ? Effect.void
        : failure(
            "the clipped run's right edge is taller than the ellipsis's",
            "a clipped capital taller than the ellipsis dot",
            `${describeProfile(clip.profile)} vs ${describeProfile(ellipsis.profile)}`,
          ),
    );
    yield* ctx.check(
      "the ellipsis paints no ink outside its box",
      noSpill(ellipsis.spill)
        ? Effect.void
        : failure(
            "the ellipsis paints no ink outside its box",
            "0 ink pixels beside the box",
            `${ellipsis.spill.ink}/${ellipsis.spill.sampled}`,
          ),
    );
    yield* ctx.check(
      "the clipped run paints no ink outside its box",
      noSpill(clip.spill)
        ? Effect.void
        : failure(
            "the clipped run paints no ink outside its box",
            "0 ink pixels beside the box",
            `${clip.spill.ink}/${clip.spill.sampled}`,
          ),
    );

    const stageBox = yield* paintedBox(ctx, driver.reader, "truncation-stage");
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

    /**
     * Measured: without a clip or a `textOverflow`, the glyph run paints
     * **into the strip beside its box** (1922 ink pixels here), while the
     * panel's clip keeps it on screen. A consumer that wants truncation must
     * supply one of the two; this check guards that measured leak, so a
     * runtime that starts clipping automatically fails here and the claim is
     * re-measured.
     */
    yield* ctx.check(
      "an unclipped nowrap run paints outside its box",
      nowrap.spill.ink > 0
        ? Effect.void
        : failure(
            "an unclipped nowrap run paints outside its box",
            "> 0 ink pixels beside the box",
            `${nowrap.spill.ink}/${nowrap.spill.sampled}`,
          ),
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): TruncationDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): TruncationDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const textTruncationPixelsScenario: PlaygroundScenario = {
  id: "text-truncation-pixels",
  title: "Text truncation: the ellipsis glyph and the box's ink",
  capability: "truncation",
  view: textTruncationView,
  steps: (ctx) => truncationChecks(ctx, headlessDriver(ctx.host)),
};

export const textTruncationPixelsLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-truncation-pixels",
  title: "Live text truncation: the ellipsis glyph in a window",
  capability: "truncation",
  steps: (ctx) => truncationChecks(ctx, liveDriver(ctx.host)),
};
