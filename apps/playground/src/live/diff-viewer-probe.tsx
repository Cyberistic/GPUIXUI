/**
 * The `diff-viewer-lifecycle` probe: the **shipped** `DiffViewer` painted in a
 * real window.
 *
 * The editor package's page makes three claims about paint and layout that the
 * offscreen renderer cannot hold: an added line tints the `success` soft role
 * and a removed line the `destructive` one; a split diff puts one change on one
 * row between two equal columns, with a side that ran out painted blank; and a
 * line that outgrows its column stays one line tall while its column scrolls.
 * The headless `editor-surface` scenario measured the raw `<diff>` host a patch
 * string goes into; nothing had painted the wrapper a consumer imports.
 *
 * The probe mounts four viewers, each bounded to the caller's width on a card
 * page:
 *
 * 1. **Unified** — the row count, each row's height and its own text (marker,
 *    both gutters, line), and the tint each kind paints, counted inside its own
 *    box.
 * 2. **Split** — equal side columns with a divider; the removed and added
 *    halves of a replacement share a baseline, an appended line paints a blank
 *    left cell, and each side keeps its own tint.
 * 3. **The long line** — a 160-character addition in a 420-point surface stays
 *    one line tall and its column keeps the caller's width.
 * 4. **Nothing changed** — one context row, no tint of either kind.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { DiffViewer } from "@gpuixui/editor";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { countPaint } from "./box-paint.js";
import {
  DIFF_AFTER,
  DIFF_BEFORE,
  DIFF_DESTRUCTIVE,
  DIFF_IDS,
  DIFF_LINE_HEIGHT,
  DIFF_LONG,
  DIFF_PAGE,
  DIFF_SAME,
  DIFF_SAME_ROWS,
  DIFF_SPLIT_ROWS,
  DIFF_SPLIT_SIDE_WIDTH,
  DIFF_SUCCESS,
  DIFF_SURFACE,
  DIFF_UNIFIED_ROWS,
  DIFF_WIDTH,
  diffRowId,
  diffSideId,
  longRowText,
  splitSideText,
  unifiedRowText,
} from "./diff-viewer.js";
import { captureScale } from "./frame.js";

/** The captures a reader can look at, one per painted state. */
const UNIFIED = "diff-unified";
const SPLIT = "diff-split";
const LONG = "diff-long";
const SAME = "diff-same";

/** Long enough for the first layout pass to reach the frame. */
const SETTLE = Duration.millis(140);

/** One viewer, with the caption that says what it is. */
const Section = ({
  caption,
  children,
}: {
  readonly caption: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {caption}
      </text>
      {children}
    </div>
  );
};

/**
 * The page: the four viewers the probe reads.
 *
 * Every viewer is handed the caller's width, which is the contract a diff
 * surface in a pane has: the surface takes the room its pane gives it rather
 * than growing to its longest line.
 */
const DiffViewerPage = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="diff-page"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: DIFF_PAGE,
      }}
    >
      <Section caption="Unified: one change replaced and one appended, numbered.">
        <DiffViewer
          testId={DIFF_IDS.unified}
          before={DIFF_BEFORE}
          after={DIFF_AFTER}
          style={{ width: DIFF_WIDTH }}
        />
      </Section>
      <Section caption="Split: one change per row over two equal columns.">
        <DiffViewer
          testId={DIFF_IDS.split}
          before={DIFF_BEFORE}
          after={DIFF_AFTER}
          mode="split"
          style={{ width: DIFF_WIDTH }}
        />
      </Section>
      <Section caption="An added line of 176 characters (160 x's) in a 420-point surface.">
        <DiffViewer
          testId={DIFF_IDS.long}
          before=""
          after={DIFF_LONG}
          lineNumbers={false}
          style={{ width: DIFF_WIDTH }}
        />
      </Section>
      <Section caption="Nothing changed: one context row.">
        <DiffViewer
          testId={DIFF_IDS.same}
          before={DIFF_SAME}
          after={DIFF_SAME}
          style={{ width: DIFF_WIDTH }}
        />
      </Section>
    </div>
  );
};

/** The probe's window: one page, laid out at the window's own size. */
export const DiffViewerProbe = (): ReactNode => {
  const window = useWindowSize();
  const theme = useTheme();
  return (
    <div
      style={{
        width: window.width,
        height: window.height,
        backgroundColor: theme.colors.background,
      }}
    >
      <DiffViewerPage />
    </div>
  );
};

/** One painted box, with a failure that names the locator. */
const boxOf = (ctx: Smoke.AsyncSmokeContext, testId: string) =>
  Effect.flatMap(ctx.host.bounds(testId), (bounds) =>
    ctx.expectSome(`the ${testId} paints a box`, Option.fromNullishOr(bounds)),
  );

