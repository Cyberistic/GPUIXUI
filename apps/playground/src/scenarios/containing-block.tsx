/**
 * `containing-block` / `live-containing-block`: the positioning contract in the
 * frame (plan `839`).
 *
 * The bug being guarded: `position` appears in 146 shipped and scenario call
 * sites and it is the basis of every overlay, yet no scenario asserted a rule.
 * `apply_styles` maps `fixed` onto `absolute`, an absolute box is contained by
 * its **direct parent's** padding box rather than the nearest positioned
 * ancestor, and paint order is tree order. A runtime that resolved an absolute
 * box against a positioned ancestor, placed it from the wrong edge, let a
 * declared size lose to an inset, or painted it above a later sibling passes the
 * whole suite while every menu, veil and rail lands in the wrong place.
 *
 * Bounds-only apart from six presses, so the probe pays no frame decode. The
 * arithmetic lives in `position-model.ts`.
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
import { allSides, near } from "./box-inset-model.js";
import {
  paddingBoxOrigin,
  placeIn,
  outsideOf,
  relativePaint,
} from "./position-model.js";

/** The stage width: three 300 px columns and two 24 px gutters. */
export const STAGE_WIDTH = 960;
/** One fixture column. */
export const COLUMN_WIDTH = 300;
/** The gutter between the columns and between fixtures. */
export const GAP = 24;

const ROW_GAP = 12;
const BOX_WIDTH = 200;
const BOX_HEIGHT = 100;

/** The static-parent fixture: a child 5 px in from both edges. */
export const STATIC_OFFSET = 5;
/** The border fixture's declarations. */
export const BORDER_PADDING = 8;
export const BORDER_WIDTH = 4;
/** The static-mid fixture's margins and padding. */
export const MID_MARGIN_TOP = 30;
export const MID_MARGIN_LEFT = 40;
export const MID_PADDING = 6;
export const MID_CHILD_OFFSET = 4;
/** The no-inset fixture's padding. */
export const NO_INSET_PADDING = 12;
/** The one-axis fixture: `left` only, with a 24 px flow child before it. */
export const ONE_AXIS_PADDING = 10;
export const ONE_AXIS_LEFT = 30;
export const ONE_AXIS_FLOW_HEIGHT = 24;
/** The stretch and size-wins fixture. */
export const INSET = 10;
export const INSET_SIZE_WIDTH = 40;
export const INSET_SIZE_HEIGHT = 20;
/** The trailing fixture. */
export const TRAILING_INSET = 10;
export const TRAILING_SIZE = 30;
/** The negative-inset fixture. */
export const NEGATIVE_INSET = -10;
/** The relative fixture. */
export const RELATIVE_TOP = 10;
export const RELATIVE_LEFT = 15;
export const RELATIVE_SIZE = 20;
/** The fixed/absolute twins. */
export const TWIN_TOP = 7;
export const TWIN_LEFT = 9;
export const TWIN_SIZE = 30;
/** The scroll fixture. */
export const SCROLL_TOP = 20;
export const SCROLL_LEFT = 10;
export const SCROLL_DELTA = -100;
/** The clip fixture. */
export const CLIP_PARENT_HEIGHT = 100;
export const CLIP_ABSOLUTE_TOP = 110;
export const CLIP_FIXED_TOP = 60;
export const CLIP_FIXED_LEFT = 100;

/** The two boxes that overlap in the paint-order fixture. */
export const ORDER_ABSOLUTE = { width: 160, height: 40 } as const;
export const ORDER_FLOW = { width: 60, height: 100 } as const;

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

/** An unpadded, fixed-size row, so a child's painted origin is its own. */
const Row = ({
  testId,
  height,
  width = BOX_WIDTH,
  children,
  style,
}: {
  readonly testId: string;
  readonly height: number;
  readonly width?: number;
  readonly children: ReactNode;
  readonly style?: Record<string, unknown>;
}) => (
  <div
    testId={testId}
    style={{
      display: "flex",
      width,
      height,
      flexShrink: 0,
      alignItems: "flex-start",
      ...style,
    }}
  >
    {children}
  </div>
);

