/**
 * `text-ink-pixels` / `live-text-ink`: does a `<text>` run's declared `color`
 * reach the glyph pixels?
 *
 * Every existing text check reads the **authored** style or the **source** run.
 * A runtime that accepted `color` and rasterised every run in a default ink
 * would pass all of them while `foreground`, `mutedForeground`, `destructive`
 * and `success` text painted identically.
 *
 * This probe mounts four role-coloured runs on one static stage, decodes one
 * frame per host, and scans each run's painted box for pixels carrying its own
 * token — then scans for the **next** role's token and requires none. The pure
 * scan, the roles and the separation guard live in `text-ink-model.ts`; capture,
 * device-scale mapping and comparison are the shared chain in `frames.ts`.
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
  asHex,
  type FrameReader,
} from "./frames.js";
import {
  INK_FIXTURES,
  INK_FONT_SIZE,
  INK_RUN,
  INK_TOLERANCE,
  MIN_INK_PIXELS,
  distinctInk,
  inkEvidence,
  inkFixtures,
  INK_PANEL_HEIGHT,
  INK_PANEL_WIDTH,
  inkRoles,
  nextRole,
  scanInk,
  type InkFixture,
  type InkRole,
} from "./text-ink-model.js";

/** The stage's logical inset, so an outside point is not a panel. */
const STAGE_INSET = 20;

const TextInkProbe = () => {
  const theme = useTheme();
  const fixtures = inkFixtures(theme.colors);
  return (
    <div
      testId="ink-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      {INK_FIXTURES.map((fixture) => (
        <div
          key={fixture.testId}
          testId={fixture.panelId}
          style={{
            position: "absolute",
            left: fixture.left,
            top: fixture.top,
            width: INK_PANEL_WIDTH,
            height: INK_PANEL_HEIGHT,
            padding: 8,
            backgroundColor: theme.colors.card,
          }}
        >
          <text
            testId={fixture.testId}
            style={{
              fontSize: INK_FONT_SIZE,
              lineHeight: INK_FONT_SIZE,
              color: fixtures[fixture.role],
            }}
          >
            {INK_RUN}
          </text>
        </div>
      ))}
    </div>
  );
};

export const textInkView = (): ReactNode => <TextInkProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface InkDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
}

const inkFailure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

const expectRunInk = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  fixture: InkFixture,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, reader, fixture.testId);
    const scan = scanInk(
      frame,
      yield* reader.windowSize(),
      box,
      expected,
      INK_TOLERANCE,
    );
    const label = `the ${fixture.role} run carries its token in the frame`;
    yield* ctx.check(
      label,
      inkEvidence(scan, MIN_INK_PIXELS)
        ? Effect.void
        : inkFailure(
            label,
            `at least ${MIN_INK_PIXELS} pixels near ${asHex(expected)}`,
            `${scan.near}/${scan.sampled} pixels, closest ${asHex(scan.closest)}`,
          ),
    );
  });

const expectNoForeignInk = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  fixture: InkFixture,
  foreign: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, reader, fixture.testId);
    const other = nextRole(fixture.role);
    const scan = scanInk(
      frame,
      yield* reader.windowSize(),
      box,
      foreign,
      INK_TOLERANCE,
    );
    const label = `the ${fixture.role} run does not paint the ${other} token`;
    yield* ctx.check(
      label,
      scan.near === 0
        ? Effect.void
        : inkFailure(
            label,
            "no pixel near the foreign token",
            `${scan.near}/${scan.sampled} pixels, closest ${asHex(scan.closest)}`,
          ),
    );
  });

const inkChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: InkDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const fixtures = inkFixtures(palettes.dark.colors);
    const colours: Record<InkRole, Pixels.Rgba> = {
      foreground: yield* parseColour(
        "the foreground role parses",
        fixtures.foreground,
      ),
      muted: yield* parseColour("the muted role parses", fixtures.muted),
      destructive: yield* parseColour(
        "the destructive role parses",
        fixtures.destructive,
      ),
      success: yield* parseColour("the success role parses", fixtures.success),
    };

    yield* ctx.expectEqual(
      "the four ink roles are distinct",
      distinctInk(fixtures),
      true,
    );
    const pairs = inkRoles.flatMap((role, index) =>
      inkRoles
        .slice(index + 1)
        .map((other) => [colours[role], colours[other]] as const),
    );
    yield* ctx.expectEqual(
      "every pair of roles is far enough apart to fail a swap",
      pairs.every(
        ([left, right]) => !Pixels.rgbaNear(left, right, INK_TOLERANCE * 2),
      ),
      true,
    );

    const frame = yield* driver.capture();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, yield* driver.reader.windowSize()),
    );

    yield* Effect.forEach(
      INK_FIXTURES,
      (fixture) =>
        Effect.gen(function* () {
          yield* expectRunInk(
            ctx,
            driver.reader,
            frame,
            fixture,
            colours[fixture.role],
          );
          yield* expectNoForeignInk(
            ctx,
            driver.reader,
            frame,
            fixture,
            colours[nextRole(fixture.role)],
          );
        }),
      { concurrency: 1 },
    );

    const stage = yield* paintedBox(ctx, driver.reader, "ink-stage");
    yield* expectColour(
      ctx,
      "the stage point is the background token",
      yield* pixelAtPoint(
        ctx,
        frame,
        yield* driver.reader.windowSize(),
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

const headlessDriver = (host: Smoke.SmokeHost): InkDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): InkDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const textInkScenario: PlaygroundScenario = {
  id: "text-ink-pixels",
  title: "Text ink: the glyphs carry the requested role",
  capability: "text",
  view: textInkView,
  steps: (ctx) => inkChecks(ctx, headlessDriver(ctx.host)),
};

export const textInkLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-text-ink",
  title: "Live text ink: the glyphs carry the requested role in a window",
  capability: "text",
  steps: (ctx) => inkChecks(ctx, liveDriver(ctx.host)),
};