/** The boxes of every row a viewer painted, by index. */
const rowsOf = (ctx: Smoke.AsyncSmokeContext, viewer: string, count: number) =>
  Effect.forEach(
    Arr.range(0, count - 1),
    (index) =>
      Effect.map(boxOf(ctx, diffRowId(viewer, index)), (box) => ({
        index,
        box,
      })),
    { concurrency: 1 },
  );

/** The boxes of both sides of every split pair, in row order. */
const splitRowsOf = (ctx: Smoke.AsyncSmokeContext, count: number) =>
  Effect.forEach(
    Arr.range(0, count - 1),
    (index) =>
      Effect.gen(function* () {
        const before = yield* boxOf(
          ctx,
          diffSideId(DIFF_IDS.split, index, "before"),
        );
        const after = yield* boxOf(
          ctx,
          diffSideId(DIFF_IDS.split, index, "after"),
        );
        return { index, before, after };
      }),
    { concurrency: 1 },
  );

/** Captures the window and decodes it. */
const frameOf = (ctx: Smoke.AsyncSmokeContext, name: string) =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    return yield* ctx.host.pixels(name);
  });

/** The capture's device scale, which the boxes are counted in. */
const scaleOf = (ctx: Smoke.AsyncSmokeContext, frame: Pixels.Pixels) =>
  Effect.gen(function* () {
    const size = yield* ctx.host.windowSize();
    return yield* ctx.expectSome(
      "the capture is the window at one whole scale",
      captureScale(frame, size),
    );
  });

/** How many pixels of `hex` paint inside `box`. */
const countIn = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  scale: number,
  hex: string,
) =>
  ctx.expectSome(
    `the capture holds the ${hex} inside its own box`,
    countPaint(frame, box, scale, hex),
  );

/** How many device pixels a box covers. */
const areaOf = (box: Smoke.Bounds, scale: number): number =>
  Math.round(box.width * box.height * scale * scale);

