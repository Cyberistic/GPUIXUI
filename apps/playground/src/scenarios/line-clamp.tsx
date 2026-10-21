/**
 * `line-clamp-pixels` / `live-line-clamp`: what a multi-line clamp paints
 * (plan `829`).
 *
 * The bug being guarded: `lineClamp` was only ever measured as geometry (plan
 * `335`), and the single-line ellipsis (plan `778`) says nothing about a run
 * clamped at two or three lines. A runtime that stopped laying out at N lines
 * but kept painting, or one that grew an ellipsis from the clamp alone, passed
 * every existing check while every clamped label either overpainted the row
 * below or lost its mark.
 *
 * This probe mounts four runs on one static stage, decodes one frame per host,
 * and reads each box's ink row bands and its last line's tail: the clamped boxes
 * must hold N bands and **no ink below their box**, while the unclamped control
 * proves the scan is not vacuous. The fixtures and the metric live in
 * `line-clamp-model.ts`; capture is the shared `frames.ts` chain.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
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
  CLAMP_BOX_WIDTH,
  CLAMP_FIXTURES,
  CLAMP_FONT_SIZE,
  CLAMP_LINE_HEIGHT,
  CLAMP_PANEL_HEIGHT,
  CLAMP_PANEL_WIDTH,
  CLAMP_TOLERANCE,
  DOT_GAP_CEILING,
  DOT_HEIGHT_CEILING,
  DOT_TOP_FLOOR,
  GLYPH_TAIL_FLOOR,
  TAIL_BAND,
  bandPitches,
  clampFixtures,
  describeClusters,
  describePitches,
  dotRun,
  expectedHeight,
  expectedLines,
  fixturesDistinct,
  glyphTail,
  hasInk,
  inkBands,
  inkInStrip,
  isEllipsis,
  lastLineOf,
  noInk,
  stripAfterLines,
  stripBelow,
  tailClusters,
  uniformPitch,
  type ClampFixture,
  type ClampKind,
  type DotRun,
  type InkBand,
  type InkCluster,
  type StripScan,
} from "./line-clamp-model.js";

/** The stage's logical inset, so an outside point is not a panel. */
const STAGE_INSET = 20;

/** The mark's line height in device pixels, the denominator of every ratio. */
const lineHeightPx = (factor: number): number => CLAMP_LINE_HEIGHT * factor;

const ClampRun = (props: {
  readonly fixture: ClampFixture;
  readonly colour: string;
}) => (
  <div testId={props.fixture.testId} style={{ width: CLAMP_BOX_WIDTH }}>
    <text
      testId={`${props.fixture.testId}-text`}
      style={{
        fontSize: CLAMP_FONT_SIZE,
        lineHeight: CLAMP_LINE_HEIGHT,
        color: props.colour,
        ...(props.fixture.clamp === undefined
          ? {}
          : { lineClamp: props.fixture.clamp }),
        ...(props.fixture.ellipsis
          ? { textOverflow: "ellipsis" as const }
          : {}),
      }}
    >
      {props.fixture.run}
    </text>
  </div>
);

const LineClampProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="clamp-stage"
      style={{
        position: "relative",
        width: 640,
        height: 400,
        backgroundColor: theme.colors.background,
      }}
    >
      {CLAMP_FIXTURES.map((fixture) => (
        <div
          key={fixture.testId}
          testId={fixture.panelId}
          style={{
            position: "absolute",
            left: fixture.left,
            top: fixture.top,
            width: CLAMP_PANEL_WIDTH,
            height: CLAMP_PANEL_HEIGHT,
            padding: 8,
            backgroundColor: theme.colors.card,
          }}
        >
          <ClampRun fixture={fixture} colour={theme.colors.foreground} />
        </div>
      ))}
    </div>
  );
};

