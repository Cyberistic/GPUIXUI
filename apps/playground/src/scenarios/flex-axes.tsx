/**
 * `flex-axes` / `live-flex-axes`: the flex box's remaining axes in the frame
 * (plan `841`).
 *
 * The bug being guarded: plan `833` measured grow, basis, `justifyContent` and
 * the cross-axis alignment, and plan `341` one `alignContent` value — the rest
 * of the axes were unmeasured. `tw`'s `flex-col-reverse` emits a value the
 * pinned `apply_styles` has no arm for, `wrap-reverse` was never read, every
 * `alignContent` mode but `flex-start` was unread, and the per-axis gaps
 * override the `gap` shorthand with no check, so a runtime that ignored the
 * axis, the reversal or the distribution passed the whole suite.
 *
 * Bounds-only, so the probe pays no frame decode. The arithmetic lives in
 * `flex-axes-model.ts`.
 */
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import { Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import type { PlaygroundScenario } from "../types.js";
import { paintedBox, readAsync, readSync, type FrameReader } from "./frames.js";
import { near } from "./box-inset-model.js";
import {
  axisGap,
  itemInLine,
  lineOf,
  lineStarts,
  starts,
  type AlignContentMode,
} from "./flex-axes-model.js";

/** The stage: three 300 px columns and two 24 px gutters. */
export const STAGE_WIDTH = 960;
/** One fixture column. */
export const COLUMN_WIDTH = 300;
/** The gutter between columns and between fixtures. */
export const GAP = 24;
const ROW_GAP = 12;
/** A direction fixture: three 40 × 20 cells in a 200 × 100 box. */
export const CELL_WIDTH = 40;
export const CELL_HEIGHT = 20;
export const DIRECTION_BOX = { width: 200, height: 100 } as const;
/** A wrap fixture: three 100 × 40 cells in a 200 × 120 box. */
export const WRAP_BOX = { width: 200, height: 120 } as const;
export const WRAP_CELL = { width: 100, height: 40 } as const;
/** An `alignContent` fixture: six 40 × 20 cells, three per column, 200 wide. */
export const ALIGN_BOX = { width: 200, height: 60 } as const;
export const ALIGN_ITEMS = 6;
/** The per-axis gap fixtures. */
export const GAP_ROW = { gap: 5, rowGap: 20, columnGap: 30 } as const;
export const GAP_COLUMN = { gap: 5, rowGap: 20 } as const;
export const GAP_WRAP = {
  gap: 4,
  rowGap: 30,
  columnGap: 10,
  width: 100,
  height: 200,
} as const;

const Column = ({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}) => (
  <div
    testId={testId}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: ROW_GAP,
      width: COLUMN_WIDTH,
    }}
  >
    {children}
  </div>
);

