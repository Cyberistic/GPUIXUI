/**
 * `motion-curve` / `live-motion-curve`: does a declared easing curve reach the
 * paint? (plan `823`)
 *
 * The bug being guarded: every motion check in both registries declares
 * `ease: "linear"`, and none declares a `delay` or a cubic-bezier, so a runtime
 * that accepted those fields and ignored them — tweening linearly, starting at
 * once, or retargeting from the target instead of the visible value — passes
 * the whole suite while every component's declared curve is unproven.
 *
 * Eight rails share one paused clock. A rail's animating fill has no `testId`
 * (`MotionDivProps` does not publish one), so the probe reads the tick that
 * follows the fill: the fill's width is `marker.x - rail.x`, the same
 * displacement trick `motion-collapse` uses on its sibling pane. Every expected
 * width comes from `motion-curve-model.ts`, never from a literal here.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { motion, type MotionTransition } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  CURVE_DELAY_MS,
  CURVE_DURATION_MS,
  CUSTOM_CURVE,
  DEFAULT_DURATION_MS,
  NAMED_EASES,
  SAMPLE_TIMES,
  TRAVEL,
  nearestEase,
  sampleAt,
  widthAt,
  type Curve,
  type NamedEase,
} from "./motion-curve-model.js";

/** The painted tick that reports a rail's animated width. */
const MARKER = 4;
/** The rail's height. */
const RAIL_HEIGHT = 24;
/** The label column, wide enough for the tuple's numbers. */
const LABEL_WIDTH = 180;
/** Pixel slack for a painted edge; the model is exact, the frame may round. */
const TOLERANCE = 2;
/** A time every tween in the probe has finished by. */
const SETTLED = 400;
/** The clock grid every row samples from, in order. */
const GRID: ReadonlyArray<number> = [50, 100, 150, 225, 250];

/** One rail: a declared tween and the times it is sampled at. */
interface CurveRow {
  readonly id: string;
  readonly label: string;
  /** `None` means the runtime's own default transition. */
  readonly ease: Option.Option<Curve>;
  readonly delayMs: number;
  readonly durationMs: number;
  readonly at: ReadonlyArray<number>;
}

const CURVE_ROWS: ReadonlyArray<CurveRow> = [
  {
    id: "linear",
    label: "linear",
    ease: Option.some("linear"),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "ease",
    label: "ease",
    ease: Option.some("ease"),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "ease-in",
    label: "easeIn",
    ease: Option.some("easeIn"),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "ease-out",
    label: "easeOut",
    ease: Option.some("easeOut"),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "ease-in-out",
    label: "easeInOut",
    ease: Option.some("easeInOut"),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "bezier",
    label: "0.6, 0.05, 0.3, 0.95",
    ease: Option.some(CUSTOM_CURVE),
    delayMs: 0,
    durationMs: CURVE_DURATION_MS,
    at: SAMPLE_TIMES,
  },
  {
    id: "delay",
    label: "linear, 100 ms delay",
    ease: Option.some("linear"),
    delayMs: CURVE_DELAY_MS,
    durationMs: CURVE_DURATION_MS,
    at: [50, 150, 250],
  },
  {
    id: "default",
    label: "no transition",
    ease: Option.none(),
    delayMs: 0,
    durationMs: DEFAULT_DURATION_MS,
    at: [...SAMPLE_TIMES, 225],
  },
];

const transitionOf = (row: CurveRow): MotionTransition | undefined =>
  Option.match(row.ease, {
    onNone: () => undefined,
    onSome: (ease) => ({
      duration: row.durationMs / 1000,
      delay: row.delayMs / 1000,
      ease,
    }),
  });