export const lineClampView = (): ReactNode => <LineClampProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface ClampDriver<E> {
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
  readonly fixture: ClampFixture;
  readonly box: Smoke.Bounds;
  readonly panel: Smoke.Bounds;
  readonly bands: ReadonlyArray<InkBand>;
  readonly below: StripScan;
  readonly clusters: ReadonlyArray<InkCluster>;
  readonly dots: DotRun;
  readonly tail: number;
}

const measure = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: ClampDriver<E>,
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  ink: Pixels.Rgba,
  factor: number,
  kind: ClampKind,
): Effect.Effect<Measurement, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const fixture = clampFixtures[kind];
    const box = yield* paintedBox(ctx, driver.reader, fixture.testId);
    const panel = yield* paintedBox(ctx, driver.reader, fixture.panelId);
    const clusters = tailClusters(
      frame,
      window,
      lastLineOf(box),
      ink,
      CLAMP_TOLERANCE,
      TAIL_BAND,
    );
    return {
      fixture,
      box,
      panel,
      bands: inkBands(frame, window, box, ink, CLAMP_TOLERANCE),
      below: inkInStrip(
        frame,
        window,
        stripBelow(box, panel),
        ink,
        CLAMP_TOLERANCE,
      ),
      clusters,
      dots: dotRun(clusters, lineHeightPx(factor)),
      tail: glyphTail(clusters, lineHeightPx(factor)),
    };
  });

const clampChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: ClampDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    yield* ctx.expectEqual(
      "the line-clamp fixtures are distinct",
      fixturesDistinct(CLAMP_FIXTURES),
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

    const cut = yield* measure(ctx, driver, frame, window, ink, factor, "cut");
    const mark = yield* measure(
      ctx,
      driver,
      frame,
      window,
      ink,
      factor,
      "mark",
    );
    const three = yield* measure(
      ctx,
      driver,
      frame,
      window,
      ink,
      factor,
      "three",
    );
    const free = yield* measure(
      ctx,
      driver,
      frame,
      window,
      ink,
      factor,
      "free",
    );

    // 1. The box is exactly the declared number of line boxes.
    yield* ctx.expectNear(
      "clamp 2 measures two line boxes",
      cut.box.height,
      expectedHeight(cut.fixture),
      1,
    );
    yield* ctx.expectNear(
      "the marked clamp measures two line boxes",
      mark.box.height,
      expectedHeight(mark.fixture),
      1,
    );
    yield* ctx.expectNear(
      "clamp 3 measures three line boxes",
      three.box.height,
      expectedHeight(three.fixture),
      1,
    );
    yield* ctx.expectNear(
      "the unclamped control measures four line boxes",
      free.box.height,
      expectedHeight(free.fixture),
      1,
    );

    // 2. Every line paints exactly one ink band.
    yield* ctx.expectEqual(
      "clamp 2 paints two ink bands",
      Arr.length(cut.bands),
      expectedLines(cut.fixture),
    );
    yield* ctx.expectEqual(
      "the marked clamp paints two ink bands",
      Arr.length(mark.bands),
      expectedLines(mark.fixture),
    );
    yield* ctx.expectEqual(
      "clamp 3 paints three ink bands",
      Arr.length(three.bands),
      expectedLines(three.fixture),
    );
    yield* ctx.expectEqual(
      "the unclamped control paints four ink bands",
      Arr.length(free.bands),
      expectedLines(free.fixture),
    );

    // 3. The bands sit on the declared line pitch.
    const pitches = bandPitches(free.bands);
    yield* ctx.check(
      "the line pitch is the declared line height",
      uniformPitch(pitches, lineHeightPx(factor))
        ? Effect.void
        : failure(
            "the line pitch is the declared line height",
            `${lineHeightPx(factor)} px between every band`,
            describePitches(pitches),
          ),
    );

    // 4. A clamp stops the paint, not just the layout.
    yield* ctx.check(
      "clamp 2 paints no ink below its box",
      noInk(cut.below)
        ? Effect.void
        : failure(
            "clamp 2 paints no ink below its box",
            "0 ink pixels below the box",
            `${cut.below.ink}/${cut.below.sampled}`,
          ),
    );
    yield* ctx.check(
      "the marked clamp paints no ink below its box",
      noInk(mark.below)
        ? Effect.void
        : failure(
            "the marked clamp paints no ink below its box",
            "0 ink pixels below the box",
            `${mark.below.ink}/${mark.below.sampled}`,
          ),
    );
    yield* ctx.check(
      "clamp 3 paints no ink below its box",
      noInk(three.below)
        ? Effect.void
        : failure(
            "clamp 3 paints no ink below its box",
            "0 ink pixels below the box",
            `${three.below.ink}/${three.below.sampled}`,
          ),
    );

    // 5. The same strip holds ink when nothing clamps: the no-ink scan is real.
    const freeBelow = inkInStrip(
      frame,
      window,
      stripAfterLines(free.box, 2, free.panel),
      ink,
      CLAMP_TOLERANCE,
    );
    yield* ctx.check(
      "the unclamped control paints below the two-line mark",
      hasInk(freeBelow)
        ? Effect.void
        : failure(
            "the unclamped control paints below the two-line mark",
            "> 0 ink pixels below the two-line mark",
            `${freeBelow.ink}/${freeBelow.sampled}`,
          ),
    );

    // 6. A clamp alone hard-cuts; only `textOverflow` paints the mark.
    yield* ctx.check(
      "clamp 2 paints no ellipsis",
      cut.dots.count === 0 && cut.tail >= GLYPH_TAIL_FLOOR
        ? Effect.void
        : failure(
            "clamp 2 paints no ellipsis",
            `no dot run and a glyph tail >= ${GLYPH_TAIL_FLOOR} line`,
            `dots=${cut.dots.count} tail=${cut.tail.toFixed(2)} ${describeClusters(cut.clusters)}`,
          ),
    );
    yield* ctx.check(
      "the marked clamp paints exactly three dots",
      isEllipsis(mark.dots, lineHeightPx(factor))
        ? Effect.void
        : failure(
            "the marked clamp paints exactly three dots",
            `three dots <= ${DOT_HEIGHT_CEILING} line tall, top >= ${DOT_TOP_FLOOR} line, gaps <= ${DOT_GAP_CEILING} line`,
            `dots=${mark.dots.count} gaps=${Arr.join(
              Arr.map(mark.dots.gaps, (gap) => `${gap}`),
              ",",
            )} span=${mark.dots.span} ${describeClusters(mark.clusters)}`,
          ),
    );
    yield* ctx.check(
      "clamp 3 paints no ellipsis",
      three.dots.count === 0 && three.tail >= GLYPH_TAIL_FLOOR
        ? Effect.void
        : failure(
            "clamp 3 paints no ellipsis",
            `no dot run and a glyph tail >= ${GLYPH_TAIL_FLOOR} line`,
            `dots=${three.dots.count} tail=${three.tail.toFixed(2)} ${describeClusters(three.clusters)}`,
          ),
    );

    // 7. The stage is the token, so a blank capture cannot pass as a clamp.
    const stageBox = yield* paintedBox(ctx, driver.reader, "clamp-stage");
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

const headlessDriver = (host: Smoke.SmokeHost): ClampDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): ClampDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const lineClampPixelsScenario: PlaygroundScenario = {
  id: "line-clamp-pixels",
  title: "Line clamp: the hard cut, the ellipsis mark and the ink below",
  capability: "truncation",
  view: lineClampView,
  steps: (ctx) => clampChecks(ctx, headlessDriver(ctx.host)),
};

export const lineClampPixelsLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-line-clamp",
  title: "Live line clamp: the cut, the mark and the ink below in a window",
  capability: "truncation",
  steps: (ctx) => clampChecks(ctx, liveDriver(ctx.host)),
};
