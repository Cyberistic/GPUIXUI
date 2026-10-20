/**
 * `state-pixels` / `live-state-pixels`: do declared hover and active colours
 * reach the frame?
 *
 * `declared-styles` / `live-states` (plan `557`) prove the hover and active
 * refinements on a **layout** property: hovering grows `100 → 140` and pressing
 * `180`. Plan `335` also measured that the runtime's style report keeps the
 * **authored** colour while hovered, so the usual use of the refinement — a
 * colour-only fill — was never asserted anywhere. A runtime that applied the
 * refinement but dropped its `backgroundColor` would pass every existing check
 * while 30 `hover:` and 39 `active:` declarations across the shipped library
 * painted nothing.
 *
 * This probe decodes the frame in each pointer state instead: the hover fill
 * replaces and reverts, hover is owned per element, active paints, and active
 * wins over hover. The state precedence and the fixture roles are pure
 * (`state-pixels.ts`); capture, scale mapping and colour comparison are the
 * shared chain in `frames.ts`.
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
  pixelAtId,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import {
  hasDistinctStates,
  resolveStateColour,
  stateFixtures,
  type StateColours,
} from "./state-pixels.js";

/** A logical window point. */
interface Point {
  readonly x: number;
  readonly y: number;
}

const BOX_HEIGHT = 72;
const ROW_ONE = 40;
const ROW_TWO = 160;

/** The runtime's two refinements, or nothing when the chain declares neither. */
const refinements = (chain: StateColours) => ({
  ...(chain.hover === undefined
    ? {}
    : { hover: { backgroundColor: chain.hover } }),
  ...(chain.active === undefined
    ? {}
    : { active: { backgroundColor: chain.active } }),
});

const boxStyle = (
  left: number,
  top: number,
  width: number,
  chain: StateColours,
) => ({
  position: "absolute" as const,
  left,
  top,
  width,
  height: BOX_HEIGHT,
  backgroundColor: chain.rest,
  ...refinements(chain),
});