/** A rail: the animated fill, then the tick that reports its width. */
const Rail = ({
  id,
  transition,
  width,
}: {
  readonly id: string;
  readonly transition?: MotionTransition;
  readonly width: number;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={`curve-${id}-rail`}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: TRAVEL + MARKER,
        height: RAIL_HEIGHT,
        flexShrink: 0,
        backgroundColor: theme.colors.muted,
      }}
    >
      <motion.div
        initial={false}
        animate={{ width }}
        transition={transition}
        style={{
          height: RAIL_HEIGHT,
          flexShrink: 0,
          backgroundColor: theme.colors.primary,
        }}
      />
      <div
        testId={`curve-${id}-marker`}
        style={{
          width: MARKER,
          height: RAIL_HEIGHT,
          flexShrink: 0,
          backgroundColor: theme.colors.primary,
        }}
      />
    </div>
  );
};

const ProbeButton = ({
  testId,
  onClick,
  children,
}: {
  readonly testId: string;
  readonly onClick: () => void;
  readonly children: string;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onClick}
      style={{
        padding: 6,
        borderRadius: 4,
        cursor: "pointer",
        backgroundColor: theme.colors.muted,
        hover: { backgroundColor: theme.colors.border },
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{children}</text>
    </div>
  );
};

const CurveProbe = () => {
  const theme = useTheme();
  const [run, setRun] = useState(false);
  const [retarget, setRetarget] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 460,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      {Arr.map(CURVE_ROWS, (row) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <text
            testId={`curve-${row.id}-label`}
            style={{ width: LABEL_WIDTH, color: theme.colors.mutedForeground }}
          >
            {row.label}
          </text>
          <Rail
            id={row.id}
            transition={transitionOf(row)}
            width={run ? TRAVEL : 0}
          />
        </div>
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <text
          testId="curve-retarget-label"
          style={{ width: LABEL_WIDTH, color: theme.colors.mutedForeground }}
        >
          retarget
        </text>
        <Rail id="retarget" width={retarget * TRAVEL} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ProbeButton testId="curve-run" onClick={() => setRun(true)}>
          run
        </ProbeButton>
        <ProbeButton testId="curve-retarget-run" onClick={() => setRetarget(1)}>
          retarget out
        </ProbeButton>
        <ProbeButton
          testId="curve-retarget-back"
          onClick={() => setRetarget(0)}
        >
          retarget back
        </ProbeButton>
      </div>
      <Readout testId="curve-readout">
        {`phase=${run ? "run" : "rest"} retarget=${retarget}`}
      </Readout>
      <Body>one paused clock, eight declared curves</Body>
    </div>
  );
};

/** The host verbs the checks need, sync or async. */
export interface CurveDriver<E> {
  readonly pause: Effect.Effect<void, E>;
  readonly forward: (ms: number) => Effect.Effect<void, E>;
  readonly press: (testId: string) => Effect.Effect<void, E>;
  /** The painted left edge of `testId`, `None` when it has no bounds. */
  readonly left: (testId: string) => Effect.Effect<Option.Option<number>, E>;
  readonly readout: Effect.Effect<Option.Option<string>, E>;
}

type CheckContext = Pick<
  Smoke.SmokeContext,
  "expectContains" | "expectEqual" | "expectNear" | "expectSome"
>;

/** One sampled width: `[row id, clock time, painted width]`. */
type Reading = readonly [string, number, number];

const fillWidth = <E,>(ctx: CheckContext, driver: CurveDriver<E>, id: string) =>
  Effect.gen(function* () {
    const rail = yield* ctx.expectSome(
      `${id}: the rail is painted`,
      yield* driver.left(`curve-${id}-rail`),
    );
    const marker = yield* ctx.expectSome(
      `${id}: the width marker is painted`,
      yield* driver.left(`curve-${id}-marker`),
    );
    return marker - rail;
  });

/** Walks {@link GRID} once, advancing the frozen clock between samples. */
const collect = <E,>(
  ctx: CheckContext,
  driver: CurveDriver<E>,
): Effect.Effect<ReadonlyArray<Reading>, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const perStep = yield* Effect.forEach(
      GRID,
      (at, index) =>
        Effect.gen(function* () {
          const previous = index === 0 ? 0 : (GRID[index - 1] ?? 0);
          yield* driver.forward(at - previous);
          return yield* Effect.forEach(
            Arr.filter(CURVE_ROWS, (row) => Arr.contains(row.at, at)),
            (row) =>
              Effect.map(
                fillWidth(ctx, driver, row.id),
                (width) => [row.id, at, width] as const,
              ),
            { concurrency: 1 },
          );
        }),
      { concurrency: 1 },
    );
    return Arr.flatten(perStep);
  });