const Probe = () => {
  const theme = useTheme();
  const surface = { backgroundColor: theme.colors.card };
  const child = { backgroundColor: theme.colors.primary };
  const other = { backgroundColor: theme.colors.accent };
  const [hits, setHits] = useState({ last: "none", count: 0 });
  const hit = (name: string) => () =>
    setHits((previous) => ({ last: name, count: previous.count + 1 }));

  return (
    <div
      testId="pos-stage"
      style={{
        display: "flex",
        gap: GAP,
        alignItems: "flex-start",
        width: STAGE_WIDTH,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Column 1 — what contains an absolute box. */}
      <Column testId="pos-column-a">
        <Row testId="pos-static" height={BOX_HEIGHT} style={surface}>
          <div
            testId="pos-static-abs"
            style={{
              position: "absolute",
              top: STATIC_OFFSET,
              left: STATIC_OFFSET,
              width: 30,
              height: 30,
              ...child,
            }}
          />
        </Row>

        <Row
          testId="pos-relative"
          height={BOX_HEIGHT}
          style={{ ...surface, position: "relative" }}
        >
          <div
            testId="pos-relative-abs"
            style={{
              position: "absolute",
              top: STATIC_OFFSET,
              left: STATIC_OFFSET,
              width: 30,
              height: 30,
              ...child,
            }}
          />
        </Row>

        <Row testId="pos-mid-wrap" height={120}>
          <div
            testId="pos-mid-grand"
            style={{
              display: "flex",
              width: 200,
              height: 120,
              position: "relative",
              ...surface,
            }}
          >
            <div
              testId="pos-mid"
              style={{
                display: "flex",
                marginTop: MID_MARGIN_TOP,
                marginLeft: MID_MARGIN_LEFT,
                width: 80,
                height: 40,
                padding: MID_PADDING,
                ...other,
              }}
            >
              <div
                testId="pos-mid-abs"
                style={{
                  position: "absolute",
                  top: MID_CHILD_OFFSET,
                  left: MID_CHILD_OFFSET,
                  width: 20,
                  height: 20,
                  ...child,
                }}
              />
            </div>
          </div>
        </Row>

        <Row testId="pos-border-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-border"
            style={{
              width: 200,
              height: 100,
              padding: BORDER_PADDING,
              borderWidth: BORDER_WIDTH,
              borderColor: theme.colors.primary,
              ...surface,
            }}
          >
            <div
              testId="pos-border-abs"
              style={{
                position: "absolute",
                top: STATIC_OFFSET,
                left: STATIC_OFFSET,
                width: 30,
                height: 30,
                ...child,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-noneset-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-noneset"
            style={{
              width: 200,
              height: 100,
              padding: NO_INSET_PADDING,
              ...surface,
            }}
          >
            <div
              testId="pos-noneset-abs"
              style={{ position: "absolute", width: 30, height: 30, ...child }}
            />
          </div>
        </Row>
      </Column>

      {/* Column 2 — how the box is placed and sized. */}
      <Column testId="pos-column-b">
        <Row testId="pos-oneaxis-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-oneaxis"
            style={{
              width: 200,
              height: 100,
              padding: ONE_AXIS_PADDING,
              ...surface,
            }}
          >
            <div
              testId="pos-oneaxis-flow"
              style={{ width: 40, height: ONE_AXIS_FLOW_HEIGHT, ...other }}
            />
            <div
              testId="pos-oneaxis-abs"
              style={{
                position: "absolute",
                left: ONE_AXIS_LEFT,
                width: 30,
                height: 30,
                ...child,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-outflow-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-outflow"
            style={{ width: 200, height: 100, ...surface }}
          >
            <div
              testId="pos-outflow-abs"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 80,
                height: 30,
                ...child,
              }}
            />
            <div
              testId="pos-outflow-flow"
              style={{ width: 40, height: 20, ...other }}
            />
          </div>
        </Row>

        <Row testId="pos-insets-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-insets"
            style={{ width: 200, height: 100, ...surface }}
          >
            <div
              testId="pos-insets-stretch"
              style={{
                position: "absolute",
                top: INSET,
                right: INSET,
                bottom: INSET,
                left: INSET,
                ...child,
              }}
            />
            <div
              testId="pos-insets-sized"
              style={{
                position: "absolute",
                top: INSET,
                right: INSET,
                bottom: INSET,
                left: INSET,
                width: INSET_SIZE_WIDTH,
                height: INSET_SIZE_HEIGHT,
                ...other,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-trailing-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-trailing"
            style={{ width: 200, height: 100, ...surface }}
          >
            <div
              testId="pos-trailing-abs"
              style={{
                position: "absolute",
                right: TRAILING_INSET,
                bottom: TRAILING_INSET,
                width: TRAILING_SIZE,
                height: TRAILING_SIZE,
                ...child,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-negative-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-negative"
            style={{ width: 200, height: 100, ...surface }}
          >
            <div
              testId="pos-negative-abs"
              style={{
                position: "absolute",
                top: NEGATIVE_INSET,
                left: NEGATIVE_INSET,
                width: 30,
                height: 30,
                ...child,
              }}
            />
          </div>
        </Row>
      </Column>

      {/* Column 3 — what a positioned box does to flow, paint and clipping. */}
      <Column testId="pos-column-c">
        <Row testId="pos-rel-wrap" height={120}>
          <div
            testId="pos-rel-box"
            style={{ width: 200, height: 120, ...surface }}
          >
            <div
              testId="pos-rel-first"
              style={{ width: 40, height: RELATIVE_SIZE, ...other }}
            />
            <div
              testId="pos-rel"
              onClick={hit("rel")}
              style={{
                position: "relative",
                top: RELATIVE_TOP,
                left: RELATIVE_LEFT,
                width: 40,
                height: RELATIVE_SIZE,
                ...child,
              }}
            />
            <div
              testId="pos-rel-after"
              style={{
                width: 40,
                height: RELATIVE_SIZE,
                marginLeft: 60,
                ...other,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-order-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-order"
            style={{ width: 200, height: 100, ...surface }}
          >
            <div
              testId="pos-order-abs"
              onClick={hit("abs")}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: ORDER_ABSOLUTE.width,
                height: ORDER_ABSOLUTE.height,
                ...child,
              }}
            />
            <div
              testId="pos-order-flow"
              onClick={hit("flow")}
              style={{
                width: ORDER_FLOW.width,
                height: ORDER_FLOW.height,
                ...other,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-twin-wrap" height={BOX_HEIGHT} width={COLUMN_WIDTH}>
          <div
            testId="pos-fixed-parent"
            style={{ width: 140, height: 100, ...surface }}
          >
            <div
              testId="pos-fixed-flow"
              style={{ width: 40, height: RELATIVE_SIZE, ...other }}
            />
            <div
              testId="pos-fixed"
              style={{
                position: "fixed",
                top: TWIN_TOP,
                left: TWIN_LEFT,
                width: TWIN_SIZE,
                height: TWIN_SIZE,
                ...child,
              }}
            />
          </div>
          <div
            testId="pos-absolute-parent"
            style={{ width: 140, height: 100, ...surface }}
          >
            <div
              testId="pos-absolute-flow"
              style={{ width: 40, height: RELATIVE_SIZE, ...other }}
            />
            <div
              testId="pos-absolute-twin"
              style={{
                position: "absolute",
                top: TWIN_TOP,
                left: TWIN_LEFT,
                width: TWIN_SIZE,
                height: TWIN_SIZE,
                ...other,
              }}
            />
          </div>
        </Row>

        <Row testId="pos-scroll-wrap" height={BOX_HEIGHT}>
          <div
            testId="pos-scroll"
            style={{ width: 200, height: 100, overflowY: "scroll", ...surface }}
          >
            <div testId="pos-scroll-content" style={{ height: 400, ...other }}>
              <div
                testId="pos-scroll-abs"
                style={{
                  position: "absolute",
                  top: SCROLL_TOP,
                  left: SCROLL_LEFT,
                  width: 20,
                  height: 20,
                  ...child,
                }}
              />
            </div>
          </div>
        </Row>

        <Row testId="pos-clip-wrap" height={140}>
          <div
            testId="pos-clip"
            style={{
              width: 200,
              height: CLIP_PARENT_HEIGHT,
              overflow: "hidden",
              ...surface,
            }}
          >
            <div
              testId="pos-clip-abs"
              onClick={hit("clipped-abs")}
              style={{
                position: "absolute",
                top: CLIP_ABSOLUTE_TOP,
                left: 0,
                width: 60,
                height: 40,
                ...child,
              }}
            />
            <div
              testId="pos-clip-fixed"
              onClick={hit("fixed")}
              style={{
                position: "fixed",
                top: CLIP_FIXED_TOP,
                left: CLIP_FIXED_LEFT,
                width: 60,
                height: 80,
                ...other,
              }}
            />
          </div>
        </Row>
      </Column>

      <text
        testId="pos-hit-readout"
        style={{ color: theme.colors.foreground, fontSize: 12 }}
      >
        {`${hits.last}:${hits.count}`}
      </text>
    </div>
  );
};

export const containingBlockView = (): ReactNode => <Probe />;

/** The one host difference: plain reads or Effects, and a settle after input. */
interface PositionDriver<E> {
  readonly reader: FrameReader<E>;
  readonly clickPoint: (x: number, y: number) => Effect.Effect<void, E>;
  readonly wheel: (testId: string, deltaY: number) => Effect.Effect<void, E>;
  readonly read: (testId: string) => Effect.Effect<string | null, E>;
}

const headlessDriver = (host: Smoke.SmokeHost): PositionDriver<never> => ({
  reader: readSync(host),
  clickPoint: (x, y) =>
    Effect.gen(function* () {
      host.clickWindow(x, y);
      // The click's React commit lands on a later task; one paint is not enough.
      yield* Effect.sleep(Duration.millis(80));
      host.paint();
    }),
  wheel: (testId, deltaY) =>
    Effect.gen(function* () {
      host.wheel(testId, 0, deltaY);
      yield* Effect.sleep(Duration.millis(80));
      host.paint();
    }),
  read: (testId) => Effect.sync(() => host.text(testId)),
});

/** A window commits on its next frame, so every input is settled. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): PositionDriver<Smoke.SmokeHostError> => {
  const settle = Effect.sleep(Duration.millis(120));
  return {
    reader: readAsync(host),
    clickPoint: (x, y) => Effect.andThen(host.clickWindow(x, y), settle),
    wheel: (testId, deltaY) =>
      Effect.andThen(host.wheel(testId, 0, deltaY), settle),
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

const positionChecks = <E,>(
  ctx: Smoke.SmokeContext<unknown>,
  driver: PositionDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const ids = [
      "pos-static",
      "pos-static-abs",
      "pos-relative",
      "pos-relative-abs",
      "pos-mid",
      "pos-mid-abs",
      "pos-border",
      "pos-border-abs",
      "pos-noneset",
      "pos-noneset-abs",
      "pos-oneaxis-abs",
      "pos-outflow-abs",
      "pos-outflow-flow",
      "pos-insets-stretch",
      "pos-insets-sized",
      "pos-trailing-abs",
      "pos-negative-abs",
      "pos-rel",
      "pos-rel-after",
      "pos-order-abs",
      "pos-order-flow",
      "pos-fixed",
      "pos-absolute-twin",
      "pos-scroll-abs",
      "pos-clip-abs",
      "pos-clip-fixed",
    ];
    yield* ctx.expectEqual(
      "the position fixtures are distinct",
      Arr.length(Arr.dedupe(ids)),
      Arr.length(ids),
    );

    const stage = yield* boxOf(ctx, driver.reader, "pos-stage");
    yield* expectNumber(ctx, stage.width, STAGE_WIDTH, "the stage is 960 wide");

    // 1. The containing block is the direct parent's padding box.
    const staticParent = yield* boxOf(ctx, driver.reader, "pos-static");
    const staticChild = yield* boxOf(ctx, driver.reader, "pos-static-abs");
    yield* expectNumber(
      ctx,
      staticChild.x - staticParent.x,
      STATIC_OFFSET,
      "an absolute box starts at its parent's padding box",
    );
    yield* expectNumber(
      ctx,
      staticChild.y - staticParent.y,
      STATIC_OFFSET,
      "an absolute box is placed down from the same origin",
    );

    // 2. A relative parent is not what makes it the containing block.
    const relativeParent = yield* boxOf(ctx, driver.reader, "pos-relative");
    const relativeChild = yield* boxOf(ctx, driver.reader, "pos-relative-abs");
    yield* ctx.expectEqual(
      "a relative parent is not the containing block",
      near(
        relativeChild.x - relativeParent.x,
        staticChild.x - staticParent.x,
      ) &&
        near(
          relativeChild.y - relativeParent.y,
          staticChild.y - staticParent.y,
        ),
      true,
    );

    // 3. A positioned ancestor does not contain a grandchild.
    const grand = yield* boxOf(ctx, driver.reader, "pos-mid-grand");
    const mid = yield* boxOf(ctx, driver.reader, "pos-mid");
    const midChild = yield* boxOf(ctx, driver.reader, "pos-mid-abs");
    const midBasis = paddingBoxOrigin(mid, allSides(MID_PADDING));
    yield* expectNumber(
      ctx,
      midChild.x - midBasis.x,
      MID_CHILD_OFFSET,
      "the static parent is the containing block",
    );
    yield* expectNumber(
      ctx,
      midChild.x - grand.x,
      MID_MARGIN_LEFT + MID_CHILD_OFFSET,
      "the positioned grandparent is 40 px from the answer",
    );

    // 4. The containing block excludes the border.
    const borderWrap = yield* boxOf(ctx, driver.reader, "pos-border-wrap");
    const borderParent = yield* boxOf(ctx, driver.reader, "pos-border");
    const borderChild = yield* boxOf(ctx, driver.reader, "pos-border-abs");
    yield* expectNumber(
      ctx,
      borderParent.x - borderWrap.x,
      BORDER_WIDTH + BORDER_PADDING,
      "the reported origin includes the border and the padding",
    );
    yield* expectNumber(
      ctx,
      borderChild.x - borderWrap.x,
      BORDER_WIDTH + STATIC_OFFSET,
      "the containing block excludes the border",
    );

    // 5. No inset falls back to the static position.
    const noInsetWrap = yield* boxOf(ctx, driver.reader, "pos-noneset-wrap");
    const noInset = yield* boxOf(ctx, driver.reader, "pos-noneset-abs");
    yield* expectNumber(
      ctx,
      noInset.x - noInsetWrap.x,
      NO_INSET_PADDING,
      "no insets use the parent's content origin",
    );

    // 6. One declared axis; the other keeps its static position.
    const oneAxisWrap = yield* boxOf(ctx, driver.reader, "pos-oneaxis-wrap");
    const oneAxis = yield* boxOf(ctx, driver.reader, "pos-oneaxis-abs");
    yield* expectNumber(
      ctx,
      oneAxis.x - oneAxisWrap.x,
      ONE_AXIS_LEFT,
      "a declared axis inset is measured from the padding box",
    );
    yield* expectNumber(
      ctx,
      oneAxis.y - oneAxisWrap.y,
      ONE_AXIS_PADDING + ONE_AXIS_FLOW_HEIGHT,
      "the undeclared axis keeps its static position",
    );

    // 7. An absolute box is out of flow.
    const outflow = yield* boxOf(ctx, driver.reader, "pos-outflow");
    const flowBox = yield* boxOf(ctx, driver.reader, "pos-outflow-flow");
    yield* expectNumber(
      ctx,
      flowBox.x - outflow.x,
      0,
      "an absolute box takes no flow slot across",
    );
    yield* expectNumber(
      ctx,
      flowBox.y - outflow.y,
      0,
      "an absolute box takes no flow slot down",
    );

    // 8. Both insets and no size stretch the box.
    const stretch = yield* boxOf(ctx, driver.reader, "pos-insets-stretch");
    const stretchParent = yield* boxOf(ctx, driver.reader, "pos-insets");
    const stretched = placeIn(
      paddingBoxOrigin(stretchParent, allSides(0)),
      { width: BOX_WIDTH, height: BOX_HEIGHT },
      { top: INSET, right: INSET, bottom: INSET, left: INSET },
      { x: stretchParent.x, y: stretchParent.y },
      { width: 30, height: 30 },
    );
    yield* expectNumber(
      ctx,
      stretch.width,
      stretched.size.width,
      "both insets and no size stretch the box",
    );
    yield* expectNumber(
      ctx,
      stretch.height,
      stretched.size.height,
      "the stretch applies on both axes",
    );

    // 9. A declared size beats the opposing inset, on both axes.
    const sized = yield* boxOf(ctx, driver.reader, "pos-insets-sized");
    const sizedPlace = placeIn(
      paddingBoxOrigin(stretchParent, allSides(0)),
      { width: BOX_WIDTH, height: BOX_HEIGHT },
      {
        top: INSET,
        right: INSET,
        bottom: INSET,
        left: INSET,
        width: INSET_SIZE_WIDTH,
        height: INSET_SIZE_HEIGHT,
      },
      { x: stretchParent.x, y: stretchParent.y },
      { width: 30, height: 30 },
    );
    yield* expectNumber(
      ctx,
      sized.x,
      sizedPlace.origin.x,
      "the leading inset wins over the trailing one",
    );
    yield* expectNumber(
      ctx,
      sized.width,
      sizedPlace.size.width,
      "a declared width survives a trailing inset",
    );
    yield* expectNumber(
      ctx,
      sized.y,
      sizedPlace.origin.y,
      "the top inset wins over the bottom one",
    );
    yield* expectNumber(
      ctx,
      sized.height,
      sizedPlace.size.height,
      "a declared height survives a bottom inset",
    );

    // 10. The trailing insets place from the far edge.
    const trailingParent = yield* boxOf(ctx, driver.reader, "pos-trailing");
    const trailing = yield* boxOf(ctx, driver.reader, "pos-trailing-abs");
    yield* expectNumber(
      ctx,
      trailingParent.x + BOX_WIDTH - (trailing.x + trailing.width),
      TRAILING_INSET,
      "the trailing inset places from the far edge",
    );
    yield* expectNumber(
      ctx,
      trailingParent.y + BOX_HEIGHT - (trailing.y + trailing.height),
      TRAILING_INSET,
      "the bottom inset places from the bottom edge",
    );

    // 11. A negative inset paints outside the parent.
    const negativeParent = yield* boxOf(ctx, driver.reader, "pos-negative");
    const negative = yield* boxOf(ctx, driver.reader, "pos-negative-abs");
    yield* expectNumber(
      ctx,
      negative.x - negativeParent.x,
      NEGATIVE_INSET,
      "a negative inset paints outside the parent",
    );
    yield* ctx.expectEqual(
      "the outside box is reported outside its parent",
      outsideOf(
        {
          x: negativeParent.x,
          y: negativeParent.y,
          width: BOX_WIDTH,
          height: BOX_HEIGHT,
        },
        negative,
      ),
      true,
    );

    // 12. A relative box keeps its flow slot.
    const relBox = yield* boxOf(ctx, driver.reader, "pos-rel-box");
    const relFirst = yield* boxOf(ctx, driver.reader, "pos-rel-first");
    const rel = yield* boxOf(ctx, driver.reader, "pos-rel");
    const relAfter = yield* boxOf(ctx, driver.reader, "pos-rel-after");
    const relPaint = relativePaint(
      { x: relBox.x, y: relFirst.y + RELATIVE_SIZE },
      { x: RELATIVE_LEFT, y: RELATIVE_TOP },
    );
    yield* expectNumber(
      ctx,
      relAfter.y - relFirst.y,
      RELATIVE_SIZE * 2,
      "a relative box keeps its flow slot",
    );
    yield* expectNumber(
      ctx,
      rel.x - relPaint.x,
      0,
      "a relative box paints at its offset",
    );
    yield* expectNumber(
      ctx,
      rel.y - relPaint.y,
      0,
      "a relative box paints down by its offset",
    );
    yield* driver.clickPoint(rel.x + rel.width / 2, rel.y + rel.height / 2);
    yield* ctx.expectEqual(
      "a press at the painted offset reaches the relative box",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "rel:1",
    );

    // 13. Paint order is tree order: a later in-flow sibling covers it.
    const orderParent = yield* boxOf(ctx, driver.reader, "pos-order");
    yield* driver.clickPoint(orderParent.x + 30, orderParent.y + 20);
    yield* ctx.expectEqual(
      "a later sibling paints over an earlier absolute box",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "flow:2",
    );
    yield* driver.clickPoint(orderParent.x + 140, orderParent.y + 20);
    yield* ctx.expectEqual(
      "an absolute box is hit on its exposed part",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "abs:3",
    );

    // 14. `fixed` is `absolute`: the twins agree and stay inside the parent.
    const fixedParent = yield* boxOf(ctx, driver.reader, "pos-fixed-parent");
    const absoluteParent = yield* boxOf(
      ctx,
      driver.reader,
      "pos-absolute-parent",
    );
    const fixed = yield* boxOf(ctx, driver.reader, "pos-fixed");
    const absoluteTwin = yield* boxOf(ctx, driver.reader, "pos-absolute-twin");
    yield* ctx.expectEqual(
      "fixed and absolute place the same box the same way",
      near(fixed.x - fixedParent.x, absoluteTwin.x - absoluteParent.x) &&
        near(fixed.y - fixedParent.y, absoluteTwin.y - absoluteParent.y),
      true,
    );
    yield* expectNumber(
      ctx,
      fixed.y - fixedParent.y,
      TWIN_TOP,
      "fixed is measured from its parent, not the window",
    );
    yield* expectNumber(
      ctx,
      fixed.y - fixedParent.y,
      absoluteTwin.y - absoluteParent.y,
      "fixed takes no flow slot beside its sibling",
    );

    // 15. An absolute box scrolls with its containing block.
    const scrollContent = yield* boxOf(
      ctx,
      driver.reader,
      "pos-scroll-content",
    );
    const scrollBefore = yield* boxOf(ctx, driver.reader, "pos-scroll-abs");
    yield* expectNumber(
      ctx,
      scrollBefore.y - scrollContent.y,
      SCROLL_TOP,
      "the absolute box starts inside its scrolled parent",
    );
    yield* driver.wheel("pos-scroll", SCROLL_DELTA);
    const scrollAfter = yield* boxOf(ctx, driver.reader, "pos-scroll-abs");
    yield* expectNumber(
      ctx,
      scrollAfter.y - scrollBefore.y,
      SCROLL_DELTA,
      "an absolute box scrolls with its containing block",
    );

    // 16. A clipping ancestor refuses a press outside it, fixed included.
    const clipParent = yield* boxOf(ctx, driver.reader, "pos-clip");
    yield* driver.clickPoint(
      clipParent.x + 30,
      clipParent.y + CLIP_ABSOLUTE_TOP + 10,
    );
    yield* ctx.expectEqual(
      "a clipping ancestor refuses a press outside it",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "abs:3",
    );
    yield* driver.clickPoint(
      clipParent.x + CLIP_FIXED_LEFT + 30,
      clipParent.y + CLIP_FIXED_TOP + 20,
    );
    yield* ctx.expectEqual(
      "a fixed box takes a press inside the clip",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "fixed:4",
    );
    yield* driver.clickPoint(
      clipParent.x + CLIP_FIXED_LEFT + 30,
      clipParent.y + CLIP_PARENT_HEIGHT + 20,
    );
    yield* ctx.expectEqual(
      "a clipping ancestor refuses a fixed box's overflow",
      Option.getOrElse(
        Option.fromNullishOr(yield* driver.read("pos-hit-readout")),
        () => "none",
      ),
      "fixed:4",
    );
  });

export const containingBlockScenario: PlaygroundScenario = {
  id: "containing-block",
  title: "The positioning contract: containing block, insets and paint order",
  capability: "layout",
  view: containingBlockView,
  steps: (ctx) => positionChecks(ctx, headlessDriver(ctx.host)),
};

export const containingBlockLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-containing-block",
  title: "The positioning contract in a real window",
  capability: "layout",
  steps: (ctx) => positionChecks(ctx, liveDriver(ctx.host)),
};