const StateColourProbe = () => {
  const theme = useTheme();
  const fixtures = stateFixtures(theme.colors);
  const rest: StateColours = { rest: fixtures.hover.rest };
  return (
    <div
      testId="state-stage"
      style={{
        position: "relative",
        width: 640,
        height: 360,
        backgroundColor: theme.colors.background,
      }}
    >
      <div testId="state-rest" style={boxStyle(40, ROW_ONE, 140, rest)} />
      <div
        testId="state-hover"
        style={boxStyle(200, ROW_ONE, 140, fixtures.hover)}
      />
      <div testId="state-away" style={boxStyle(360, ROW_ONE, 140, rest)} />
      <div
        testId="state-parent"
        style={{
          ...boxStyle(40, ROW_TWO, 280, fixtures.parent),
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          testId="state-child"
          style={{
            width: 120,
            height: BOX_HEIGHT,
            backgroundColor: fixtures.child.rest,
            ...refinements(fixtures.child),
          }}
        />
      </div>
      <div
        testId="state-press"
        style={boxStyle(360, ROW_TWO, 140, fixtures.press)}
      />
    </div>
  );
};

export const stateColourView = (): ReactNode => <StateColourProbe />;

/**
 * The host verbs the shared checks need.
 *
 * The two hosts differ only in whether a verb is a value or an Effect and in
 * the settle a window needs before its paint commits; the claims are identical.
 */
interface StateDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly hover: (testId: string) => Effect.Effect<void, E>;
  readonly pressAt: (point: Point) => Effect.Effect<void, E>;
  readonly releaseAt: (point: Point) => Effect.Effect<void, E>;
}

const stateChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: StateDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const fixtures = stateFixtures(palettes.dark.colors);

    yield* ctx.expectEqual(
      "the hover fixture's states are distinguishable",
      hasDistinctStates(fixtures.hover),
      true,
    );
    yield* ctx.expectEqual(
      "the parent fixture's states are distinguishable",
      hasDistinctStates(fixtures.parent),
      true,
    );
    yield* ctx.expectEqual(
      "the child fixture's states are distinguishable",
      hasDistinctStates(fixtures.child),
      true,
    );
    yield* ctx.expectEqual(
      "the press fixture's states are distinguishable",
      hasDistinctStates(fixtures.press),
      true,
    );

    const sampled =
      (frame: Pixels.Pixels) => (testId: string, hex: string, label: string) =>
        Effect.gen(function* () {
          const actual = yield* pixelAtId(ctx, driver.reader, frame, testId);
          const expected = yield* parseColour(`${label} parses`, hex);
          yield* expectColour(ctx, label, actual, expected);
        });

    const pressBox = yield* paintedBox(ctx, driver.reader, "state-press");
    const centre: Point = {
      x: pressBox.x + pressBox.width / 2,
      y: pressBox.y + pressBox.height / 2,
    };

    yield* driver.hover("state-hover");
    const hoverFrame = yield* driver.capture();
    const hovered = sampled(hoverFrame);
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(hoverFrame, yield* driver.reader.windowSize()),
    );
    yield* hovered(
      "state-hover",
      resolveStateColour(fixtures.hover, "hover"),
      "hovering paints the hover colour",
    );
    yield* hovered(
      "state-rest",
      fixtures.hover.rest,
      "hovering one element leaves its neighbour alone",
    );
    yield* hovered(
      "state-away",
      fixtures.hover.rest,
      "hovering one element leaves the leave target alone",
    );

    yield* driver.hover("state-parent");
    const parentHover = sampled(yield* driver.capture());
    yield* parentHover(
      "state-hover",
      fixtures.hover.rest,
      "leaving reverts the hovered element to its authored fill",
    );
    yield* parentHover(
      "state-parent",
      resolveStateColour(fixtures.parent, "hover"),
      "hovering the parent paints the parent's hover colour",
    );
    yield* parentHover(
      "state-child",
      fixtures.child.rest,
      "hovering the parent does not paint the child",
    );

    yield* driver.hover("state-child");
    const childHover = sampled(yield* driver.capture());
    yield* childHover(
      "state-child",
      resolveStateColour(fixtures.child, "hover"),
      "hovering the child paints the child's own hover colour",
    );
    yield* childHover(
      "state-parent",
      fixtures.parent.rest,
      "a child's hover reverts the parent's",
    );

    yield* driver.pressAt(centre);
    const pressed = sampled(yield* driver.capture());
    yield* pressed(
      "state-press",
      resolveStateColour(fixtures.press, "active"),
      "pressing paints the active colour",
    );

    yield* driver.releaseAt(centre);
    yield* driver.hover("state-press");
    const rehovered = sampled(yield* driver.capture());
    yield* rehovered(
      "state-press",
      resolveStateColour(fixtures.press, "hover"),
      "a release clears active and the hover applies",
    );

    yield* driver.pressAt(centre);
    const pressedAgain = sampled(yield* driver.capture());
    yield* pressedAgain(
      "state-press",
      resolveStateColour(fixtures.press, "active"),
      "active wins over hover",
    );
  });

/** The offscreen host: inspection verbs are values, so they lift with `sync`. */
const headlessDriver = (host: Smoke.SmokeHost): StateDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  hover: (testId) => Effect.sync(() => host.hover(testId)),
  pressAt: (point) => Effect.sync(() => host.pressWindow(point.x, point.y)),
  releaseAt: (point) =>
    Effect.sync(() => host.releasePointer(point.x, point.y)),
});

/** The 120 ms the live registry's steps already settle for before a read. */
const SETTLE = Effect.sleep(Duration.millis(120));

/** The real window: a verb is an Effect, and the frame needs its commit. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): StateDriver<Smoke.SmokeHostError> => {
  function settled<A>(
    effect: Effect.Effect<A, Smoke.SmokeHostError>,
  ): Effect.Effect<void, Smoke.SmokeHostError> {
    return Effect.flatMap(effect, () => SETTLE);
  }
  return {
    reader: readAsync(host),
    capture: () => captureLive(host),
    hover: (testId) => settled(host.hover(testId)),
    pressAt: (point) => settled(host.pressWindow(point.x, point.y)),
    releaseAt: (point) => settled(host.releasePointer(point.x, point.y)),
  };
};

export const stateColourScenario: PlaygroundScenario = {
  id: "state-pixels",
  title: "Declared hover and active colours: the frame paints the states",
  capability: "states",
  view: stateColourView,
  steps: (ctx) => stateChecks(ctx, headlessDriver(ctx.host)),
};

export const stateColourLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-state-pixels",
  title: "Live state pixels: hover and active colours in a window",
  capability: "states",
  steps: (ctx) => stateChecks(ctx, liveDriver(ctx.host)),
};
