/**
 * `size-constraints` / `live-size-constraints`: what the four size constraints
 * and a percentage size actually do (plan `825`).
 *
 * The bug being guarded: the shipped components rely on `minWidth`,
 * `maxWidth`, `minHeight`, `maxHeight` and `"100%"` in more than twenty call
 * sites (`preview-card` 240–360, `toast` max 380 with `minWidth: 0`,
 * `combobox` max height 280, `menu/sub` 320 + scroll), and no scenario reads
 * any of them — so a runtime that dropped the constraints passed everything.
 *
 * Every fixture sits in an identical 300 px parent, and every expectation comes
 * from `size-model.ts` (CSS precedence: the minimum wins; percentages resolve
 * against the parent) so the checks are about the paint, not about arithmetic
 * the scenario restates.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import {
  UNBOUNDED,
  constrained,
  percentOf,
  percentStyle,
} from "./size-model.js";

/** The parent every fixture resolves against. */
const PARENT = 300;
/** The label column. */
const LABEL = 140;
/** A body line box this host paints for the default 16 px type (plan `342`). */
const LINE_BOX = 26;
/** Pixel slack for a painted edge. */
const TOLERANCE = 1;
/** Half and all of the parent, as the fixtures declare them. */
const HALF = 0.5;
const ALL = 1;

const Row = ({
  id,
  label,
  parentHeight = 40,
  parentStyle,
  subject,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly parentHeight?: number;
  readonly parentStyle?: StyleDesc;
  readonly subject?: StyleDesc;
  readonly children?: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <text
        testId={`size-${id}-label`}
        style={{ width: LABEL, color: theme.colors.mutedForeground }}
      >
        {label}
      </text>
      <div
        testId={`size-${id}-parent`}
        style={{
          width: PARENT,
          height: parentHeight,
          flexShrink: 0,
          backgroundColor: theme.colors.muted,
          ...parentStyle,
        }}
      >
        {children ?? (
          <div
            testId={`size-${id}`}
            style={{
              backgroundColor: theme.colors.primary,
              ...subject,
            }}
          />
        )}
      </div>
    </div>
  );
};

const SizeProbe = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 680,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Row
        id="min-width"
        label="width 100, min 200"
        subject={{ width: 100, minWidth: 200, height: 24 }}
      />
      <Row
        id="max-width"
        label="width 400, max 240"
        subject={{ width: 400, maxWidth: 240, height: 24 }}
      />
      <Row
        id="min-over-max"
        label="width 200, min 300, max 260"
        subject={{ width: 200, minWidth: 300, maxWidth: 260, height: 24 }}
      />
      <Row
        id="min-height"
        label="height 40, min 80"
        parentHeight={160}
        subject={{ width: 40, height: 40, minHeight: 80 }}
      />
      <Row
        id="max-height"
        label="height 400, max 120"
        parentHeight={240}
        children={
          <div
            testId="size-max-height"
            style={{
              width: 40,
              height: 400,
              maxHeight: 120,
              backgroundColor: theme.colors.primary,
            }}
          >
            <div
              testId="size-max-height-child"
              style={{ height: 200, backgroundColor: theme.colors.card }}
            />
          </div>
        }
      />
      <Row
        id="flex-fixed"
        label="flex row, width 400"
        parentStyle={{ display: "flex", flexDirection: "row" }}
        children={
          <div
            testId="size-flex-fixed"
            style={{
              width: 400,
              height: 24,
              backgroundColor: theme.colors.primary,
            }}
          />
        }
      />
      <Row
        id="flex-content"
        label="nowrap content, no min"
        parentHeight={30}
        parentStyle={{ display: "flex", flexDirection: "row" }}
        children={
          <div
            testId="size-flex-content"
            style={{ display: "flex", flexDirection: "row", height: 24 }}
          >
            <text
              testId="size-flex-content-text"
              style={{
                whiteSpace: "nowrap",
                color: theme.colors.foreground,
                backgroundColor: theme.colors.primary,
              }}
            >
              a very long nowrap run that cannot fit in three hundred pixels
            </text>
          </div>
        }
      />
      <Row
        id="flex-zero"
        label="the same, minWidth 0"
        parentHeight={30}
        parentStyle={{ display: "flex", flexDirection: "row" }}
        children={
          <div
            testId="size-flex-zero"
            style={{
              display: "flex",
              flexDirection: "row",
              height: 24,
              minWidth: 0,
            }}
          >
            <text
              testId="size-flex-zero-text"
              style={{
                whiteSpace: "nowrap",
                color: theme.colors.foreground,
                backgroundColor: theme.colors.primary,
              }}
            >
              a very long nowrap run that cannot fit in three hundred pixels
            </text>
          </div>
        }
      />
      <Row
        id="percent-100"
        label={`width ${percentStyle(ALL)}`}
        subject={{ width: percentStyle(ALL), height: 24 }}
      />
      <Row
        id="percent-50"
        label={`width ${percentStyle(HALF)}`}
        subject={{ width: percentStyle(HALF), height: 24 }}
      />
      <Row
        id="percent-min"
        label={`width 80, min ${percentStyle(HALF)}`}
        subject={{
          width: 80,
          minWidth: percentStyle(HALF),
          height: 24,
        }}
      />
      <Row
        id="text-max"
        label="text, max 200"
        parentHeight={120}
        children={
          <text
            testId="size-text-max"
            style={{
              maxWidth: 200,
              fontSize: 16,
              color: theme.colors.foreground,
            }}
          >
            a sentence long enough to wrap several times inside two hundred
            pixels of width
          </text>
        }
      />
    </div>
  );
};

