/**
 * `layout-grid` — the grid and wrapping-flex contract.
 *
 * `layout-flex` covers flex rows, `gap` and absolute positioning. A stat-card
 * grid, a form row and a property panel need more than that: equal tracks, what
 * an explicit row count does to a fixed height, whether an item fills its cell,
 * what `gridColumnMin` changes, and whether a wrapping row keeps its `gap` when
 * the container has a height. Every answer below is a measured bound.
 *
 * Two measured surprises (plan 341 §2): only the **default** and
 * `gridColumnMin: "zero"` give equal tracks — `min-content` fills the container
 * with unequal tracks and `max-content` leaves the remainder unused; and a
 * wrapping flex row **stretches its line boxes** when the container is taller
 * than the content, so a fixed-height toolbar must declare
 * `alignContent: "flex-start"` to keep the gap exact.
 */
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import type { PlaygroundScenario } from "../types.js";

/** One labelled fixture: a caption above the grid under test. */
const Fixture = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, width: 300 }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
      {children}
    </div>
  );
};

/** A plain cell; omitted `height` lets the grid stretch it into the row. */
const Cell = ({
  testId,
  height,
  width,
}: {
  readonly testId: string;
  readonly height?: number;
  readonly width?: number;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{
        backgroundColor: theme.colors.muted,
        ...(height === undefined ? {} : { height }),
        ...(width === undefined ? {} : { width }),
      }}
    />
  );
};

/** The text pair the four `gridColumnMin` modes share. */
const TextCells = ({ prefix }: { readonly prefix: string }) => (
  <>
    <div testId={`${prefix}-1`} style={{ height: 20 }}>
      <text>short</text>
    </div>
    <div testId={`${prefix}-2`} style={{ height: 20 }}>
      <text>a much longer string here</text>
    </div>
  </>
);

const GRID: StyleDesc = { display: "grid", gap: 10, width: 300 };

const LayoutGridProbe = () => {
  const theme = useTheme();
  const cell = (testId: string, height: number): ReactNode => (
    <Cell testId={testId} height={height} />
  );
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        alignContent: "flex-start",
        gap: 16,
        width: 640,
        backgroundColor: theme.colors.background,
      }}
    >
      <Fixture label="three equal tracks">
        <div testId="grid-equal" style={{ ...GRID, gridTemplateColumns: 3 }}>
          {cell("grid-equal-1", 20)}
          {cell("grid-equal-2", 20)}
          {cell("grid-equal-3", 20)}
        </div>
      </Fixture>

      <Fixture label="explicit rows fill the height">
        <div
          testId="grid-rows"
          style={{
            ...GRID,
            gridTemplateColumns: 2,
            gridTemplateRows: 2,
            height: 200,
          }}
        >
          <Cell testId="grid-rows-1" />
          <Cell testId="grid-rows-2" />
          <Cell testId="grid-rows-3" />
          <Cell testId="grid-rows-4" />
        </div>
      </Fixture>

      <Fixture label="auto rows follow their content">
        <div testId="grid-auto" style={{ ...GRID, gridTemplateColumns: 2 }}>
          {cell("grid-auto-1", 60)}
          {cell("grid-auto-2", 20)}
          {cell("grid-auto-3", 20)}
        </div>
      </Fixture>

      <Fixture label="an explicit row count splits the height">
        <div
          testId="grid-row-count"
          style={{
            ...GRID,
            gridTemplateColumns: 2,
            gridTemplateRows: 3,
            height: 100,
          }}
        >
          {cell("grid-row-count-1", 10)}
          {cell("grid-row-count-2", 10)}
          {cell("grid-row-count-3", 10)}
          {cell("grid-row-count-4", 10)}
        </div>
      </Fixture>

      <Fixture label="column minimum: default">
        <div testId="grid-default" style={{ ...GRID, gridTemplateColumns: 2 }}>
          <TextCells prefix="grid-default" />
        </div>
      </Fixture>

      <Fixture label="column minimum: zero">
        <div
          testId="grid-zero"
          style={{ ...GRID, gridTemplateColumns: 2, gridColumnMin: "zero" }}
        >
          <TextCells prefix="grid-zero" />
        </div>
      </Fixture>

      <Fixture label="column minimum: min-content">
        <div
          testId="grid-min"
          style={{
            ...GRID,
            gridTemplateColumns: 2,
            gridColumnMin: "min-content",
          }}
        >
          <TextCells prefix="grid-min" />
        </div>
      </Fixture>

      <Fixture label="column minimum: max-content">
        <div
          testId="grid-max"
          style={{
            ...GRID,
            gridTemplateColumns: 2,
            gridColumnMin: "max-content",
          }}
        >
          <TextCells prefix="grid-max" />
        </div>
      </Fixture>

      <Fixture label="centred content-sized tracks">
        <div
          testId="grid-center"
          style={{
            ...GRID,
            gridTemplateColumns: 2,
            gridColumnMin: "max-content",
            justifyContent: "center",
          }}
        >
          <div testId="grid-center-1" style={{ width: 30, height: 10 }} />
          <div testId="grid-center-2" style={{ width: 30, height: 10 }} />
        </div>
      </Fixture>

      <Fixture label="a nested grid resolves against its cell">
        <div
          testId="grid-nest"
          style={{ ...GRID, gridTemplateColumns: 2, gridColumnMin: "zero" }}
        >
          <div style={{ height: 40 }} />
          <div
            testId="grid-nest-inner"
            style={{
              display: "grid",
              gridTemplateColumns: 2,
              gridColumnMin: "zero",
              gap: 4,
              height: 40,
            }}
          >
            <Cell testId="grid-nest-inner-1" />
            <Cell testId="grid-nest-inner-2" />
          </div>
        </div>
      </Fixture>

      <Fixture label="an oversized child overflows its cell">
        <div
          testId="grid-overflow"
          style={{ ...GRID, gridTemplateColumns: 2, gridColumnMin: "zero" }}
        >
          <Cell testId="grid-overflow-1" height={20} width={500} />
          {cell("grid-overflow-2", 20)}
        </div>
      </Fixture>

      <Fixture label="a grid grows as a flex child">
        <div style={{ display: "flex", width: 300, height: 60 }}>
          <div
            testId="grid-grow"
            style={{
              display: "grid",
              gridTemplateColumns: 2,
              gridColumnMin: "zero",
              flexGrow: 1,
              gap: 10,
            }}
          >
            <Cell testId="grid-grow-1" />
            <Cell testId="grid-grow-2" />
          </div>
        </div>
      </Fixture>

      <Fixture label="a wrapped row in a fixed height">
        <div
          testId="wrap-stretch"
          style={{
            display: "flex",
            flexWrap: "wrap",
            flexShrink: 0,
            gap: 8,
            width: 220,
            height: 200,
          }}
        >
          <Cell testId="wrap-stretch-1" width={100} height={30} />
          <Cell testId="wrap-stretch-2" width={100} height={30} />
          <Cell testId="wrap-stretch-3" width={100} height={30} />
        </div>
      </Fixture>

      <Fixture label="the same row, alignContent start">
        <div
          testId="wrap-start"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            flexShrink: 0,
            gap: 8,
            width: 220,
            height: 200,
          }}
        >
          <Cell testId="wrap-start-1" width={100} height={30} />
          <Cell testId="wrap-start-2" width={100} height={30} />
          <Cell testId="wrap-start-3" width={100} height={30} />
        </div>
      </Fixture>

      <Fixture label="the same row, auto height">
        <div
          testId="wrap-auto"
          style={{
            display: "flex",
            flexWrap: "wrap",
            flexShrink: 0,
            gap: 8,
            width: 220,
          }}
        >
          <Cell testId="wrap-auto-1" width={100} height={30} />
          <Cell testId="wrap-auto-2" width={100} height={30} />
          <Cell testId="wrap-auto-3" width={100} height={30} />
        </div>
      </Fixture>
    </div>
  );
};

