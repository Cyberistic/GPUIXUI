/**
 * `flex-layout` / `live-flex-layout`: how a row distributes its space
 * (plan `833`).
 *
 * The bug being guarded: `flexGrow` appears in 64 shipped call sites,
 * `alignItems: "center"` in 163 and `justifyContent` in 89, and no scenario in
 * either registry measured one of them. A runtime that ignored grow, grew from
 * zero instead of from the basis, treated `space-between` as `flex-start`, or
 * never stretched a default cross-axis child passed every check — because every
 * check read a fixed width, a `gap` or the authored style report.
 *
 * Bounds-only on purpose: flex distribution is geometry, so both hosts answer
 * it directly and the probe pays no frame decode. The fixture table and the
 * arithmetic live in `flex-layout-model.ts`.
 */
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import type { PlaygroundScenario } from "../types.js";
import { readAsync, readSync, type FrameReader } from "./frames.js";
import {
  crossOffset,
  describeNumbers,
  growWidths,
  justifyGaps,
  justifyOffset,
  measuredGaps,
  rowPositions,
  shrinkWidths,
  widthsMatch,
} from "./flex-layout-model.js";

/** The stage width every row is measured against. */
export const STAGE_WIDTH = 640;

/** The row height the cross-axis fixtures share. */
export const ROW_HEIGHT = 60;

/** The gutter between the stacked rows. */
export const ROW_GAP = 12;

/** A text line box at 16 px, the intrinsic height a stretch has to grow. */
export const CONTENT_HEIGHT = 26;

interface Item {
  readonly testId: string;
  readonly basis: number;
  readonly grow: number;
  readonly shrink?: number;
}

/** One row: its width and the items the model predicts widths for. */
export interface FlexRow {
  readonly rowId: string;
  readonly width: number;
  readonly items: ReadonlyArray<Item>;
}

/** The grow/basis/shrink rows, in declaration order. */
export const flexRows: ReadonlyArray<FlexRow> = [
  {
    rowId: "flex-11",
    width: 600,
    items: [
      { testId: "flex-11-a", basis: 0, grow: 1 },
      { testId: "flex-11-b", basis: 0, grow: 1 },
    ],
  },
  {
    rowId: "flex-12",
    width: 600,
    items: [
      { testId: "flex-12-a", basis: 0, grow: 1 },
      { testId: "flex-12-b", basis: 0, grow: 2 },
    ],
  },
  {
    rowId: "flex-mix",
    width: 600,
    items: [
      { testId: "flex-mix-grow", basis: 0, grow: 1 },
      { testId: "flex-mix-fixed", basis: 100, grow: 0 },
    ],
  },
  {
    rowId: "flex-basis",
    width: 600,
    items: [
      { testId: "flex-basis-a", basis: 200, grow: 1 },
      { testId: "flex-basis-b", basis: 100, grow: 1 },
    ],
  },
  {
    rowId: "flex-shrink",
    width: 300,
    items: [
      { testId: "flex-shrink-a", basis: 200, grow: 0, shrink: 0 },
      { testId: "flex-shrink-b", basis: 200, grow: 0, shrink: 1 },
    ],
  },
];

/** The three-item row whose gaps `space-between` owns. */
export const JUSTIFY_ITEMS: ReadonlyArray<Item> = [
  { testId: "flex-between-a", basis: 60, grow: 0 },
  { testId: "flex-between-b", basis: 60, grow: 0 },
  { testId: "flex-between-c", basis: 60, grow: 0 },
];

export const JUSTIFY_WIDTH = 400;

/** The centred row. */
export const CENTRE_WIDTH = 400;

export const CENTRE_ITEM: Item = { testId: "flex-centre", basis: 60, grow: 0 };

/** The cross-axis children: a 60-tall row holding a 20 and a 40. */
export const CROSS_CHILDREN = [
  { testId: "flex-cross-20", height: 20 },
  { testId: "flex-cross-40", height: 40 },
] as const;

export const PERCENT_WIDTH = STAGE_WIDTH / 2;

const itemStyle = (
  theme: ReturnType<typeof useTheme>,
  item: Item,
  height: number,
) => ({
  flexGrow: item.grow,
  flexBasis: item.basis,
  ...(item.shrink === undefined ? {} : { flexShrink: item.shrink }),
  height,
  backgroundColor: theme.colors.primary,
});

