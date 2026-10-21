/**
 * `box-inset` / `live-box-inset`: the box model in the frame (plan `835`).
 *
 * The bug being guarded: `padding` appears in 144 shipped call sites, `margin`
 * in 8 component sites (plus every separator inset and the slider thumb's
 * **negative** margins) and a percentage size in 29, and no scenario in either
 * registry asserted one. A runtime that ignored padding, applied a uniform inset
 * to every side, refused a negative margin, collapsed vertical margins, or
 * resolved a percentage against the border box passed the whole suite.
 *
 * Bounds-only: the box model is geometry, so both hosts answer it directly and
 * the probe pays no frame decode. The arithmetic lives in `box-inset-model.ts`.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import type { PlaygroundScenario } from "../types.js";
import { readAsync, readSync, type FrameReader } from "./frames.js";
import {
  allSides,
  centreOffset,
  contentHeight,
  contentOffset,
  contentWidth,
  marginRow,
  near,
  paintedBox,
  percentOf,
  reportedRight,
  stackedStart,
  stretchHeight,
  type Insets,
} from "./box-inset-model.js";

/** The stage width both columns sit on. */
export const STAGE_WIDTH = 984;
/** One fixture column. */
export const COLUMN_WIDTH = 480;
/** The gutter between the columns. */
export const COLUMN_GAP = 24;
/** The gutter between fixtures. */
export const ROW_GAP = 12;

interface PaddedFixture {
  readonly testId: string;
  readonly width: number;
  readonly height: number;
  readonly insets: Insets;
  readonly border?: number;
}

/** The uniform inset: content 208 × 88. */
export const PAD: PaddedFixture = {
  testId: "box-pad",
  width: 240,
  height: 120,
  insets: allSides(16),
};

/** One inset per side, so a uniform application is visible. */
export const PAD_SIDES: PaddedFixture = {
  testId: "box-pad-sides",
  width: 240,
  height: 120,
  insets: { top: 4, right: 8, bottom: 24, left: 40 },
};

/** The same padding behind a 2 px border. */
export const PAD_BORDER: PaddedFixture = {
  testId: "box-pad-border",
  width: 240,
  height: 120,
  insets: allSides(16),
  border: 2,
};

/** A percentage width resolves against this content box (208). */
export const PAD_PERCENT: PaddedFixture = {
  testId: "box-pad-percent",
  width: 240,
  height: 60,
  insets: allSides(16),
};

/** A percentage height resolves against this content box (60). */
export const PAD_HEIGHT: PaddedFixture = {
  testId: "box-pad-height",
  width: 200,
  height: 100,
  insets: allSides(20),
};

/** A grow row splits this content box (280). */
export const PAD_ROW: PaddedFixture = {
  testId: "box-pad-row",
  width: 300,
  height: 60,
  insets: allSides(10),
};

/** The padded surface whose padding band is a hit target. */
export const PAD_HIT: PaddedFixture = {
  testId: "box-hit",
  width: 240,
  height: 84,
  insets: allSides(16),
};

/** The margin-driven row: A 50, B +20, C −10. */
export const MARGIN_WIDTHS: ReadonlyArray<number> = [50, 50, 50];
export const MARGIN_INSETS: ReadonlyArray<number> = [0, 20, -10];

/** The vertical-margin pair: A 20 + 20 below, B 20 + 10 above. */
export const COLUMN_A_HEIGHT = 20;
export const COLUMN_B_HEIGHT = 20;
export const COLUMN_A_MARGIN_BOTTOM = 20;
export const COLUMN_B_MARGIN_TOP = 10;

const Fixture = ({
  testId,
  width,
  height,
  children,
}: {
  readonly testId: string;
  readonly width: number;
  readonly height: number;
  readonly children: ReactNode;
}) => (
  <div
    testId={testId}
    style={{
      display: "flex",
      width,
      height,
      flexShrink: 0,
      alignItems: "flex-start",
    }}
  >
    {children}
  </div>
);