export const diffViewerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(
      diffRowId(DIFF_IDS.unified, DIFF_UNIFIED_ROWS.length - 1),
    );
    yield* ctx.host.waitFor(
      diffSideId(DIFF_IDS.split, DIFF_SPLIT_ROWS.length - 1, "after"),
    );
    yield* ctx.host.waitFor(diffRowId(DIFF_IDS.long, 0));
    yield* ctx.host.waitFor(diffRowId(DIFF_IDS.same, 0));
    // The runner waits for a mount marker; the first layout pass that carries
    // the rows' heights lands after it.
    yield* Effect.sleep(SETTLE);

    const unifiedRoot = yield* boxOf(ctx, DIFF_IDS.unified);
    yield* ctx.expectNear(
      "the surface takes the width its caller bounded it to",
      unifiedRoot.width,
      DIFF_WIDTH,
      1,
    );

    // ---- unified: the rows ----
    const unifiedRows = yield* rowsOf(
      ctx,
      DIFF_IDS.unified,
      DIFF_UNIFIED_ROWS.length,
    );
    yield* ctx.expectEqual(
      "the unified viewer paints one row per displayed line",
      Arr.length(unifiedRows),
      DIFF_UNIFIED_ROWS.length,
    );
    yield* Effect.forEach(
      unifiedRows,
      ({ index, box }) =>
        Effect.gen(function* () {
          const row = Arr.getUnsafe(DIFF_UNIFIED_ROWS, index);
          yield* ctx.expectNear(
            `the unified row ${index} paints one code line tall`,
            box.height,
            DIFF_LINE_HEIGHT,
            1,
          );
          yield* ctx.expectEqual(
            `the unified row ${index} keeps the surface's inner width`,
            Math.round(box.width),
            Math.round(unifiedRoot.width) - 2,
          );
          yield* ctx.expectEqual(
            `the unified row ${index} paints its marker, gutters and line`,
            yield* ctx.host.text(diffRowId(DIFF_IDS.unified, index)),
            unifiedRowText(row),
          );
        }),
      { concurrency: 1, discard: true },
    );
    const pastUnified = yield* ctx.host.bounds(
      diffRowId(DIFF_IDS.unified, DIFF_UNIFIED_ROWS.length),
    );
    yield* ctx.expectEqual(
      "the unified viewer paints no row past its last line",
      Option.isNone(Option.fromNullishOr(pastUnified)),
      true,
    );

    // ---- unified: the tints ----
    const unifiedFrame = yield* frameOf(ctx, UNIFIED);
    const scale = yield* scaleOf(ctx, unifiedFrame);
    const removed = Arr.getUnsafe(unifiedRows, 1);
    const added = Arr.getUnsafe(unifiedRows, 2);
    const context = Arr.getUnsafe(unifiedRows, 3);
    yield* ctx.expectNear(
      "a removed line fills its row with the destructive soft role",
      yield* countIn(ctx, unifiedFrame, removed.box, scale, DIFF_DESTRUCTIVE),
      areaOf(removed.box, scale),
      Math.round(areaOf(removed.box, scale) * 0.35),
    );
    yield* ctx.expectNear(
      "an added line fills its row with the success soft role",
      yield* countIn(ctx, unifiedFrame, added.box, scale, DIFF_SUCCESS),
      areaOf(added.box, scale),
      Math.round(areaOf(added.box, scale) * 0.35),
    );
    yield* ctx.expectEqual(
      "a removed line paints none of the added role",
      yield* countIn(ctx, unifiedFrame, removed.box, scale, DIFF_SUCCESS),
      0,
    );
    yield* ctx.expectEqual(
      "an added line paints none of the removed role",
      yield* countIn(ctx, unifiedFrame, added.box, scale, DIFF_DESTRUCTIVE),
      0,
    );
    yield* ctx.expectEqual(
      "a context line paints no success tint",
      yield* countIn(ctx, unifiedFrame, context.box, scale, DIFF_SUCCESS),
      0,
    );
    yield* ctx.expectEqual(
      "a context line paints no destructive tint",
      yield* countIn(ctx, unifiedFrame, context.box, scale, DIFF_DESTRUCTIVE),
      0,
    );
    yield* ctx.expectNear(
      "a context line paints the diff's own surface",
      yield* countIn(ctx, unifiedFrame, context.box, scale, DIFF_SURFACE),
      areaOf(context.box, scale),
      Math.round(areaOf(context.box, scale) * 0.35),
    );

    // ---- split: equal columns, one change per row ----
    const splitRoot = yield* boxOf(ctx, DIFF_IDS.split);
    yield* ctx.expectNear(
      "the split surface takes its caller's width too",
      splitRoot.width,
      DIFF_WIDTH,
      1,
    );
    const beforeColumn = yield* boxOf(ctx, `${DIFF_IDS.split}-before`);
    const afterColumn = yield* boxOf(ctx, `${DIFF_IDS.split}-after`);
    const divider = yield* boxOf(ctx, `${DIFF_IDS.split}-divider`);
    yield* ctx.expectNear(
      "the left column takes half the surface",
      beforeColumn.width,
      DIFF_SPLIT_SIDE_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the right column takes the same half",
      afterColumn.width,
      DIFF_SPLIT_SIDE_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the divider is one point wide",
      divider.width,
      1,
      0.5,
    );
    yield* ctx.expectNear(
      "the divider sits between the columns",
      divider.x,
      beforeColumn.x + beforeColumn.width,
      1,
    );

    const splitRows = yield* splitRowsOf(ctx, DIFF_SPLIT_ROWS.length);
    yield* ctx.expectEqual(
      "the split viewer paints one row per change, not per side",
      Arr.length(splitRows),
      DIFF_SPLIT_ROWS.length,
    );
    yield* Effect.forEach(
      splitRows,
      ({ index, before, after }) =>
        Effect.gen(function* () {
          const pair = Arr.getUnsafe(DIFF_SPLIT_ROWS, index);
          yield* ctx.expectNear(
            `the split row ${index} paints one code line tall on the left`,
            before.height,
            DIFF_LINE_HEIGHT,
            1,
          );
          yield* ctx.expectNear(
            `the split row ${index} paints one code line tall on the right`,
            after.height,
            DIFF_LINE_HEIGHT,
            1,
          );
          yield* ctx.expectNear(
            `the split row ${index} keeps both sides on one baseline`,
            before.y,
            after.y,
            1,
          );
          yield* ctx.expectEqual(
            `the split row ${index} paints the before line in its own column`,
            yield* ctx.host.text(diffSideId(DIFF_IDS.split, index, "before")),
            splitSideText(pair.left, true),
          );
          yield* ctx.expectEqual(
            `the split row ${index} paints the after line in its own column`,
            yield* ctx.host.text(diffSideId(DIFF_IDS.split, index, "after")),
            splitSideText(pair.right, true),
          );
        }),
      { concurrency: 1, discard: true },
    );

    const splitFrame = yield* frameOf(ctx, SPLIT);
    const changed = Arr.getUnsafe(splitRows, 1);
    yield* ctx.expectEqual(
      "the removed side of a split row paints its tint",
      (yield* countIn(
        ctx,
        splitFrame,
        changed.before,
        scale,
        DIFF_DESTRUCTIVE,
      )) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the added side paints its tint on its own side of the divider",
      (yield* countIn(ctx, splitFrame, changed.after, scale, DIFF_SUCCESS)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the left column paints none of the added role",
      yield* countIn(ctx, splitFrame, changed.before, scale, DIFF_SUCCESS),
      0,
    );
    yield* ctx.expectEqual(
      "the right column paints none of the removed role",
      yield* countIn(ctx, splitFrame, changed.after, scale, DIFF_DESTRUCTIVE),
      0,
    );

    const appended = Arr.getUnsafe(splitRows, 3);
    yield* ctx.expectEqual(
      "a blank split cell paints no destructive tint",
      yield* countIn(ctx, splitFrame, appended.before, scale, DIFF_DESTRUCTIVE),
      0,
    );
    yield* ctx.expectEqual(
      "a blank split cell paints no success tint",
      yield* countIn(ctx, splitFrame, appended.before, scale, DIFF_SUCCESS),
      0,
    );
    yield* ctx.expectNear(
      "a blank split cell paints the diff's own surface",
      yield* countIn(ctx, splitFrame, appended.before, scale, DIFF_SURFACE),
      areaOf(appended.before, scale),
      Math.round(areaOf(appended.before, scale) * 0.35),
    );
    yield* ctx.expectEqual(
      "the appended line paints its own tint beside the blank cell",
      (yield* countIn(ctx, splitFrame, appended.after, scale, DIFF_SUCCESS)) >
        0,
      true,
    );

    const contextRow = Arr.getUnsafe(splitRows, 0);
    yield* ctx.expectEqual(
      "a split context row paints no success tint either side",
      (yield* countIn(
        ctx,
        splitFrame,
        contextRow.before,
        scale,
        DIFF_SUCCESS,
      )) +
        (yield* countIn(
          ctx,
          splitFrame,
          contextRow.after,
          scale,
          DIFF_SUCCESS,
        )),
      0,
    );
    yield* ctx.expectEqual(
      "a split context row paints no destructive tint either side",
      (yield* countIn(
        ctx,
        splitFrame,
        contextRow.before,
        scale,
        DIFF_DESTRUCTIVE,
      )) +
        (yield* countIn(
          ctx,
          splitFrame,
          contextRow.after,
          scale,
          DIFF_DESTRUCTIVE,
        )),
      0,
    );

    // ---- a long line stays one row, inside the caller's bound ----
    const longRoot = yield* boxOf(ctx, DIFF_IDS.long);
    yield* ctx.expectNear(
      "the long-line surface keeps the width its caller bounded",
      longRoot.width,
      DIFF_WIDTH,
      1,
    );
    const longRow = yield* boxOf(ctx, diffRowId(DIFF_IDS.long, 0));
    yield* ctx.expectNear(
      "a line longer than its column still paints exactly one row tall",
      longRow.height,
      DIFF_LINE_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the long row keeps the surface's width and scrolls its line",
      Math.round(longRow.width),
      Math.round(longRoot.width) - 2,
    );
    yield* ctx.expectEqual(
      "an unnumbered row paints its marker and line with no gutter",
      yield* ctx.host.text(diffRowId(DIFF_IDS.long, 0)),
      longRowText(),
    );
    const painted = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the long line is painted whole, only scrolled by its column",
      Arr.some(painted, (line) => line.includes(DIFF_LONG)),
      true,
    );
    const longFrame = yield* frameOf(ctx, LONG);
    yield* ctx.expectEqual(
      "the long added line still paints the success role",
      (yield* countIn(ctx, longFrame, longRow, scale, DIFF_SUCCESS)) > 0,
      true,
    );

    // ---- nothing changed ----
    const sameRow = yield* boxOf(ctx, diffRowId(DIFF_IDS.same, 0));
    yield* ctx.expectNear(
      "an unchanged diff's row paints one code line tall",
      sameRow.height,
      DIFF_LINE_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the unchanged viewer paints the second row nowhere",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(diffRowId(DIFF_IDS.same, 1)),
        ),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the unchanged viewer paints its one context row's text",
      yield* ctx.host.text(diffRowId(DIFF_IDS.same, 0)),
      unifiedRowText(Arr.getUnsafe(DIFF_SAME_ROWS, 0)),
    );
    const sameFrame = yield* frameOf(ctx, SAME);
    yield* ctx.expectEqual(
      "an unchanged diff paints no success tint",
      yield* countIn(ctx, sameFrame, sameRow, scale, DIFF_SUCCESS),
      0,
    );
    yield* ctx.expectEqual(
      "an unchanged diff paints no destructive tint",
      yield* countIn(ctx, sameFrame, sameRow, scale, DIFF_DESTRUCTIVE),
      0,
    );
  });
