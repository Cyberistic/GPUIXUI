/**
 * `layout-flex` — flex layout, gaps and absolute positioning.
 *
 * Verifies the arithmetic the whole component library sits on: explicit widths
 * are exact, `gap` is the space between boxes, and `position: "absolute"`
 * resolves against the nearest positioned ancestor. Every assertion is a
 * measured bound within 1px, never a pixel of a screenshot.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import {
  FLEX_ALIGN_CASES,
  FLEX_ALIGN_COLUMN_WIDTH,
  FLEX_ALIGN_CONTENT,
  FLEX_ASKED_WIDTH,
  FLEX_FIT_CONTENT,
  FLEX_FIXED_WIDTH,
  FLEX_FLOOR_CONTENT,
  FLEX_FLOOR_ROW_WIDTH,
  FLEX_IDS,
  FLEX_LONG_CONTENT,
  FLEX_MAX_WIDTH,
  FLEX_NARROW_WIDTH,
  FLEX_OVER_CONTENT,
  FLEX_ROW_WIDTH,
  FLEX_SHORT_CONTENT,
  FLEX_WIDTH_CASES,
} from "../live/flex-sizing.js";
import type { ScenarioBody } from "../types.js";

const LayoutProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="layout-root"
      style={{
        position: "relative",
        display: "flex",
        gap: 8,
        width: 640,
        height: 200,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="layout-a"
        style={{
          width: 200,
          height: 40,
          backgroundColor: theme.colors.primary,
        }}
      />
      <div
        testId="layout-b"
        style={{ width: 320, height: 40, backgroundColor: theme.colors.muted }}
      />
      <div
        testId="layout-abs"
        style={{
          position: "absolute",
          left: 24,
          top: 16,
          width: 60,
          height: 20,
          backgroundColor: theme.colors.success,
        }}
      />
    </div>
  );
};

export const layoutScenario: ScenarioBody = {
  view: () => <LayoutProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const root = yield* ctx.expectSome(
        "layout root painted",
        Option.fromNullishOr(ctx.host.bounds("layout-root")),
      );
      const a = yield* ctx.expectSome(
        "box a painted",
        Option.fromNullishOr(ctx.host.bounds("layout-a")),
      );
      const b = yield* ctx.expectSome(
        "box b painted",
        Option.fromNullishOr(ctx.host.bounds("layout-b")),
      );
      const absolute = yield* ctx.expectSome(
        "absolute box painted",
        Option.fromNullishOr(ctx.host.bounds("layout-abs")),
      );
      yield* ctx.expectNear("root width", root.width, 640, 1);
      yield* ctx.expectNear("box a width", a.width, 200, 1);
      yield* ctx.expectNear("box b width", b.width, 320, 1);
      yield* ctx.expectNear("gap between a and b", b.x - (a.x + a.width), 8, 1);
      yield* ctx.expectNear("absolute left", absolute.x - root.x, 24, 1);
      yield* ctx.expectNear("absolute top", absolute.y - root.y, 16, 1);
    }),
};

/**
 * `layout-flex-sizing` — the flex rules a `flex-1`, a `shrink-0` and a
 * truncating label rest on.
 *
 * The geometry lives in `live/flex-sizing.ts` because the window probe measures
 * the same rules: one table of expectations, one arithmetic, so the renderer
 * reading and the window reading cannot drift. The renderer's layout is the
 * runtime's own, so a rule that stops holding fails here in milliseconds rather
 * than only in a paid live run.
 */