const Padded = ({
  fixture,
  children,
  style,
  onClick,
}: {
  readonly fixture: PaddedFixture;
  readonly children: ReactNode;
  readonly style?: Record<string, unknown>;
  readonly onClick?: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={fixture.testId}
      onClick={onClick}
      style={{
        width: fixture.width,
        height: fixture.height,
        paddingTop: fixture.insets.top,
        paddingRight: fixture.insets.right,
        paddingBottom: fixture.insets.bottom,
        paddingLeft: fixture.insets.left,
        borderWidth: fixture.border ?? 0,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.card,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const BoxProbe = () => {
  const theme = useTheme();
  const ink = { color: theme.colors.foreground, fontSize: 12 };
  const [hits, setHits] = useState({ box: 0, child: 0 });
  return (
    <div
      testId="box-stage"
      style={{
        display: "flex",
        gap: COLUMN_GAP,
        alignItems: "flex-start",
        width: STAGE_WIDTH,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="box-column-a"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ROW_GAP,
          width: COLUMN_WIDTH,
        }}
      >
        <Fixture testId="box-pad-wrap" width={PAD.width} height={PAD.height}>
          <Padded fixture={PAD}>
            <div
              testId="box-pad-child"
              style={{
                width: "100%",
                height: 20,
                backgroundColor: theme.colors.primary,
              }}
            />
            <text testId="box-pad-text" style={ink}>
              hello
            </text>
          </Padded>
        </Fixture>
        <Fixture
          testId="box-pad-sides-wrap"
          width={PAD_SIDES.width}
          height={PAD_SIDES.height}
        >
          <Padded fixture={PAD_SIDES}>
            <div
              testId="box-pad-sides-child"
              style={{
                width: "100%",
                height: 20,
                backgroundColor: theme.colors.primary,
              }}
            />
          </Padded>
        </Fixture>
        <Fixture
          testId="box-pad-border-wrap"
          width={PAD_BORDER.width}
          height={PAD_BORDER.height}
        >
          <Padded fixture={PAD_BORDER}>
            <div
              testId="box-pad-border-child"
              style={{
                width: "100%",
                height: 20,
                backgroundColor: theme.colors.success,
              }}
            />
          </Padded>
        </Fixture>
        <Fixture
          testId="box-pad-percent-wrap"
          width={PAD_PERCENT.width}
          height={PAD_PERCENT.height}
        >
          <Padded fixture={PAD_PERCENT}>
            <div
              testId="box-pad-percent-child"
              style={{
                width: "50%",
                height: 20,
                backgroundColor: theme.colors.primary,
              }}
            />
          </Padded>
        </Fixture>
        <Fixture
          testId="box-pad-height-wrap"
          width={PAD_HEIGHT.width}
          height={PAD_HEIGHT.height}
        >
          <Padded fixture={PAD_HEIGHT}>
            <div
              testId="box-pad-height-child"
              style={{
                width: 20,
                height: "100%",
                backgroundColor: theme.colors.primary,
              }}
            />
          </Padded>
        </Fixture>
        <Fixture
          testId="box-pad-row-wrap"
          width={PAD_ROW.width}
          height={PAD_ROW.height}
        >
          <Padded fixture={PAD_ROW} style={{ display: "flex" }}>
            <div
              testId="box-pad-row-a"
              style={{
                flexGrow: 1,
                height: 20,
                backgroundColor: theme.colors.primary,
              }}
            />
            <div
              testId="box-pad-row-b"
              style={{
                flexGrow: 1,
                height: 20,
                backgroundColor: theme.colors.accent,
              }}
            />
          </Padded>
        </Fixture>
      </div>

      <div
        testId="box-column-b"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ROW_GAP,
          width: COLUMN_WIDTH,
        }}
      >
        <Fixture testId="box-margin-row-wrap" width={300} height={60}>
          <div
            testId="box-margin-row"
            style={{
              display: "flex",
              width: 300,
              height: 60,
              backgroundColor: theme.colors.card,
            }}
          >
            {Arr.map(MARGIN_WIDTHS, (_width, index) => (
              <div
                key={index}
                testId={`box-margin-${index}`}
                style={{
                  width: 50,
                  height: 20,
                  marginLeft: MARGIN_INSETS[index] ?? 0,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ))}
          </div>
        </Fixture>
        <Fixture testId="box-margin-column-wrap" width={300} height={70}>
          <div
            testId="box-margin-column"
            style={{
              display: "flex",
              flexDirection: "column",
              width: 300,
              backgroundColor: theme.colors.card,
            }}
          >
            <div
              testId="box-margin-col-a"
              style={{
                height: COLUMN_A_HEIGHT,
                marginBottom: COLUMN_A_MARGIN_BOTTOM,
                backgroundColor: theme.colors.primary,
              }}
            />
            <div
              testId="box-margin-col-b"
              style={{
                height: COLUMN_B_HEIGHT,
                marginTop: COLUMN_B_MARGIN_TOP,
                backgroundColor: theme.colors.accent,
              }}
            />
          </div>
        </Fixture>
        <Fixture testId="box-margin-center-wrap" width={300} height={60}>
          <div
            testId="box-margin-center"
            style={{
              display: "flex",
              width: 300,
              height: 60,
              alignItems: "center",
              backgroundColor: theme.colors.card,
            }}
          >
            <div
              testId="box-margin-center-child"
              style={{
                width: 40,
                height: 20,
                marginTop: 4,
                marginBottom: 6,
                backgroundColor: theme.colors.primary,
              }}
            />
          </div>
        </Fixture>
        <Fixture testId="box-margin-stretch-wrap" width={300} height={60}>
          <div
            testId="box-margin-stretch"
            style={{
              display: "flex",
              width: 300,
              height: 60,
              backgroundColor: theme.colors.card,
            }}
          >
            <div
              testId="box-margin-stretch-child"
              style={{
                marginTop: 10,
                marginBottom: 10,
                backgroundColor: theme.colors.primary,
              }}
            >
              <text style={ink}>ab</text>
            </div>
          </div>
        </Fixture>
        <Fixture testId="box-bounds-wrap" width={200} height={60}>
          <Padded
            fixture={{
              testId: "box-bounds",
              width: 200,
              height: 60,
              insets: allSides(12),
            }}
          >
            <div
              testId="box-bounds-child"
              style={{
                width: "100%",
                height: 20,
                backgroundColor: theme.colors.primary,
              }}
            />
          </Padded>
        </Fixture>
        <Fixture
          testId="box-hit-wrap"
          width={PAD_HIT.width}
          height={PAD_HIT.height}
        >
          <Padded
            fixture={PAD_HIT}
            onClick={() =>
              setHits((previous) => ({ ...previous, box: previous.box + 1 }))
            }
          >
            <div
              testId="box-hit-child"
              style={{
                width: 100,
                height: 30,
                backgroundColor: theme.colors.success,
              }}
              onClick={() =>
                setHits((previous) => ({
                  ...previous,
                  child: previous.child + 1,
                }))
              }
            />
          </Padded>
        </Fixture>
        <text testId="box-hit-readout" style={ink}>
          {`box=${hits.box} child=${hits.child}`}
        </text>
      </div>
    </div>
  );
};

export const boxInsetView = (): ReactNode => <BoxProbe />;

/** The one host difference: plain reads or Effects, and a settle after input. */
interface BoxDriver<E> {
  readonly reader: FrameReader<E>;
  readonly clickPoint: (x: number, y: number) => Effect.Effect<void, E>;
  readonly read: (testId: string) => Effect.Effect<string | null, E>;
}

const headlessDriver = (host: Smoke.SmokeHost): BoxDriver<never> => ({
  reader: readSync(host),
  clickPoint: (x, y) =>
    Effect.gen(function* () {
      host.clickWindow(x, y);
      // The click's React commit lands on a later task; one paint is not enough.
      yield* Effect.sleep(Duration.millis(80));
      host.paint();
    }),
  read: (testId) => Effect.sync(() => host.text(testId)),
});

/** A window commits a click on its next frame, so every press is settled. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): BoxDriver<Smoke.SmokeHostError> => {
  const settle = Effect.sleep(Duration.millis(120));
  return {
    reader: readAsync(host),
    clickPoint: (x, y) => Effect.andThen(host.clickWindow(x, y), settle),
    read: host.text,
  };
};

const failure = (
  label: string,
  expected: string,
  actual: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(new Smoke.SmokeAssertionError({ label, expected, actual }));

const number = (value: number): string => `${Math.round(value * 100) / 100}`;

const boxOf = <E,>(
  ctx: Smoke.SmokeContext<unknown>,
  reader: FrameReader<E>,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* reader.bounds(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(box),
    );
  });

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

const boxChecks = <E,>(
  ctx: Smoke.SmokeContext<unknown>,
  driver: BoxDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const ids = [
      PAD,
      PAD_SIDES,
      PAD_BORDER,
      PAD_PERCENT,
      PAD_HEIGHT,
      PAD_ROW,
      PAD_HIT,
    ].map((fixture) => fixture.testId);
    yield* ctx.expectEqual(
      "the box fixtures are distinct",
      Arr.length(Arr.dedupe(ids)),
      Arr.length(ids),
    );

    const stage = yield* boxOf(ctx, driver.reader, "box-stage");
    yield* expectNumber(ctx, stage.width, STAGE_WIDTH, "the stage is 984 wide");

    // 1. Uniform padding: the origin moves in, the declared size does not.
    const padWrap = yield* boxOf(ctx, driver.reader, "box-pad-wrap");
    const pad = yield* boxOf(ctx, driver.reader, PAD.testId);
    const offset = contentOffset(PAD.insets, PAD.border ?? 0);
    yield* expectNumber(
      ctx,
      pad.x - padWrap.x,
      offset.x,
      "padding shifts the content origin",
    );
    yield* expectNumber(
      ctx,
      pad.y - padWrap.y,
      offset.y,
      "padding shifts the content origin down",
    );
    yield* expectNumber(
      ctx,
      pad.width,
      PAD.width,
      "the padding band is part of the box",
    );
    const padChild = yield* boxOf(ctx, driver.reader, "box-pad-child");
    yield* expectNumber(
      ctx,
      padChild.width,
      contentWidth(PAD.width, PAD.insets),
      "padding shrinks the content width",
    );
    const painted = paintedBox(pad, PAD.insets, PAD.border ?? 0);
    yield* expectNumber(
      ctx,
      painted.y + PAD.insets.top + contentHeight(painted.height, PAD.insets),
      padWrap.y + padWrap.height - PAD.insets.bottom,
      "the content box ends where the bottom padding begins",
    );

    // 2. Per-side insets apply to their own axis only.
    const sidesWrap = yield* boxOf(ctx, driver.reader, "box-pad-sides-wrap");
    const sides = yield* boxOf(ctx, driver.reader, PAD_SIDES.testId);
    const sidesChild = yield* boxOf(ctx, driver.reader, "box-pad-sides-child");
    yield* expectNumber(
      ctx,
      sides.x - sidesWrap.x,
      PAD_SIDES.insets.left,
      "per-side padding uses its left inset",
    );
    yield* expectNumber(
      ctx,
      sides.y - sidesWrap.y,
      PAD_SIDES.insets.top,
      "per-side padding uses its top inset",
    );
    yield* expectNumber(
      ctx,
      sidesChild.width,
      contentWidth(PAD_SIDES.width, PAD_SIDES.insets),
      "per-side padding shrinks only its own axis",
    );

    // 3. A border adds to the origin and is excluded from the reported size.
    const borderWrap = yield* boxOf(ctx, driver.reader, "box-pad-border-wrap");
    const border = yield* boxOf(ctx, driver.reader, PAD_BORDER.testId);
    const borderChild = yield* boxOf(
      ctx,
      driver.reader,
      "box-pad-border-child",
    );
    const borderOrigin = contentOffset(
      PAD_BORDER.insets,
      PAD_BORDER.border ?? 0,
    );
    yield* expectNumber(
      ctx,
      border.x - borderWrap.x,
      borderOrigin.x,
      "a border adds to the origin",
    );
    yield* expectNumber(
      ctx,
      border.width,
      PAD_BORDER.width - (PAD_BORDER.border ?? 0) * 2,
      "a border is excluded from the reported width",
    );
    yield* expectNumber(
      ctx,
      border.height,
      PAD_BORDER.height - (PAD_BORDER.border ?? 0) * 2,
      "a border is excluded from the reported height",
    );
    yield* expectNumber(
      ctx,
      borderChild.width,
      contentWidth(
        PAD_BORDER.width - (PAD_BORDER.border ?? 0) * 2,
        PAD_BORDER.insets,
      ),
      "a border and padding both shrink the content",
    );

    // 4. A percentage resolves against the content box.
    const percentChild = yield* boxOf(
      ctx,
      driver.reader,
      "box-pad-percent-child",
    );
    yield* expectNumber(
      ctx,
      percentChild.width,
      percentOf(contentWidth(PAD_PERCENT.width, PAD_PERCENT.insets), 50),
      "a percentage width resolves against the content box",
    );
    const heightChild = yield* boxOf(
      ctx,
      driver.reader,
      "box-pad-height-child",
    );
    yield* expectNumber(
      ctx,
      heightChild.height,
      percentOf(contentHeight(PAD_HEIGHT.height, PAD_HEIGHT.insets), 100),
      "a percentage height resolves against the content box",
    );

    // 5. A grow row distributes the content box, starting at its origin.
    const rowWrap = yield* boxOf(ctx, driver.reader, "box-pad-row-wrap");
    const rowA = yield* boxOf(ctx, driver.reader, "box-pad-row-a");
    const rowB = yield* boxOf(ctx, driver.reader, "box-pad-row-b");
    yield* expectNumber(
      ctx,
      rowA.x - rowWrap.x,
      PAD_ROW.insets.left,
      "a padded grow row starts at its content origin",
    );
    const content = contentWidth(PAD_ROW.width, PAD_ROW.insets);
    yield* expectNumber(
      ctx,
      rowA.width,
      content / 2,
      "a padded grow row splits its content box",
    );
    yield* expectNumber(
      ctx,
      rowB.width,
      content / 2,
      "a padded grow row hands out every content pixel",
    );

    // 6. Margins place exactly, including a negative one.
    const marginRowBox = yield* boxOf(ctx, driver.reader, "box-margin-row");
    const margins = yield* Effect.forEach(
      ["box-margin-0", "box-margin-1", "box-margin-2"],
      (id) => boxOf(ctx, driver.reader, id),
      { concurrency: 1 },
    );
    const predicted = marginRow(MARGIN_WIDTHS, MARGIN_INSETS);
    yield* ctx.check(
      "margins place the row exactly",
      Arr.every(margins, (box, index) =>
        near(box.x - marginRowBox.x, predicted[index] ?? Number.NaN),
      )
        ? Effect.void
        : failure(
            "margins place the row exactly",
            Arr.join(
              Arr.map(predicted, (value) => number(value)),
              ",",
            ),
            Arr.join(
              Arr.map(margins, (box) => number(box.x - marginRowBox.x)),
              ",",
            ),
          ),
    );
    const [, second, third] = margins;
    if (second === undefined || third === undefined) {
      return yield* failure("the margin row is painted", "3 boxes", "fewer");
    }
    yield* expectNumber(
      ctx,
      second.x - (margins[0]?.x ?? 0) - (MARGIN_WIDTHS[0] ?? 0),
      20,
      "a positive margin offsets the next item",
    );
    yield* expectNumber(
      ctx,
      third.x - (second.x + second.width),
      -10,
      "a negative margin pulls the next item back",
    );
    yield* expectNumber(
      ctx,
      second.x + second.width - third.x,
      10,
      "a negative margin overlaps its neighbour",
    );

    // 7. Vertical margins add instead of collapsing.
    const column = yield* boxOf(ctx, driver.reader, "box-margin-column");
    const columnA = yield* boxOf(ctx, driver.reader, "box-margin-col-a");
    const columnB = yield* boxOf(ctx, driver.reader, "box-margin-col-b");
    yield* expectNumber(
      ctx,
      columnB.y - columnA.y,
      stackedStart(
        COLUMN_A_HEIGHT,
        COLUMN_A_MARGIN_BOTTOM,
        COLUMN_B_MARGIN_TOP,
      ),
      "vertical margins do not collapse",
    );
    yield* expectNumber(
      ctx,
      column.height,
      COLUMN_A_HEIGHT +
        COLUMN_A_MARGIN_BOTTOM +
        COLUMN_B_HEIGHT +
        COLUMN_B_MARGIN_TOP,
      "the column is as tall as both margin boxes",
    );

    // 8. A centred child is centred by its margin box.
    const centreRow = yield* boxOf(ctx, driver.reader, "box-margin-center");
    const centreChild = yield* boxOf(
      ctx,
      driver.reader,
      "box-margin-center-child",
    );
    yield* expectNumber(
      ctx,
      centreChild.y - centreRow.y,
      centreOffset(centreRow.height, centreChild.height, 4, 6),
      "alignItems center centres the margin box",
    );

    // 9. Stretch subtracts the margins on both sides.
    const stretchRow = yield* boxOf(ctx, driver.reader, "box-margin-stretch");
    const stretchChild = yield* boxOf(
      ctx,
      driver.reader,
      "box-margin-stretch-child",
    );
    yield* expectNumber(
      ctx,
      stretchChild.height,
      stretchHeight(stretchRow.height, 10, 10),
      "stretch subtracts the vertical margins",
    );
    yield* expectNumber(
      ctx,
      stretchChild.y - stretchRow.y,
      10,
      "a stretched child starts after its top margin",
    );

    // 10. The consumer trap: the reported rectangle is not the painted one.
    const boundsWrap = yield* boxOf(ctx, driver.reader, "box-bounds-wrap");
    const bounds = yield* boxOf(ctx, driver.reader, "box-bounds");
    const boundsInsets = allSides(12);
    const boundsPainted = paintedBox(bounds, boundsInsets, 0);
    yield* expectNumber(
      ctx,
      bounds.x - boundsWrap.x,
      boundsInsets.left,
      "the reported origin is the content origin",
    );
    yield* expectNumber(
      ctx,
      reportedRight(bounds) - (boundsPainted.x + boundsPainted.width),
      boundsInsets.left,
      "a consumer's x + width overshoots by the leading inset",
    );
    yield* expectNumber(
      ctx,
      boundsPainted.width,
      boundsWrap.width,
      "the recovered painted box matches the wrapper",
    );

    // 11. The padding band is a hit target; the child is the child's.
    const hitWrap = yield* boxOf(ctx, driver.reader, "box-hit-wrap");
    yield* driver.clickPoint(hitWrap.x + 4, hitWrap.y + 4);
    const afterPadding = yield* driver.read("box-hit-readout");
    yield* ctx.expectEqual(
      "a press in the padding band reaches the box",
      Option.getOrElse(Option.fromNullishOr(afterPadding), () => "none"),
      "box=1 child=0",
    );
    const hitChild = yield* boxOf(ctx, driver.reader, "box-hit-child");
    yield* driver.clickPoint(
      hitChild.x + hitChild.width / 2,
      hitChild.y + hitChild.height / 2,
    );
    const afterChild = yield* driver.read("box-hit-readout");
    yield* ctx.expectEqual(
      "a press on the child reaches the child alone",
      Option.getOrElse(Option.fromNullishOr(afterChild), () => "none"),
      "box=1 child=1",
    );
  });

export const boxInsetScenario: PlaygroundScenario = {
  id: "box-inset",
  title: "The box model: padding, margin, percentages and what bounds reports",
  capability: "layout",
  view: boxInsetView,
  steps: (ctx) => boxChecks(ctx, headlessDriver(ctx.host)),
};

export const boxInsetLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-box-inset",
  title: "The box model in a real window",
  capability: "layout",
  steps: (ctx) => boxChecks(ctx, liveDriver(ctx.host)),
};