/** The one host verb the checks need, sync or async. */
export interface SizeDriver<E> {
  readonly box: (
    testId: string,
  ) => Effect.Effect<Option.Option<Smoke.Bounds>, E>;
}

type CheckContext = Pick<
  Smoke.SmokeContext,
  "expectEqual" | "expectNear" | "expectSome"
>;

const boxOf = <E,>(
  ctx: CheckContext,
  driver: SizeDriver<E>,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError | E> =>
  Effect.flatMap(driver.box(testId), (box) =>
    ctx.expectSome(`${testId} is painted`, box),
  );

const widthOf = <E,>(
  ctx: CheckContext,
  driver: SizeDriver<E>,
  testId: string,
) => Effect.map(boxOf(ctx, driver, testId), (box) => box.width);

const heightOf = <E,>(
  ctx: CheckContext,
  driver: SizeDriver<E>,
  testId: string,
) => Effect.map(boxOf(ctx, driver, testId), (box) => box.height);

const parentWidth = <E,>(ctx: CheckContext, driver: SizeDriver<E>) =>
  widthOf(ctx, driver, "size-min-width-parent");

/** The checks both hosts run, so the twin cannot drift from the headless one. */
export const sizeChecks = <E,>(
  ctx: CheckContext,
  driver: SizeDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const parent = yield* parentWidth(ctx, driver);
    yield* ctx.expectNear(
      "every fixture resolves against one 300 px parent",
      parent,
      PARENT,
      TOLERANCE,
    );

    // 1. The four constraints, and CSS precedence.
    yield* ctx.expectNear(
      "minWidth raises a smaller width",
      yield* widthOf(ctx, driver, "size-min-width"),
      constrained(100, 200, UNBOUNDED),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "maxWidth clamps a larger width",
      yield* widthOf(ctx, driver, "size-max-width"),
      constrained(400, 0, 240),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "minWidth wins over a smaller maxWidth",
      yield* widthOf(ctx, driver, "size-min-over-max"),
      constrained(200, 300, 260),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "minHeight raises a smaller height",
      yield* heightOf(ctx, driver, "size-min-height"),
      constrained(40, 80, UNBOUNDED),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "maxHeight clamps a larger height",
      yield* heightOf(ctx, driver, "size-max-height"),
      constrained(400, 0, 120),
      TOLERANCE,
    );

    // 2. A clamped box constrains itself, not its subtree.
    const clamped = yield* boxOf(ctx, driver, "size-max-height");
    const child = yield* boxOf(ctx, driver, "size-max-height-child");
    yield* ctx.expectNear(
      "a maxHeight box keeps its taller child laid out",
      child.height,
      200,
      TOLERANCE,
    );
    yield* ctx.expectEqual(
      "the taller child extends past the clamped box",
      child.y + child.height > clamped.y + clamped.height,
      true,
    );

    // 3. The flex auto-minimum, and the `minWidth: 0` escape every component
    //    writes (list, accordion, toast, menu item).
    yield* ctx.expectNear(
      "a fixed-width flex item shrinks to its row",
      yield* widthOf(ctx, driver, "size-flex-fixed"),
      PARENT,
      TOLERANCE,
    );
    const content = yield* widthOf(ctx, driver, "size-flex-content");
    const zero = yield* widthOf(ctx, driver, "size-flex-zero");
    const run = yield* widthOf(ctx, driver, "size-flex-content-text");
    yield* ctx.expectEqual(
      "a nowrap run holds its content width",
      content > PARENT + 100,
      true,
    );
    yield* ctx.expectNear(
      "the held width is the run's own width",
      content,
      run,
      2,
    );
    yield* ctx.expectNear(
      "minWidth: 0 lets a flex item shrink",
      zero,
      PARENT,
      TOLERANCE,
    );
    yield* ctx.expectEqual(
      "the minWidth: 0 escape is at least 100 px narrower",
      content - zero > 100,
      true,
    );

    // 4. Percentages resolve against the parent.
    yield* ctx.expectNear(
      "width 100% fills the parent",
      yield* widthOf(ctx, driver, "size-percent-100"),
      percentOf(parent, ALL),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "width 50% halves the parent",
      yield* widthOf(ctx, driver, "size-percent-50"),
      percentOf(parent, HALF),
      TOLERANCE,
    );
    yield* ctx.expectNear(
      "a percentage minWidth raises a smaller width",
      yield* widthOf(ctx, driver, "size-percent-min"),
      constrained(80, percentOf(parent, HALF), UNBOUNDED),
      TOLERANCE,
    );

    // 5. maxWidth wraps a text run instead of clipping it.
    const wrapped = yield* boxOf(ctx, driver, "size-text-max");
    yield* ctx.expectEqual(
      "maxWidth constrains the run's width",
      wrapped.width <= 200 + TOLERANCE,
      true,
    );
    yield* ctx.expectEqual(
      "the constrained run wraps past one line",
      wrapped.height >= 2 * LINE_BOX - 2,
      true,
    );
  });

const headlessDriver = (ctx: Smoke.SmokeContext): SizeDriver<never> => ({
  box: (testId) =>
    Effect.sync(() => Option.fromNullishOr(ctx.host.bounds(testId))),
});

export const sizeConstraintsScenario: PlaygroundScenario = {
  id: "size-constraints",
  title:
    "Size constraints: min/max width and height, flex minimum and percentages",
  capability: "layout",
  view: () => <SizeProbe />,
  steps: (ctx) => sizeChecks(ctx, headlessDriver(ctx)),
};