const widthOf = (
  ctx: CheckContext,
  readings: ReadonlyArray<Reading>,
  id: string,
  at: number,
) =>
  ctx.expectSome(
    `${id} was sampled at ${at} ms`,
    Option.map(
      Arr.findFirst(readings, ([row, time]) => row === id && time === at),
      ([, , width]) => width,
    ),
  );

/** The checks both hosts run, so the twin cannot drift from the headless one. */
export const curveChecks = <E,>(
  ctx: CheckContext,
  driver: CurveDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    yield* driver.pause;
    yield* driver.press("curve-run");
    yield* ctx.expectContains(
      "the run committed",
      yield* ctx.expectSome("the readout is painted", yield* driver.readout),
      "phase=run",
    );

    const readings = yield* collect(ctx, driver);

    // 1. Every declared curve, at every sample time, against its own model.
    yield* Effect.forEach(
      CURVE_ROWS,
      (row) =>
        Option.match(row.ease, {
          onNone: () => Effect.void,
          onSome: (ease) =>
            Effect.forEach(
              row.at,
              (at) =>
                Effect.flatMap(widthOf(ctx, readings, row.id, at), (measured) =>
                  ctx.expectNear(
                    `${row.id} at ${at} ms`,
                    measured,
                    widthAt(
                      {
                        from: 0,
                        to: TRAVEL,
                        durationMs: row.durationMs,
                        delayMs: row.delayMs,
                        ease,
                      },
                      at,
                    ),
                    TOLERANCE,
                  ),
                ),
              { concurrency: 1 },
            ),
        }),
      { concurrency: 1 },
    );

    // 2. The directions a linear tween cannot produce.
    const linear50 = yield* widthOf(ctx, readings, "linear", 50);
    const linear150 = yield* widthOf(ctx, readings, "linear", 150);
    const easeIn50 = yield* widthOf(ctx, readings, "ease-in", 50);
    const easeOut50 = yield* widthOf(ctx, readings, "ease-out", 50);
    const easeInOut50 = yield* widthOf(ctx, readings, "ease-in-out", 50);
    const easeInOut150 = yield* widthOf(ctx, readings, "ease-in-out", 150);
    const ease150 = yield* widthOf(ctx, readings, "ease", 150);
    const easeOut150 = yield* widthOf(ctx, readings, "ease-out", 150);
    yield* ctx.expectEqual(
      "easeIn lags a linear tween early",
      easeIn50 < linear50 - 20,
      true,
    );
    yield* ctx.expectEqual(
      "easeOut leads a linear tween early",
      easeOut50 > linear50 + 20,
      true,
    );
    yield* ctx.expectEqual(
      "easeInOut stays below linear early",
      easeInOut50 < linear50,
      true,
    );
    yield* ctx.expectEqual(
      "easeInOut passes linear late",
      easeInOut150 > linear150,
      true,
    );
    yield* ctx.expectEqual(
      "ease runs past easeOut late in the tween",
      ease150 > easeOut150 + 8,
      true,
    );

    // 3. The tuple is its own curve, not a name in disguise: at some sample it
    //    must be at least 12 px from every named curve (the closest name is
    //    2 px away at 50 ms — both start slow — so the gap is the maximum).
    const bezierWidths = yield* Effect.forEach(
      SAMPLE_TIMES,
      (at) => widthOf(ctx, readings, "bezier", at),
      { concurrency: 1 },
    );
    const gapTo = (ease: NamedEase): number =>
      Arr.reduce(
        Arr.map(SAMPLE_TIMES, (at, index) =>
          Math.abs(
            widthAt(
              { from: 0, to: TRAVEL, durationMs: CURVE_DURATION_MS, ease },
              at,
            ) - (bezierWidths[index] ?? 0),
          ),
        ),
        0,
        (worst, gap) => Math.max(worst, gap),
      );
    const seed: { readonly ease: NamedEase; readonly gap: number } = {
      ease: "linear",
      gap: Number.POSITIVE_INFINITY,
    };
    const closestName = Arr.reduce(NAMED_EASES, seed, (closest, ease) => {
      const gap = gapTo(ease);
      return gap < closest.gap ? { ease, gap } : closest;
    });
    yield* ctx.expectEqual(
      "the cubic-bezier tuple is at least 12 px from every named curve",
      closestName.gap >= 12,
      true,
    );

    // 4. A transition that omits everything is still an eased, 300 ms tween.
    const defaultSamples = yield* Effect.forEach(
      SAMPLE_TIMES,
      (at) =>
        Effect.map(widthOf(ctx, readings, "default", at), (width) =>
          sampleAt(at, width),
        ),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "the default transition is the runtime's easeOut",
      Option.getOrElse(
        nearestEase(defaultSamples, DEFAULT_DURATION_MS),
        () => "none",
      ),
      "easeOut",
    );
    yield* ctx.expectNear(
      "the default duration is 300 ms",
      yield* widthOf(ctx, readings, "default", 225),
      widthAt(
        {
          from: 0,
          to: TRAVEL,
          durationMs: DEFAULT_DURATION_MS,
          ease: "easeOut",
        },
        225,
      ),
      TOLERANCE,
    );

    // 5. Every rail reaches the travel, including the delayed and default ones.
    yield* driver.forward(SETTLED - 250);
    yield* Effect.forEach(
      CURVE_ROWS,
      (row) =>
        Effect.gen(function* () {
          yield* ctx.expectNear(
            `${row.id} settles at the travel`,
            yield* fillWidth(ctx, driver, row.id),
            TRAVEL,
            1,
          );
        }),
      { concurrency: 1 },
    );

    // 6. A retarget continues from the value the frame shows.
    yield* driver.press("curve-retarget-run");
    yield* driver.forward(80);
    yield* ctx.expectNear(
      "the retarget row is 96 px at 80 ms",
      yield* fillWidth(ctx, driver, "retarget"),
      widthAt(
        { from: 0, to: TRAVEL, durationMs: CURVE_DURATION_MS, ease: "linear" },
        80,
      ),
      TOLERANCE,
    );
    yield* driver.press("curve-retarget-back");
    yield* driver.forward(80);
    yield* ctx.expectNear(
      "a retarget continues from the visible value",
      yield* fillWidth(ctx, driver, "retarget"),
      57.6,
      TOLERANCE,
    );
    yield* driver.forward(CURVE_DURATION_MS);
    yield* ctx.expectNear(
      "the retarget reaches its target",
      yield* fillWidth(ctx, driver, "retarget"),
      0,
      1,
    );
  });

/** The bit of a context the checks do not use, so `curveChecks` fits both hosts. */
const headlessDriver = (ctx: Smoke.SmokeContext): CurveDriver<never> => ({
  pause: Effect.sync(() => {
    ctx.host.pauseMotion();
  }),
  forward: (ms) =>
    Effect.sync(() => {
      ctx.host.fastForwardMotion(ms);
    }),
  press: (testId) =>
    Effect.sync(() => {
      ctx.host.click(testId);
    }),
  left: (testId) =>
    Effect.sync(() =>
      Option.map(Option.fromNullishOr(ctx.host.bounds(testId)), (box) => box.x),
    ),
  readout: Effect.sync(() =>
    Option.fromNullishOr(ctx.host.text("curve-readout")),
  ),
});

export const motionCurveScenario: PlaygroundScenario = {
  id: "motion-curve",
  title: "Motion curves: ease names, a cubic-bezier, a delay and a retarget",
  capability: "motion",
  view: () => <CurveProbe />,
  steps: (ctx) => curveChecks(ctx, headlessDriver(ctx)),
};