/** One intrinsic-height block: no declared height, one 16 px text line. */
const ContentChild = ({ testId }: { readonly testId: string }) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{ flexBasis: 60, backgroundColor: theme.colors.accent }}
    >
      <text style={{ fontSize: 16, color: theme.colors.foreground }}>ab</text>
    </div>
  );
};

const Row = ({
  testId,
  width,
  children,
  style,
}: {
  readonly testId: string;
  readonly width?: number;
  readonly children: ReactNode;
  readonly style?: Record<string, unknown>;
}) => (
  <div
    testId={testId}
    style={{
      display: "flex",
      ...(width === undefined ? {} : { width }),
      height: ROW_HEIGHT,
      flexShrink: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

const FlexProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="flex-stage"
      style={{
        display: "flex",
        flexDirection: "column",
        width: STAGE_WIDTH,
        gap: ROW_GAP,
        backgroundColor: theme.colors.background,
      }}
    >
      {flexRows.slice(0, 4).map((fixture) => (
        <Row key={fixture.rowId} testId={fixture.rowId} width={fixture.width}>
          {fixture.items.map((item) => (
            <div
              key={item.testId}
              testId={item.testId}
              style={itemStyle(theme, item, 20)}
            />
          ))}
        </Row>
      ))}
      <Row
        testId="flex-between"
        width={JUSTIFY_WIDTH}
        style={{ justifyContent: "space-between" }}
      >
        {JUSTIFY_ITEMS.map((item) => (
          <div
            key={item.testId}
            testId={item.testId}
            style={itemStyle(theme, item, 20)}
          />
        ))}
      </Row>
      <Row
        testId="flex-centre-row"
        width={JUSTIFY_WIDTH}
        style={{ justifyContent: "center" }}
      >
        <div
          testId={CENTRE_ITEM.testId}
          style={itemStyle(theme, CENTRE_ITEM, 20)}
        />
      </Row>
      <Row
        testId="flex-cross"
        width={JUSTIFY_WIDTH}
        style={{ alignItems: "center" }}
      >
        {CROSS_CHILDREN.map((child) => (
          <div
            key={child.testId}
            testId={child.testId}
            style={itemStyle(
              theme,
              { testId: child.testId, basis: 60, grow: 0 },
              child.height,
            )}
          />
        ))}
      </Row>
      <Row
        testId="flex-stretch"
        width={JUSTIFY_WIDTH}
        style={{ alignItems: "stretch" }}
      >
        <ContentChild testId="flex-stretch-child" />
      </Row>
      <Row
        testId="flex-default"
        width={JUSTIFY_WIDTH}
        style={{ alignItems: "stretch" }}
      >
        <ContentChild testId="flex-default-child" />
      </Row>
      <Row
        testId="flex-start"
        width={JUSTIFY_WIDTH}
        style={{ alignItems: "flex-start" }}
      >
        <ContentChild testId="flex-start-child" />
      </Row>
      <Row testId="flex-percent" width={PERCENT_WIDTH}>
        <div
          testId="flex-percent-a"
          style={itemStyle(
            theme,
            { testId: "flex-percent-a", basis: 0, grow: 1 },
            20,
          )}
        />
        <div
          testId="flex-percent-b"
          style={itemStyle(
            theme,
            { testId: "flex-percent-b", basis: 0, grow: 1 },
            20,
          )}
        />
      </Row>
      <Row testId="flex-auto">
        <div
          testId="flex-auto-a"
          style={itemStyle(
            theme,
            { testId: "flex-auto-a", basis: 60, grow: 1 },
            20,
          )}
        />
        <div
          testId="flex-auto-b"
          style={itemStyle(
            theme,
            { testId: "flex-auto-b", basis: 60, grow: 2 },
            20,
          )}
        />
      </Row>
      <Row testId="flex-nested" width={600}>
        <div
          testId="flex-nest"
          style={{
            display: "flex",
            flexGrow: 1,
            height: 40,
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId="flex-nest-a"
            style={{
              flexGrow: 1,
              height: 40,
              backgroundColor: theme.colors.primary,
            }}
          />
          <div
            testId="flex-nest-b"
            style={{
              flexGrow: 3,
              height: 40,
              backgroundColor: theme.colors.primary,
            }}
          />
        </div>
      </Row>
      <Row testId="flex-shrink" width={300}>
        <div
          testId="flex-shrink-a"
          style={{
            flexShrink: 0,
            flexBasis: 200,
            height: 20,
            backgroundColor: theme.colors.primary,
          }}
        />
        <div
          testId="flex-shrink-b"
          style={{
            flexShrink: 1,
            flexBasis: 200,
            height: 20,
            backgroundColor: theme.colors.accent,
          }}
        />
      </Row>
    </div>
  );
};

export const flexLayoutView = (): ReactNode => <FlexProbe />;

const failure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

const boxOf = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const bounds = yield* reader.bounds(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(bounds),
    );
  });

const boxesOf = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  ids: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<Smoke.Bounds>, Smoke.SmokeAssertionError | E> =>
  Effect.forEach(ids, (id) => boxOf(ctx, reader, id), { concurrency: 1 });

/** Assert one box's width against the model, naming both numbers. */
const expectWidth = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  testId: string,
  predicted: number,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* boxOf(ctx, reader, testId);
    yield* ctx.check(
      label,
      Math.abs(box.width - predicted) <= 1
        ? Effect.void
        : failure(label, `${predicted}`, `${box.width}`),
    );
  });

const flexChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const allItems = Arr.flatMap(flexRows, (fixture) => fixture.items);
    yield* ctx.expectEqual(
      "the flex fixtures are distinct",
      Arr.length(Arr.dedupe(Arr.map(allItems, (item) => item.testId))),
      Arr.length(allItems),
    );

    const stage = yield* boxOf(ctx, reader, "flex-stage");
    yield* ctx.expectNear("the stage is 640 wide", stage.width, STAGE_WIDTH, 1);

    // 1. Every grow/basis row hands out exactly the model's widths.
    yield* Effect.forEach(
      flexRows.slice(0, 4),
      (fixture) =>
        Effect.gen(function* () {
          const ids = Arr.map(fixture.items, (item) => item.testId);
          const predicted = growWidths(
            fixture.width,
            Arr.map(fixture.items, (item) => ({
              basis: item.basis,
              grow: item.grow,
            })),
          );
          const boxes = yield* boxesOf(ctx, reader, ids);
          const measured = Arr.map(boxes, (box) => box.width);
          yield* ctx.check(
            `${fixture.rowId} hands out its widths`,
            widthsMatch(measured, predicted, 1)
              ? Effect.void
              : failure(
                  `${fixture.rowId} hands out its widths`,
                  describeNumbers(predicted),
                  describeNumbers(measured),
                ),
          );
        }),
      { concurrency: 1 },
    );

    // 2. The named relations of the first two rows.
    const eleven = yield* boxesOf(ctx, reader, ["flex-11-a", "flex-11-b"]);
    const twelve = yield* boxesOf(ctx, reader, ["flex-12-a", "flex-12-b"]);
    const elevenA = yield* ctx.expectSome("flex-11-a read", Arr.head(eleven));
    const elevenB = yield* ctx.expectSome("flex-11-b read", Arr.get(eleven, 1));
    yield* ctx.expectNear(
      "grow 1:1 splits the free space",
      elevenA.width,
      300,
      1,
    );
    yield* ctx.expectNear(
      "the second grow item starts where the first ends",
      elevenB.x - (elevenA.x + elevenA.width),
      0,
      1,
    );
    const twelveA = yield* ctx.expectSome("flex-12-a read", Arr.head(twelve));
    const twelveB = yield* ctx.expectSome("flex-12-b read", Arr.get(twelve, 1));
    yield* ctx.expectNear(
      "grow 1:2 splits the free space",
      twelveA.width,
      200,
      1,
    );
    yield* ctx.expectNear(
      "the 1:2 row's second item takes two thirds",
      twelveB.width,
      400,
      1,
    );

    // 3. A fixed item keeps its basis; the grow item takes the rest.
    yield* expectWidth(
      ctx,
      reader,
      "flex-mix-fixed",
      100,
      "a non-growing item keeps its basis",
    );
    yield* expectWidth(
      ctx,
      reader,
      "flex-mix-grow",
      500,
      "a growing item takes what the basis item leaves",
    );

    // 4. Grow adds to the basis instead of replacing it.
    yield* expectWidth(
      ctx,
      reader,
      "flex-basis-a",
      350,
      "grow adds to the basis",
    );
    yield* expectWidth(
      ctx,
      reader,
      "flex-basis-b",
      250,
      "the basis pair still fills the row",
    );

    // 5. space-between pins both ends and spaces the middle evenly.
    const between = yield* boxesOf(
      ctx,
      reader,
      Arr.map(JUSTIFY_ITEMS, (item) => item.testId),
    );
    const betweenRow = yield* boxOf(ctx, reader, "flex-between");
    const betweenA = yield* ctx.expectSome(
      "flex-between-a read",
      Arr.head(between),
    );
    const betweenC = yield* ctx.expectSome(
      "flex-between-c read",
      Arr.get(between, 2),
    );
    yield* ctx.expectNear(
      "space-between pins the first item to the start",
      betweenA.x - betweenRow.x,
      0,
      1,
    );
    yield* ctx.expectNear(
      "space-between pins the last item to the end",
      betweenC.x + betweenC.width,
      betweenRow.x + betweenRow.width,
      1,
    );
    const gaps = measuredGaps(between);
    const predictedGaps = justifyGaps(
      "space-between",
      JUSTIFY_WIDTH,
      Arr.makeBy(Arr.length(JUSTIFY_ITEMS), () => 60),
    );
    yield* ctx.check(
      "space-between spaces the middle item evenly",
      widthsMatch(gaps, predictedGaps, 1)
        ? Effect.void
        : failure(
            "space-between spaces the middle item evenly",
            describeNumbers(predictedGaps),
            describeNumbers(gaps),
          ),
    );

    // 6. center halves the free space on both sides.
    const centreItem = yield* boxOf(ctx, reader, CENTRE_ITEM.testId);
    const centreRow = yield* boxOf(ctx, reader, "flex-centre-row");
    const leading = centreItem.x - centreRow.x;
    const trailing =
      centreRow.x + centreRow.width - (centreItem.x + centreItem.width);
    const predictedOffset = justifyOffset("center", CENTRE_WIDTH, [
      CENTRE_ITEM.basis,
    ]);
    yield* ctx.expectNear(
      "center halves the free space",
      leading,
      predictedOffset,
      1,
    );
    yield* ctx.expectNear(
      "center leaves the same space on the right",
      trailing,
      leading,
      1,
    );

    // 7. align-items centres a child by half the leftover height.
    const crossRow = yield* boxOf(ctx, reader, "flex-cross");
    yield* Effect.forEach(
      CROSS_CHILDREN,
      (child) =>
        Effect.gen(function* () {
          const box = yield* boxOf(ctx, reader, child.testId);
          const label = `align center offsets the ${child.height} px child`;
          const predicted = crossOffset(
            "center",
            crossRow.height,
            child.height,
          );
          yield* ctx.expectNear(label, box.y - crossRow.y, predicted, 1);
        }),
      { concurrency: 1 },
    );

    // 8. The default cross alignment stretches; flex-start does not.
    const stretched = yield* boxOf(ctx, reader, "flex-stretch-child");
    const defaulted = yield* boxOf(ctx, reader, "flex-default-child");
    const started = yield* boxOf(ctx, reader, "flex-start-child");
    yield* ctx.expectNear(
      "stretch fills a child with no height",
      stretched.height,
      ROW_HEIGHT,
      1,
    );
    yield* ctx.expectNear(
      "the default cross alignment is stretch",
      defaulted.height,
      ROW_HEIGHT,
      1,
    );
    yield* ctx.expectNear(
      "flex-start keeps the content height",
      started.height,
      CONTENT_HEIGHT,
      1,
    );

    // 9. A percentage width resolves before grow.
    const percentRow = yield* boxOf(ctx, reader, "flex-percent");
    const percentCells = yield* boxesOf(ctx, reader, [
      "flex-percent-a",
      "flex-percent-b",
    ]);
    yield* ctx.expectNear(
      "a percentage width resolves before grow",
      percentRow.width,
      PERCENT_WIDTH,
      1,
    );
    const percentA = yield* ctx.expectSome(
      "flex-percent-a read",
      Arr.head(percentCells),
    );
    yield* ctx.expectNear(
      "a percentage row's grow items split it",
      percentA.width,
      PERCENT_WIDTH / 2,
      1,
    );

    // 10. A grow row with no declared width fills its column, then splits.
    const autoRow = yield* boxOf(ctx, reader, "flex-auto");
    yield* ctx.expectNear(
      "a grow row with no width fills its column",
      autoRow.width,
      STAGE_WIDTH,
      1,
    );
    const autoPredicted = growWidths(STAGE_WIDTH, [
      { basis: 60, grow: 1 },
      { basis: 60, grow: 2 },
    ]);
    const autoBoxes = yield* boxesOf(ctx, reader, [
      "flex-auto-a",
      "flex-auto-b",
    ]);
    const autoMeasured = Arr.map(autoBoxes, (box) => box.width);
    yield* ctx.check(
      "a grow row splits its own free space",
      widthsMatch(autoMeasured, autoPredicted, 1)
        ? Effect.void
        : failure(
            "a grow row splits its own free space",
            describeNumbers(autoPredicted),
            describeNumbers(autoMeasured),
          ),
    );

    // 11. A nested grow row splits the width its parent gave it.
    const nest = yield* boxOf(ctx, reader, "flex-nest");
    yield* ctx.expectNear(
      "a nested grow row fills its parent",
      nest.width,
      600,
      1,
    );
    const nestBoxes = yield* boxesOf(ctx, reader, [
      "flex-nest-a",
      "flex-nest-b",
    ]);
    const nestPredicted = growWidths(nest.width, [
      { basis: 0, grow: 1 },
      { basis: 0, grow: 3 },
    ]);
    const nestMeasured = Arr.map(nestBoxes, (box) => box.width);
    yield* ctx.check(
      "a nested grow row splits its parent",
      widthsMatch(nestMeasured, nestPredicted, 1)
        ? Effect.void
        : failure(
            "a nested grow row splits its parent",
            describeNumbers(nestPredicted),
            describeNumbers(nestMeasured),
          ),
    );

    // 12. Shrink is proportional among shrinkable items only.
    const shrink = yield* boxesOf(ctx, reader, [
      "flex-shrink-a",
      "flex-shrink-b",
    ]);
    const shrinkPredicted = shrinkWidths(
      300,
      flexRows[4]?.items.map((item) => ({
        basis: item.basis,
        shrink: item.shrink ?? 1,
      })) ?? [],
    );
    const shrinkMeasured = Arr.map(shrink, (box) => box.width);
    const shrinkA = yield* ctx.expectSome(
      "flex-shrink-a read",
      Arr.head(shrink),
    );
    yield* ctx.expectNear(
      "a flexShrink: 0 item keeps its basis",
      shrinkA.width,
      200,
      1,
    );
    yield* ctx.check(
      "the shrinkable item absorbs the overflow",
      widthsMatch(shrinkMeasured, shrinkPredicted, 1)
        ? Effect.void
        : failure(
            "the shrinkable item absorbs the overflow",
            describeNumbers(shrinkPredicted),
            describeNumbers(shrinkMeasured),
          ),
    );

    // 13. The composed positions match the paint, not just the gaps.
    const positions = rowPositions(
      Arr.makeBy(Arr.length(JUSTIFY_ITEMS), () => 60),
      predictedGaps,
      betweenRow.x,
    );
    const paintedXs = Arr.map(between, (box) => box.x);
    yield* ctx.check(
      "the painted positions are the model's composed row",
      widthsMatch(paintedXs, positions, 1)
        ? Effect.void
        : failure(
            "the painted positions are the model's composed row",
            describeNumbers(positions),
            describeNumbers(paintedXs),
          ),
    );

    // 14. The row hands out every pixel: no rounding leaves a gutter.
    const twelveSum = Arr.reduce(
      [twelveA.width, twelveB.width],
      0,
      (sum, width) => sum + width,
    );
    yield* ctx.expectNear(
      "the grow row hands out every pixel",
      twelveSum,
      600,
      1,
    );
  });

export const flexLayoutScenario: PlaygroundScenario = {
  id: "flex-layout",
  title: "Flex distribution: grow, basis, justification and cross alignment",
  capability: "layout",
  view: flexLayoutView,
  steps: (ctx) => flexChecks(ctx, readSync(ctx.host)),
};

export const flexLayoutLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-flex-layout",
  title: "Flex distribution in a real window",
  capability: "layout",
  steps: (ctx) => flexChecks(ctx, readAsync(ctx.host)),
};