const FlexSizingProbe = () => {
  const theme = useTheme();
  const row = (id: string, width: number) => ({
    testId: id,
    style: {
      width,
      height: 20,
      display: "flex" as const,
      flexDirection: "row" as const,
    },
  });
  const fixed = (id: string, width: number) => (
    <div
      testId={id}
      style={{
        width,
        flexShrink: 0,
        backgroundColor: theme.colors.primary,
      }}
    />
  );
  const content = (width: number) => (
    <div style={{ width, height: 20, backgroundColor: theme.colors.primary }} />
  );
  const grower = (id: string, width: number) => (
    <div testId={id} style={{ flexGrow: 1, flexBasis: 0 }}>
      {content(width)}
    </div>
  );
  const autoGrower = (id: string, width: number) => (
    <div testId={id} style={{ flexGrow: 1 }}>
      {content(width)}
    </div>
  );
  return (
    <div
      testId="layout-flex-sizing-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div {...row(FLEX_IDS.growRow, FLEX_ROW_WIDTH)}>
        {fixed(FLEX_IDS.growFixed, FLEX_FIXED_WIDTH)}
        <div
          testId={FLEX_IDS.growFill}
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}
        />
      </div>
      <div {...row(FLEX_IDS.basisZeroRow, FLEX_ROW_WIDTH)}>
        {fixed(FLEX_IDS.basisZeroFixed, FLEX_FIXED_WIDTH)}
        {grower(FLEX_IDS.basisZeroShort, FLEX_SHORT_CONTENT)}
        {grower(FLEX_IDS.basisZeroFit, FLEX_FIT_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.basisAutoRow, FLEX_ROW_WIDTH)}>
        {fixed(FLEX_IDS.basisAutoFixed, FLEX_FIXED_WIDTH)}
        {autoGrower(FLEX_IDS.basisAutoShort, FLEX_SHORT_CONTENT)}
        {autoGrower(FLEX_IDS.basisAutoLong, FLEX_LONG_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.overRow, FLEX_ROW_WIDTH)}>
        {fixed(FLEX_IDS.overFixed, FLEX_FIXED_WIDTH)}
        {grower(FLEX_IDS.overShort, FLEX_SHORT_CONTENT)}
        {grower(FLEX_IDS.overItem, FLEX_OVER_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.shrinkRow, FLEX_NARROW_WIDTH)}>
        {fixed(FLEX_IDS.shrinkFixed, FLEX_FIXED_WIDTH)}
        <div
          testId={FLEX_IDS.shrinkItem}
          style={{ width: FLEX_ASKED_WIDTH, height: 20 }}
        />
      </div>
      <div {...row(FLEX_IDS.noShrinkRow, FLEX_NARROW_WIDTH)}>
        <div
          testId={FLEX_IDS.noShrinkItem}
          style={{
            width: FLEX_ASKED_WIDTH,
            height: 20,
            flexShrink: 0,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
      <div {...row(FLEX_IDS.floorRow, FLEX_FLOOR_ROW_WIDTH)}>
        <div testId={FLEX_IDS.floorItem}>
          <div
            testId={FLEX_IDS.floorContent}
            style={{ width: FLEX_FLOOR_CONTENT, height: 20 }}
          />
        </div>
      </div>
      <div {...row(FLEX_IDS.liftedRow, FLEX_FLOOR_ROW_WIDTH)}>
        <div testId={FLEX_IDS.liftedItem} style={{ minWidth: 0 }}>
          <div
            testId={FLEX_IDS.liftedContent}
            style={{ width: FLEX_FLOOR_CONTENT, height: 20 }}
          />
        </div>
      </div>
      <div {...row(FLEX_IDS.maxRow, FLEX_ROW_WIDTH)}>
        {fixed(FLEX_IDS.maxFixed, FLEX_FIXED_WIDTH)}
        <div
          testId={FLEX_IDS.maxGrow}
          style={{
            flexGrow: 1,
            flexBasis: 0,
            maxWidth: FLEX_MAX_WIDTH,
            height: 20,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
      <div
        testId={FLEX_IDS.alignColumn}
        style={{
          width: FLEX_ALIGN_COLUMN_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {(
          [
            [FLEX_IDS.alignStart, "start"],
            [FLEX_IDS.alignCenter, "center"],
            [FLEX_IDS.alignEnd, "end"],
            [FLEX_IDS.alignStretch, "stretch"],
          ] as const
        ).map(([id, alignSelf]) => (
          <div key={id} testId={id} style={{ alignSelf }}>
            {content(FLEX_ALIGN_CONTENT)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const layoutFlexSizingScenario: ScenarioBody = {
  view: () => <FlexSizingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boxOf = (id: string) =>
        Effect.gen(function* () {
          return yield* ctx.expectSome(
            `${id} reports its painted box`,
            Option.fromNullishOr(ctx.host.bounds(id)),
          );
        });

      yield* Effect.forEach(
        FLEX_WIDTH_CASES,
        (expectation) =>
          Effect.gen(function* () {
            const painted = yield* boxOf(expectation.id);
            yield* ctx.expectNear(
              `${expectation.id} paints the width its rule expects`,
              painted.width,
              expectation.width,
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );

      const column = yield* boxOf(FLEX_IDS.alignColumn);
      yield* Effect.forEach(
        FLEX_ALIGN_CASES,
        (expectation) =>
          Effect.gen(function* () {
            const painted = yield* boxOf(expectation.id);
            yield* ctx.expectNear(
              `${expectation.id} sits where its alignSelf places it`,
              painted.x - column.x,
              expectation.x,
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );

      // `flex-1` is the one declaration the whole library composes with: while
      // both contents fit inside a share, a basis of zero splits the leftover
      // evenly, which is what makes two columns of unequal text equal.
      const short = yield* boxOf(FLEX_IDS.basisZeroShort);
      const fit = yield* boxOf(FLEX_IDS.basisZeroFit);
      yield* ctx.expectNear(
        "two basis-zero growers paint one width while their content fits",
        short.width,
        fit.width,
        1,
      );

      // ...and a grower whose content is wider than its share keeps its
      // content, which is why a truncating column declares `minWidth: 0`.
      const over = yield* boxOf(FLEX_IDS.overItem);
      yield* ctx.expectNear(
        "a basis-zero grower keeps the content its share cannot hold",
        over.width,
        FLEX_OVER_CONTENT,
        1,
      );

      // An item that may not shrink keeps its width and paints past its row.
      const noShrinkRow = yield* boxOf(FLEX_IDS.noShrinkRow);
      const noShrinkItem = yield* boxOf(FLEX_IDS.noShrinkItem);
      yield* ctx.expectEqual(
        "a non-shrinking item paints past its row's right edge",
        noShrinkItem.x + noShrinkItem.width > noShrinkRow.x + noShrinkRow.width,
        true,
      );
    }),
};