export const layoutGridScenario: PlaygroundScenario = {
  id: "layout-grid",
  title: "Grid: tracks, rows, column minima, overflow and wrapping",
  capability: "grid-layout",
  view: () => <LayoutGridProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = (id: string) =>
        ctx.expectSome(
          `${id} painted`,
          Option.fromNullishOr(ctx.host.bounds(id)),
        );
      /** The gap between two boxes laid out in order. */
      const gapAfter = (
        first: { readonly x: number; readonly width: number },
        second: { readonly x: number; readonly width: number },
      ) => second.x - (first.x + first.width);

      // Equal tracks: 300 px, three columns, 10 px gaps.
      const equal = yield* box("grid-equal");
      const equal1 = yield* box("grid-equal-1");
      const equal2 = yield* box("grid-equal-2");
      const equal3 = yield* box("grid-equal-3");
      yield* ctx.expectNear("equal grid width", equal.width, 300, 1);
      yield* ctx.expectNear("first track width", equal1.width, 93.33, 1);
      yield* ctx.expectNear("second track width", equal2.width, 93.33, 1);
      yield* ctx.expectNear("third track width", equal3.width, 93.33, 1);
      yield* ctx.expectNear(
        "gap after track 1",
        gapAfter(equal1, equal2),
        10,
        1,
      );
      yield* ctx.expectNear(
        "gap after track 2",
        gapAfter(equal2, equal3),
        10,
        1,
      );
      yield* ctx.expectNear(
        "third track ends at the grid edge",
        equal3.x + equal3.width - equal.x,
        300,
        1,
      );

      // Explicit rows split the fixed height and items fill their cell.
      const rows = yield* box("grid-rows");
      const row1 = yield* box("grid-rows-1");
      const row2 = yield* box("grid-rows-2");
      const row3 = yield* box("grid-rows-3");
      yield* ctx.expectNear("row cell width", row1.width, 145, 1);
      yield* ctx.expectNear("row cell height", row1.height, 95, 1);
      yield* ctx.expectNear(
        "column 2 starts after the gap",
        row2.x - rows.x,
        155,
        1,
      );
      yield* ctx.expectNear(
        "row 2 starts after the gap",
        row3.y - rows.y,
        105,
        1,
      );
      yield* ctx.expectNear("row 2 cell height", row3.height, 95, 1);

      // Auto rows follow their tallest child.
      const auto = yield* box("grid-auto");
      const auto1 = yield* box("grid-auto-1");
      const auto3 = yield* box("grid-auto-3");
      yield* ctx.expectNear("auto grid height", auto.height, 90, 1);
      yield* ctx.expectNear("tall child keeps its height", auto1.height, 60, 1);
      yield* ctx.expectNear(
        "second auto row starts below the first",
        auto3.y - auto.y,
        70,
        1,
      );

      // An explicit row count splits the height; a short child does not stretch.
      const rowCount = yield* box("grid-row-count");
      const rowCount1 = yield* box("grid-row-count-1");
      const rowCount3 = yield* box("grid-row-count-3");
      yield* ctx.expectNear(
        "declared child height wins over the track",
        rowCount1.height,
        10,
        1,
      );
      yield* ctx.expectNear(
        "third explicit row starts at 36.5",
        rowCount3.y - rowCount.y,
        36.5,
        1,
      );

      // Column minima: default and zero are equal; min fills; max leaves room.
      const default1 = yield* box("grid-default-1");
      const zero1 = yield* box("grid-zero-1");
      const min = yield* box("grid-min");
      const min1 = yield* box("grid-min-1");
      const min2 = yield* box("grid-min-2");
      const max = yield* box("grid-max");
      const max1 = yield* box("grid-max-1");
      const max2 = yield* box("grid-max-2");
      yield* ctx.expectNear("default first track", default1.width, 145, 1);
      yield* ctx.expectNear("zero first track", zero1.width, 145, 1);
      yield* ctx.expectNear(
        "min-content first track is narrow",
        min1.width,
        104,
        2,
      );
      yield* ctx.expectNear(
        "min-content fills the grid",
        min2.x + min2.width - min.x,
        300,
        2,
      );
      yield* ctx.expectNear(
        "max-content first track is its text",
        max1.width,
        38,
        2,
      );
      yield* ctx.expectNear(
        "max-content leaves the remainder unused",
        max2.x + max2.width - max.x,
        234,
        4,
      );

      // justify-content centres a content-sized track set.
      const center = yield* box("grid-center");
      const center1 = yield* box("grid-center-1");
      const center2 = yield* box("grid-center-2");
      yield* ctx.expectNear("centre offset", center1.x - center.x, 115, 1);
      yield* ctx.expectNear("centre second cell", center2.x - center.x, 155, 1);

      // A nested grid resolves against its cell.
      const nest = yield* box("grid-nest");
      const nestInner = yield* box("grid-nest-inner");
      const nestInner1 = yield* box("grid-nest-inner-1");
      yield* ctx.expectNear(
        "inner grid starts after the gap",
        nestInner.x - nest.x,
        155,
        1,
      );
      yield* ctx.expectNear("inner track width", nestInner1.width, 70.5, 1);

      // An oversized child overflows; it does not resize its track.
      const overflow = yield* box("grid-overflow");
      const overflow1 = yield* box("grid-overflow-1");
      const overflow2 = yield* box("grid-overflow-2");
      yield* ctx.expectNear(
        "oversized child keeps its width",
        overflow1.width,
        500,
        1,
      );
      yield* ctx.expectNear(
        "the neighbour keeps its track",
        overflow2.x - overflow.x,
        155,
        1,
      );

      // A grid grows as a flex child.
      const grow = yield* box("grid-grow");
      const grow1 = yield* box("grid-grow-1");
      yield* ctx.expectNear("grid grows to the row", grow.width, 300, 1);
      yield* ctx.expectNear("grown track width", grow1.width, 145, 1);

      // Wrapping rows: default stretches the lines; alignContent start does not.
      const stretch = yield* box("wrap-stretch");
      const stretch3 = yield* box("wrap-stretch-3");
      const start = yield* box("wrap-start");
      const start3 = yield* box("wrap-start-3");
      const autoWrap = yield* box("wrap-auto");
      const autoWrap3 = yield* box("wrap-auto-3");
      yield* ctx.expectNear(
        "fixed wrapping container keeps its height",
        stretch.height,
        200,
        1,
      );
      yield* ctx.expectNear(
        "default wrapping spreads the second line",
        stretch3.y - stretch.y,
        104,
        1,
      );
      yield* ctx.expectNear(
        "alignContent start keeps one gap",
        start3.y - start.y,
        38,
        1,
      );
      yield* ctx.expectNear(
        "auto-height wrapping row is exact",
        autoWrap.height,
        68,
        1,
      );
      yield* ctx.expectNear(
        "auto-height second line stays on the gap",
        autoWrap3.y - autoWrap.y,
        38,
        1,
      );
    }),
};