const Probe = () => {
  const theme = useTheme();
  const box = { backgroundColor: theme.colors.card };
  const ink = theme.colors.primary;
  const other = theme.colors.accent;

  const cell = (
    id: string,
    size: { width: number; height: number } = {
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
    },
    colour = ink,
  ) => (
    <div key={id} testId={id} style={{ ...size, backgroundColor: colour }} />
  );

  return (
    <div
      testId="fx-stage"
      style={{
        display: "flex",
        gap: GAP,
        alignItems: "flex-start",
        width: STAGE_WIDTH,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Column 1 — the direction, including the two reversed values. */}
      <Column testId="fx-column-a">
        {(
          [
            ["fx-row", "row"],
            ["fx-row-reverse", "row-reverse"],
            ["fx-column", "column"],
            ["fx-column-reverse", "column-reverse"],
            ["fx-default", undefined],
          ] as const
        ).map(([id, direction]) => (
          <div
            key={id}
            testId={id}
            style={{
              display: "flex",
              width: DIRECTION_BOX.width,
              height: DIRECTION_BOX.height,
              ...(direction === undefined ? {} : { flexDirection: direction }),
              ...box,
            }}
          >
            {[0, 1, 2].map((index) => cell(`${id}-${index}`))}
          </div>
        ))}
      </Column>

      {/* Column 2 — wrapping and the alignContent modes. */}
      <Column testId="fx-column-b">
        {(
          [
            ["fx-wrap", "wrap"],
            ["fx-wrap-reverse", "wrap-reverse"],
          ] as const
        ).map(([id, wrap]) => (
          <div
            key={id}
            testId={id}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: wrap,
              width: WRAP_BOX.width,
              height: WRAP_BOX.height,
              ...box,
            }}
          >
            {[0, 1, 2].map((index) =>
              cell(
                `${id}-${index}`,
                { width: WRAP_CELL.width, height: WRAP_CELL.height },
                index === 2 ? other : ink,
              ),
            )}
          </div>
        ))}
        {(
          [
            ["fx-ac-center", "center"],
            ["fx-ac-between", "space-between"],
            ["fx-ac-around", "space-around"],
            ["fx-ac-evenly", "space-evenly"],
            ["fx-ac-stretch", undefined],
          ] as const
        ).map(([id, mode]) => (
          <div
            key={id}
            testId={id}
            style={{
              display: "flex",
              flexDirection: "column",
              flexWrap: "wrap",
              width: ALIGN_BOX.width,
              height: ALIGN_BOX.height,
              ...(mode === undefined ? {} : { alignContent: mode }),
              ...box,
            }}
          >
            {Arr.map(Arr.range(0, ALIGN_ITEMS - 1), (index) =>
              cell(
                `${id}-${index}`,
                undefined,
                lineOf(index, 3) === 0 ? ink : other,
              ),
            )}
          </div>
        ))}
      </Column>

      {/* Column 3 — the per-axis gaps. */}
      <Column testId="fx-column-c">
        <div
          testId="fx-gap-row"
          style={{
            display: "flex",
            flexDirection: "row",
            width: 200,
            height: 100,
            gap: GAP_ROW.gap,
            rowGap: GAP_ROW.rowGap,
            columnGap: GAP_ROW.columnGap,
            ...box,
          }}
        >
          {[0, 1, 2].map((index) => cell(`fx-gap-row-${index}`))}
        </div>
        <div
          testId="fx-gap-column"
          style={{
            display: "flex",
            flexDirection: "column",
            width: 200,
            height: 200,
            gap: GAP_COLUMN.gap,
            rowGap: GAP_COLUMN.rowGap,
            ...box,
          }}
        >
          {[0, 1, 2].map((index) => cell(`fx-gap-column-${index}`))}
        </div>
        <div
          testId="fx-gap-wrap"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            width: GAP_WRAP.width,
            height: GAP_WRAP.height,
            gap: GAP_WRAP.gap,
            rowGap: GAP_WRAP.rowGap,
            columnGap: GAP_WRAP.columnGap,
            ...box,
          }}
        >
          {[0, 1, 2, 3].map((index) => cell(`fx-gap-wrap-${index}`))}
        </div>
      </Column>
    </div>
  );
};

export const flexAxesView = (): ReactNode => <Probe />;

const failure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

const number = (value: number): string => `${Math.round(value * 100) / 100}`;

const list = (values: ReadonlyArray<number>): string =>
  Arr.join(
    Arr.map(values, (value) => number(value)),
    ",",
  );

