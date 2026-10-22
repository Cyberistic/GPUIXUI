/**
 * `data-grid-frozen-column` — a frozen first column beside a scrolling grid.
 *
 * The measured grid rule so far is that the runtime has **no sticky**: a header
 * is a sibling above the row scroller (`data-grid-fixed-header`). A frozen
 * column has the same shape on the other axis — its own vertical scroller beside
 * the grid's — and the two must move as one, or a row's label sits against the
 * wrong row. That is app-side synchronisation over two measured runtime facts:
 * `onScrollChange` carries the clamped absolute pair, and `scrollTo` paints
 * synchronously.
 *
 * Measured on 0.11.0: both panes start aligned and at `0`; a wheel over the grid
 * moves both to `-300`, and a wheel over the frozen column moves both on to
 * `-600` (the mirror is two-way, guarded by a ref so the programmatic scroll
 * cannot loop); the row a reader is looking at sits at the same `y` in both
 * panes; a horizontal wheel pans the grid's cells but leaves the frozen column
 * where it is; a press on a frozen cell selects the row for the whole grid; and
 * a huge vertical wheel clamps both panes at the same `-1440`.
 *
 * The wheel's `deltaY` is negative to scroll down (see `scroll.tsx`).
 */
import { useRef, useState } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

/** Rows in the grid. */
const ROWS = 60;
/** One row's height, shared by both panes. */
const ROW_HEIGHT = 28;
/** The frozen column's width, and the grid viewport's. */
const FROZEN_WIDTH = 120;
const BODY_WIDTH = 240;
/** The viewport height both panes share. */
const VIEWPORT = 240;
/** `contentHeight - viewport`, the offset both panes clamp at. */
const MAX_OFFSET = ROWS * ROW_HEIGHT - VIEWPORT;

const FrozenColumnProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const [selected, setSelected] = useState(-1);

  const mirror =
    (target: "frozen" | "body") =>
    (event: EventPayload): void => {
      const elementId = (target === "frozen" ? frozen : body).current?.id;
      const y = event.scrollY;
      // The programmatic scroll paints synchronously, so the target's own
      // change arrives inside this call; the flag stops it mirroring back.
      if (elementId == null || y == null || syncing.current) return;
      syncing.current = true;
      renderer?.scrollTo?.(elementId, 0, y);
      syncing.current = false;
    };

  const rows = Array.from({ length: ROWS }, (_, index) => index);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: FROZEN_WIDTH + BODY_WIDTH,
        height: 340,
      }}
    >
      <div style={{ display: "flex", height: VIEWPORT }}>
        <div
          testId="frozen"
          ref={frozen}
          onScrollChange={mirror("body")}
          style={{
            width: FROZEN_WIDTH,
            height: VIEWPORT,
            overflowY: "scroll",
            backgroundColor: theme.colors.muted,
          }}
        >
          {rows.map((index) => (
            <div
              key={index}
              testId={`frozen-row-${index}`}
              onClick={() => setSelected(index)}
              style={{
                display: "flex",
                height: ROW_HEIGHT,
                alignItems: "center",
                backgroundColor:
                  selected === index ? theme.colors.accent : theme.colors.muted,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`F${index}`}
              </text>
            </div>
          ))}
        </div>
        <div
          testId="grid-body"
          ref={body}
          onScrollChange={mirror("frozen")}
          style={{
            width: BODY_WIDTH,
            height: VIEWPORT,
            overflowY: "scroll",
            overflowX: "scroll",
          }}
        >
          {rows.map((index) => (
            <div
              key={index}
              testId={`body-row-${index}`}
              style={{
                display: "flex",
                width: 600,
                height: ROW_HEIGHT,
                alignItems: "center",
              }}
            >
              <div style={{ width: 200 }}>
                <text
                  style={{ color: theme.colors.foreground }}
                >{`B${index}`}</text>
              </div>
              <div style={{ width: 200 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`C${index}`}
                </text>
              </div>
              <div style={{ width: 200 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`D${index}`}
                </text>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Readout testId="frozen-selected">
        {selected < 0 ? "none" : `r${selected}`}
      </Readout>
    </div>
  );
};

/** The rows the grid paints, as the `B N` labels become `N`s. */
const paintedRows = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  Arr.filterMap(lines, (line) =>
    pipe(
      Str.match(/^B(\d+)$/)(line),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.match({
        onNone: () => Result.failVoid,
        onSome: (value) => Result.succeed(Number.parseInt(value, 10)),
      }),
    ),
  );

export const dataGridFrozenColumnScenario: ScenarioBody = {
  view: () => <FrozenColumnProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boundsOf = (testId: string) =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const yOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.y),
          () => -1,
        );
      const xOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.x),
          () => -1,
        );
      const offsetOf = (
        testId: string,
      ): Effect.Effect<Smoke.Offset, Smoke.SmokeAssertionError> =>
        ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(ctx.host.scrollOffset(testId)),
        );

      // 1. Both panes start aligned at the top.
      const frozenStart = yield* offsetOf("frozen");
      const bodyStart = yield* offsetOf("grid-body");
      yield* ctx.expectEqual(
        "the frozen pane starts at the top",
        frozenStart.y,
        0,
      );
      yield* ctx.expectEqual("the grid starts at the top", bodyStart.y, 0);
      yield* ctx.expectNear(
        "the first row sits at the same y in both panes",
        yOf("frozen-row-0"),
        yOf("body-row-0"),
        1,
      );

      // 2. A wheel over the grid moves both panes.
      ctx.host.wheel("grid-body", 0, -300);
      ctx.host.advance(50);
      const frozenAfterGrid = yield* offsetOf("frozen");
      const bodyAfterGrid = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the grid follows the wheel",
        bodyAfterGrid.y,
        -300,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column follows the grid",
        frozenAfterGrid.y,
        bodyAfterGrid.y,
        1,
      );

      // 3. A wheel over the frozen column moves both panes back.
      ctx.host.wheel("frozen", 0, -300);
      ctx.host.advance(50);
      const frozenAfterBoth = yield* offsetOf("frozen");
      const bodyAfterBoth = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the frozen column's own wheel scrolls it",
        frozenAfterBoth.y,
        -600,
        2,
      );
      yield* ctx.expectNear(
        "the grid mirrors the frozen column",
        bodyAfterBoth.y,
        frozenAfterBoth.y,
        1,
      );

      // 4. The row the reader is looking at lines up across the panes.
      const bodyRows = paintedRows(ctx.host.paintedText());
      yield* ctx.expectEqual(
        "the grid paints rows past the frozen column",
        Arr.some(bodyRows, (row) => row > 20),
        true,
      );
      const row = yield* ctx.expectSome(
        "a row inside the scrolled window exists",
        Arr.findFirst(bodyRows, (value) => value >= 22 && value <= 25),
      );
      yield* ctx.expectNear(
        `row ${row} lines up between the frozen column and the grid`,
        yOf(`frozen-row-${row}`),
        yOf(`body-row-${row}`),
        1,
      );

      // 5. A horizontal wheel moves the cells, not the frozen column.
      const frozenX = xOf(`frozen-row-${row}`);
      const bodyX = xOf(`body-row-${row}`);
      ctx.host.wheel("grid-body", -200, 0);
      ctx.host.advance(50);
      const bodyPan = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "a horizontal wheel pans the grid",
        bodyPan.x,
        -200,
        2,
      );
      yield* ctx.expectNear(
        "the grid's row moved left with the pan",
        xOf(`body-row-${row}`),
        bodyX - 200,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column stayed where it was",
        xOf(`frozen-row-${row}`),
        frozenX,
        1,
      );

      // 6. A frozen cell selects the row for the whole grid.
      ctx.host.click(`frozen-row-${row}`);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a press on a frozen cell selects its row",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("frozen-selected")),
          () => "",
        ),
        `r${row}`,
      );

      // 7. A huge wheel clamps both panes at the same end.
      ctx.host.wheel("grid-body", 0, -10_000);
      ctx.host.advance(50);
      const frozenEnd = yield* offsetOf("frozen");
      const bodyEnd = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the grid clamps at the content's end",
        bodyEnd.y,
        -MAX_OFFSET,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column clamps with it",
        frozenEnd.y,
        bodyEnd.y,
        1,
      );
    }),
};
