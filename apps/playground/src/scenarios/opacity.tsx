/**
 * `opacity-pixels` / `live-opacity-pixels`: does a declared `opacity` reach the
 * frame, and does it dim the whole subtree?
 *
 * Eleven shipped surfaces express **disabled** as nothing but
 * `opacity: disabled ? 0.5 : 1` (`list.tsx`, `tabs.tsx`, `accordion.tsx`,
 * `menu/item.tsx`, `context-menu.tsx`, `combobox.tsx`, `search-input.tsx`,
 * `time-picker.tsx`, `inline-edit.tsx`, `hotkey-recorder.tsx`). Everything the
 * suite knows about those states is inertness, tab order and the **authored**
 * style report — a runtime that accepted `opacity` and dropped it would leave
 * every disabled control looking enabled.
 *
 * This probe samples one static frame in each host: an opaque fill paints its
 * token, a half-opacity fill paints the straight sRGB blend, a child is dimmed
 * **with** its parent, and two nested halves multiply. The blends and the
 * distinctness guards are pure (`opacity-pixels.ts`); capture, scale mapping and
 * comparison are the shared chain in `frames.ts`.
 */
import { Duration, Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  TOLERANCE,
  captureHeadless,
  captureLive,
  expectColour,
  expectPixel,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import {
  DISABLED_OPACITY,
  distinctRoles,
  distinguishable,
  nestedPaint,
  opacityBlend,
  opacityFixtures,
} from "./opacity-pixels.js";

const BOX_HEIGHT = 64;
const ROW_ONE = 40;
const ROW_TWO = 160;
const ROW_THREE = 240;
const NESTED_WIDTH = 240;
const CHILD_WIDTH = 80;
const STAGE_POINT = { x: 520, y: 320 } as const;

const box = (left: number, top: number, width: number, fill: string) => ({
  position: "absolute" as const,
  left,
  top,
  width,
  height: BOX_HEIGHT,
  backgroundColor: fill,
});

const OpacityProbe = () => {
  const theme = useTheme();
  const fixtures = opacityFixtures(theme.colors);
  return (
    <div
      testId="op-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      <div testId="op-rest" style={box(40, ROW_ONE, 140, fixtures.rest)} />
      <div
        testId="op-half"
        style={{
          ...box(200, ROW_ONE, 140, fixtures.half),
          opacity: DISABLED_OPACITY,
        }}
      />
      <div testId="op-away" style={box(360, ROW_ONE, 140, fixtures.away)} />
      <div
        testId="op-parent"
        style={{
          ...box(40, ROW_TWO, NESTED_WIDTH, fixtures.parent),
          opacity: DISABLED_OPACITY,
        }}
      >
        <div
          testId="op-child"
          style={{
            width: CHILD_WIDTH,
            height: BOX_HEIGHT,
            backgroundColor: fixtures.child,
          }}
        />
      </div>
      <div
        testId="op-nested"
        style={{
          ...box(40, ROW_THREE, NESTED_WIDTH, fixtures.nested),
          opacity: DISABLED_OPACITY,
        }}
      >
        <div
          testId="op-nested-child"
          style={{
            width: CHILD_WIDTH,
            height: BOX_HEIGHT,
            backgroundColor: fixtures.nestedChild,
            opacity: DISABLED_OPACITY,
          }}
        />
      </div>
    </div>
  );
};

export const opacityView = (): ReactNode => <OpacityProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface OpacityDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
}

const opacityChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: OpacityDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const colors = palettes.dark.colors;
    const fixtures = opacityFixtures(colors);
    const background = yield* parseColour(
      "the stage role parses",
      colors.background,
    );
    const rest = yield* parseColour("the fill role parses", fixtures.rest);
    const away = yield* parseColour("the neighbour role parses", fixtures.away);
    const child = yield* parseColour("the child role parses", fixtures.child);
    const half = opacityBlend(rest, DISABLED_OPACITY, background);
    const dimmedChild = opacityBlend(child, DISABLED_OPACITY, background);
    const nested = nestedPaint(
      rest,
      away,
      DISABLED_OPACITY,
      DISABLED_OPACITY,
      background,
    );

    yield* ctx.expectEqual(
      "the sampled roles are distinct",
      distinctRoles(fixtures),
      true,
    );
    yield* ctx.expectEqual(
      "a disabled fill is distinguishable from the full fill",
      distinguishable(half, rest, TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "a dimmed child is distinguishable from an undimmed one",
      distinguishable(dimmedChild, child, TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "a doubled opacity is distinguishable from a single one",
      distinguishable(nested, half, TOLERANCE),
      true,
    );

    const frame = yield* driver.capture();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, yield* driver.reader.windowSize()),
    );

    yield* expectPixel(
      ctx,
      "an opaque box paints its token",
      driver.reader,
      frame,
      "op-rest",
      rest,
    );
    yield* expectPixel(
      ctx,
      "a disabled fill is half its colour",
      driver.reader,
      frame,
      "op-half",
      half,
    );
    yield* expectPixel(
      ctx,
      "a dimmed fill leaves its neighbour alone",
      driver.reader,
      frame,
      "op-away",
      away,
    );
    yield* expectPixel(
      ctx,
      "a child is dimmed with its parent",
      driver.reader,
      frame,
      "op-child",
      dimmedChild,
    );
    yield* expectPixel(
      ctx,
      "nested opacities multiply",
      driver.reader,
      frame,
      "op-nested-child",
      nested,
    );

    const stage = yield* paintedBox(ctx, driver.reader, "op-stage");
    yield* expectColour(
      ctx,
      "the stage point is the background token",
      yield* pixelAtPoint(
        ctx,
        frame,
        yield* driver.reader.windowSize(),
        stage.x + STAGE_POINT.x,
        stage.y + STAGE_POINT.y,
        "the stage point",
      ),
      background,
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): OpacityDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): OpacityDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const opacityScenario: PlaygroundScenario = {
  id: "opacity-pixels",
  title: "Declared opacity: the disabled fill, its subtree and a nested pair",
  capability: "states",
  view: opacityView,
  steps: (ctx) => opacityChecks(ctx, headlessDriver(ctx.host)),
};

export const opacityLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-opacity-pixels",
  title: "Live opacity pixels: disabled fills and the subtree in a window",
  capability: "states",
  steps: (ctx) => opacityChecks(ctx, liveDriver(ctx.host)),
};