/** Assert one measured number against the model, naming both. */
const expectNumber = (
  ctx: Smoke.SmokeContext<unknown>,
  actual: number,
  predicted: number,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.check(
    label,
    near(actual, predicted)
      ? Effect.void
      : failure(label, number(predicted), number(actual)),
  );

/** Assert a measured run of offsets against the model's run, naming both. */
const expectRun = (
  ctx: Smoke.SmokeContext<unknown>,
  actual: ReadonlyArray<number>,
  predicted: ReadonlyArray<number>,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.check(
    label,
    Arr.length(actual) === Arr.length(predicted) &&
      Arr.every(actual, (value, index) =>
        near(value, predicted[index] ?? Number.NaN),
      )
      ? Effect.void
      : failure(label, list(predicted), list(actual)),
  );

/** Read every cell of `prefix` once, in index order. */
const cellsOf = <E,>(
  ctx: Smoke.SmokeContext<unknown>,
  reader: FrameReader<E>,
  prefix: string,
  count: number,
): Effect.Effect<ReadonlyArray<Smoke.Bounds>, Smoke.SmokeAssertionError | E> =>
  Effect.forEach(
    Arr.range(0, count - 1),
    (index) => paintedBox(ctx, reader, `${prefix}-${index}`),
    { concurrency: 1 },
  );

/** The offsets of already-read cells from their parent's content origin. */
const offsetsOf = (
  boxes: ReadonlyArray<Smoke.Bounds>,
  parent: Smoke.Bounds,
  axis: "x" | "y",
): ReadonlyArray<number> =>
  Arr.map(boxes, (box) => (axis === "x" ? box.x - parent.x : box.y - parent.y));

const flexAxesChecks = <E,>(
  ctx: Smoke.SmokeContext<unknown>,
  reader: FrameReader<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const ids = [
      "fx-row",
      "fx-row-reverse",
      "fx-column",
      "fx-column-reverse",
      "fx-default",
      "fx-wrap",
      "fx-wrap-reverse",
      "fx-ac-center",
      "fx-ac-between",
      "fx-ac-around",
      "fx-ac-evenly",
      "fx-ac-stretch",
      "fx-gap-row",
      "fx-gap-column",
      "fx-gap-wrap",
    ];
    yield* ctx.expectEqual(
      "the flex fixtures are distinct",
      Arr.length(Arr.dedupe(ids)),
      Arr.length(ids),
    );

    const stage = yield* paintedBox(ctx, reader, "fx-stage");
    yield* expectNumber(ctx, stage.width, STAGE_WIDTH, "the stage is 960 wide");

    // 1. The direction: row is the default and the control.
    const row = yield* paintedBox(ctx, reader, "fx-row");
    const rowCells = yield* cellsOf(ctx, reader, "fx-row", 3);
    const rowRun = offsetsOf(rowCells, row, "x");
    const rowYs = offsetsOf(rowCells, row, "y");
    yield* expectRun(
      ctx,
      rowRun,
      starts([CELL_WIDTH, CELL_WIDTH, CELL_WIDTH], 0),
      "an explicit row starts at the leading edge",
    );
    yield* expectRun(ctx, rowYs, [0, 0, 0], "a row lays its cells on one line");

    const defaultBox = yield* paintedBox(ctx, reader, "fx-default");
    const defaultCells = yield* cellsOf(ctx, reader, "fx-default", 3);
    const defaultRun = offsetsOf(defaultCells, defaultBox, "x");
    yield* expectRun(ctx, defaultRun, rowRun, "the default direction is row");

    // 2. The reversed values: measured ignored, and the model's answer recorded.
    const reverseBox = yield* paintedBox(ctx, reader, "fx-row-reverse");
    const reverseCells = yield* cellsOf(ctx, reader, "fx-row-reverse", 3);
    const reverseRun = offsetsOf(reverseCells, reverseBox, "x");
    yield* expectRun(
      ctx,
      reverseRun,
      rowRun,
      "row-reverse lays out forward on this pin (the mapper has no reverse arm)",
    );

    // 3. A column stacks; a column-reverse does not even stack.
    const column = yield* paintedBox(ctx, reader, "fx-column");
    const columnCells = yield* cellsOf(ctx, reader, "fx-column", 3);
    const columnRun = offsetsOf(columnCells, column, "y");
    const columnXs = offsetsOf(columnCells, column, "x");
    yield* expectRun(
      ctx,
      columnRun,
      starts([CELL_HEIGHT, CELL_HEIGHT, CELL_HEIGHT], 0),
      "a column stacks the cells",
    );
    yield* expectRun(ctx, columnXs, [0, 0, 0], "a column keeps one x");

    const columnReverse = yield* paintedBox(ctx, reader, "fx-column-reverse");
    const columnReverseCells = yield* cellsOf(
      ctx,
      reader,
      "fx-column-reverse",
      3,
    );
    const columnReverseRun = offsetsOf(columnReverseCells, columnReverse, "x");
    yield* expectRun(
      ctx,
      columnReverseRun,
      rowRun,
      "column-reverse lays out as a row on this pin (the mapper has no reverse arm)",
    );

    // 4. Wrapping: the third cell starts the second line.
    const wrap = yield* paintedBox(ctx, reader, "fx-wrap");
    const wrapCells = yield* cellsOf(ctx, reader, "fx-wrap", 3);
    const wrapYs = offsetsOf(wrapCells, wrap, "y");
    const wrapXs = offsetsOf(wrapCells, wrap, "x");
    yield* expectRun(
      ctx,
      wrapYs,
      [
        0,
        0,
        lineStarts("stretch", 2, WRAP_CELL.height, WRAP_BOX.height)[1] ??
          Number.NaN,
      ],
      "a wrapped row breaks at the container",
    );
    yield* expectRun(
      ctx,
      wrapXs,
      Arr.append(starts([WRAP_CELL.width, WRAP_CELL.width], 0), 0),
      "the wrapped cell starts the next line at the leading edge",
    );

    // 5. wrap-reverse packs the first line at the end of the cross axis.
    const wrapReverse = yield* paintedBox(ctx, reader, "fx-wrap-reverse");
    const wrapReverseCells = yield* cellsOf(ctx, reader, "fx-wrap-reverse", 3);
    const wrapReverseYs = offsetsOf(wrapReverseCells, wrapReverse, "y");
    const pitch = lineStarts("stretch", 2, WRAP_CELL.height, WRAP_BOX.height);
    const lineSize = WRAP_BOX.height / 2;
    const inLine = itemInLine(lineSize, WRAP_CELL.height, true);
    yield* expectRun(
      ctx,
      wrapReverseYs,
      Arr.map(
        [
          pitch[1] ?? Number.NaN,
          pitch[1] ?? Number.NaN,
          pitch[0] ?? Number.NaN,
        ],
        (line) => line + inLine,
      ),
      "wrap-reverse packs the first line at the end",
    );

    // 6. Every alignContent mode places the two columns.
    const modes: ReadonlyArray<readonly [string, AlignContentMode]> = [
      ["fx-ac-center", "center"],
      ["fx-ac-between", "space-between"],
      ["fx-ac-around", "space-around"],
      ["fx-ac-evenly", "space-evenly"],
      ["fx-ac-stretch", "stretch"],
    ];
    yield* Effect.forEach(
      modes,
      ([prefix, mode]) =>
        Effect.gen(function* () {
          const parent = yield* paintedBox(ctx, reader, prefix);
          const cells = yield* cellsOf(ctx, reader, prefix, ALIGN_ITEMS);
          const xs = offsetsOf(cells, parent, "x");
          const predicted = lineStarts(mode, 2, CELL_WIDTH, ALIGN_BOX.width);
          const expected = Arr.flatMap(predicted, (start) =>
            Arr.replicate(start, 3),
          );
          yield* expectRun(
            ctx,
            xs,
            expected,
            `alignContent ${mode} places the two columns`,
          );
        }),
      { concurrency: 1 },
    );

    // 7. The per-axis gaps: the longhand wins on its own axis.
    const gapRow = yield* paintedBox(ctx, reader, "fx-gap-row");
    const gapRowCells = yield* cellsOf(ctx, reader, "fx-gap-row", 3);
    const gapRowRun = offsetsOf(gapRowCells, gapRow, "x");
    yield* expectRun(
      ctx,
      gapRowRun,
      starts(
        [CELL_WIDTH, CELL_WIDTH, CELL_WIDTH],
        axisGap("main", "row", GAP_ROW.gap, GAP_ROW.rowGap, GAP_ROW.columnGap),
      ),
      "columnGap is the main gap of a row",
    );

    const gapColumn = yield* paintedBox(ctx, reader, "fx-gap-column");
    const gapColumnCells = yield* cellsOf(ctx, reader, "fx-gap-column", 3);
    const gapColumnRun = offsetsOf(gapColumnCells, gapColumn, "y");
    yield* expectRun(
      ctx,
      gapColumnRun,
      starts(
        [CELL_HEIGHT, CELL_HEIGHT, CELL_HEIGHT],
        axisGap("main", "column", GAP_COLUMN.gap, GAP_COLUMN.rowGap),
      ),
      "rowGap is the main gap of a column",
    );

    const gapWrap = yield* paintedBox(ctx, reader, "fx-gap-wrap");
    const gapWrapCells = yield* cellsOf(ctx, reader, "fx-gap-wrap", 4);
    const gapWrapXs = offsetsOf(gapWrapCells, gapWrap, "x");
    const gapWrapYs = offsetsOf(gapWrapCells, gapWrap, "y");
    const main = axisGap(
      "main",
      "row",
      GAP_WRAP.gap,
      GAP_WRAP.rowGap,
      GAP_WRAP.columnGap,
    );
    yield* expectRun(
      ctx,
      gapWrapXs,
      Arr.appendAll(
        starts([CELL_WIDTH, CELL_WIDTH], main),
        starts([CELL_WIDTH, CELL_WIDTH], main),
      ),
      "the main gap spaces the cells inside a line",
    );
    const lines = lineStarts(
      "stretch",
      2,
      CELL_HEIGHT,
      GAP_WRAP.height,
      GAP_WRAP.rowGap,
    );
    yield* expectRun(
      ctx,
      gapWrapYs,
      [
        lines[0] ?? Number.NaN,
        lines[0] ?? Number.NaN,
        lines[1] ?? Number.NaN,
        lines[1] ?? Number.NaN,
      ],
      "the cross gap changes the line pitch",
    );
  });

export const flexAxesScenario: PlaygroundScenario = {
  id: "flex-axes",
  title: "The flex axes: reverse directions, wrap and the per-axis gaps",
  capability: "layout",
  view: flexAxesView,
  steps: (ctx) => flexAxesChecks(ctx, readSync(ctx.host)),
};

export const flexAxesLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-flex-axes",
  title: "The flex axes in a real window",
  capability: "layout",
  steps: (ctx) => flexAxesChecks(ctx, readAsync(ctx.host)),
};
