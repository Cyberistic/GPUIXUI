/**
 * Tier 3 probe: `data-grid-fixed-header` — a grid whose header stays put.
 *
 * The docking-style question for a data grid is where the header lives. GPUI's
 * style model has `position: "relative" | "absolute"`, not `sticky`, so a header
 * declared sticky **inside** the row scroller scrolls away with the rows; this
 * probe measures that and then measures the pattern a grid can use instead: the
 * header is a sibling above the vertical scroller, and one horizontal scroller
 * wraps both, so a horizontal wheel moves the header and the cells together.
 *
 * Those are the two axes a data grid needs, and neither is the runtime's:
 * - vertical scrolling moves the rows and not the header (a sibling, not sticky);
 * - horizontal scrolling moves the header cells and the row cells by the same
 *   amount (one shared scroller, not two synchronised ones).
 *
 * The `sticky` sample is asserted to move, so the day the runtime paints a
 * sticky header this scenario fails and the alternative stops being necessary.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const COLUMNS = ["name", "status", "owner", "updated"] as const;
const COLUMN_WIDTH = 220;
const ROWS = 20;

const Row = ({ index }: { readonly index: number }) => {
  const theme = useTheme();
  return (
    <div
      testId={`grid-row-${index}`}
      style={{
        height: 24,
        display: "flex",
        flexDirection: "row",
        backgroundColor: index % 2 === 0 ? theme.colors.background : theme.colors.card,
      }}
    >
      {COLUMNS.map((column) => (
        <div key={column} style={{ width: COLUMN_WIDTH }}>
          <text testId={`grid-cell-${index}-${column}`} style={{ color: theme.colors.foreground }}>
            {`${column} ${index}`}
          </text>
        </div>
      ))}
    </div>
  );
};

const GridProbe = () => {
  const theme = useTheme();
  const [scrolls, setScrolls] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 640 }}>
      <Readout testId="grid-readout">{`scrolls=${scrolls}`}</Readout>
      <div
        testId="grid-frame"
        style={{ width: 620, height: 260, overflow: "hidden" }}
      >
        {/* One scroller for both axes of the header: the content is wider than
            the frame, so the header and the rows share its x offset. */}
        <div
          testId="grid-hscroll"
          style={{ width: 620, height: 260, overflowX: "scroll" }}
        >
          <div
            style={{
              width: COLUMN_WIDTH * COLUMNS.length,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              testId="grid-header"
              style={{
                height: 32,
                display: "flex",
                flexDirection: "row",
                backgroundColor: theme.colors.muted,
              }}
            >
              {COLUMNS.map((column) => (
                <div key={column} style={{ width: COLUMN_WIDTH }}>
                  <text
                    testId={`grid-header-${column}`}
                    style={{ color: theme.colors.mutedForeground }}
                  >
                    {column}
                  </text>
                </div>
              ))}
            </div>
            {/* The vertical scroller sits under the header, so the header is
                never its child and cannot scroll with the rows. */}
            <div
              testId="grid-body"
              style={{ height: 200, overflowY: "scroll" }}
              onScroll={() => setScrolls((count) => count + 1)}
            >
              <div
                testId="grid-sticky-sample"
                style={{
                  height: 24,
                  position: "sticky",
                  top: 0,
                  backgroundColor: theme.colors.accent,
                }}
              >
                <text style={{ color: theme.colors.accentForeground }}>
                  sticky sample
                </text>
              </div>
              {Array.from({ length: ROWS }, (_, index) => (
                <Row key={index} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The painted box of `testId`, or a failed check. */
const box = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `${testId} painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

const offset = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<Smoke.Offset, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `scroll offset of ${testId}`,
    Option.fromNullishOr(ctx.host.scrollOffset(testId)),
  );

export const dataGridScenario: ScenarioBody = {
  view: () => <GridProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const header = yield* box(ctx, "grid-header");
      const firstRow = yield* box(ctx, "grid-row-0");
      const sticky = yield* box(ctx, "grid-sticky-sample");

      yield* ctx.expectNear(
        "the rows start below the header",
        firstRow.y,
        header.y + header.height + 24,
        1,
      );

      // Vertical: the rows move, the header does not.
      ctx.host.wheel("grid-body", 0, -200);
      const scrolled = yield* offset(ctx, "grid-body");
      yield* ctx.expectEqual(
        "the wheel scrolls the rows",
        scrolled.y < 0,
        true,
      );
      const headerAfter = yield* box(ctx, "grid-header");
      yield* ctx.expectNear(
        "the header keeps its painted position while rows scroll",
        headerAfter.y,
        header.y,
        1,
      );
      const rowAfter = yield* box(ctx, "grid-row-0");
      yield* ctx.expectNear(
        "the first row moved up by the scroll amount",
        rowAfter.y - firstRow.y,
        scrolled.y,
        2,
      );
      const stickyAfter = yield* box(ctx, "grid-sticky-sample");
      yield* ctx.expectNear(
        "a `position: sticky` child scrolls with the rows (no sticky in the runtime)",
        stickyAfter.y - sticky.y,
        scrolled.y,
        2,
      );
      yield* ctx.expectContains(
        "onScroll reports the vertical scroll",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("grid-readout")),
          () => "",
        ),
        "scrolls=1",
      );

      // Horizontal: header cells and row cells share one offset.
      const headerCell = yield* box(ctx, "grid-header-status");
      const rowCell = yield* box(ctx, "grid-cell-3-status");
      yield* ctx.expectEqual(
        "a header cell and its column's cells start aligned",
        headerCell.x,
        rowCell.x,
      );
      ctx.host.wheel("grid-hscroll", -150, 0);
      const horizontal = yield* offset(ctx, "grid-hscroll");
      yield* ctx.expectEqual(
        "the wheel scrolls the grid sideways",
        horizontal.x < 0,
        true,
      );
      const headerCellAfter = yield* box(ctx, "grid-header-status");
      const rowCellAfter = yield* box(ctx, "grid-cell-3-status");
      yield* ctx.expectNear(
        "the header cell moved with the horizontal scroller",
        headerCellAfter.x - headerCell.x,
        horizontal.x,
        1,
      );
      yield* ctx.expectNear(
        "the row cell moved by the same amount",
        rowCellAfter.x - rowCell.x,
        horizontal.x,
        1,
      );
      yield* ctx.expectEqual(
        "the columns stay aligned after the horizontal scroll",
        headerCellAfter.x,
        rowCellAfter.x,
      );
      const headerAfterHorizontal = yield* box(ctx, "grid-header");
      yield* ctx.expectNear(
        "horizontal scrolling does not move the header vertically",
        headerAfterHorizontal.y,
        header.y,
        1,
      );
    }),
};
