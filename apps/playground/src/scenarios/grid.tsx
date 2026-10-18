/**
 * `grid-wide-table` — the pinned chrome and column windowing a data grid needs.
 *
 * The earlier table probes are vertical only and paint every column. A real
 * grid also needs a header that stays while the body scrolls, a frozen first
 * column, and a wide body where only the visible columns exist in the element
 * tree. The obvious implementation is `position: "sticky"`.
 *
 * Measured: sticky is **ignored** by 0.10.0 (`style.rs` maps only
 * `absolute`/`fixed`/`relative`), so the header and the pinned column are
 * derived from the body's single scroll offset (`renderer.getScrollOffset`) and
 * windowed in component code (`grid-window.ts`). The probe is therefore the
 * measured contract a `packages/data-grid` implements, not a mock.
 *
 * Measured facts: plan `185` §8. The live twin (`live-grid`, plan `556`) repeats
 * the wheel, pan, windowing and keyboard-reveal path in a real window. Colour
 * and the accessibility dump stay here: the live tree has no `style` and the
 * live renderer has no a11y method (plan `197`).
 */
import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { revealOffset, visibleWindow } from "./grid-window.js";

const PINNED_WIDTH = 150;
const COLUMN_WIDTH = 90;
const COLUMN_COUNT = 24;
const BODY_WIDTH = 460;
const BODY_HEIGHT = 300;
const ROW_HEIGHT = 28;
const ROW_COUNT = 40;
const HEADER_HEIGHT = 28;
const CONTENT_WIDTH = COLUMN_WIDTH * COLUMN_COUNT;
const CONTENT_HEIGHT = ROW_HEIGHT * ROW_COUNT;
const STICKY_ROWS = 30;

type Registry = Record<string, PublicInstance | null>;

const cellKey = (row: number, column: number): string => `${row}-${column}`;

const clampIndex = (value: number, max: number): number =>
  Math.min(Math.max(value, 0), max);

/** Every index in `range`, or an empty list for the empty range. */
const indices = (range: {
  first: number;
  last: number;
}): ReadonlyArray<number> =>
  range.last < range.first ? [] : Arr.range(range.first, range.last);

const GridProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const body = useRef<PublicInstance | null>(null);
  const cells = useRef<Registry>({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState({ row: -1, column: -1 });

  const bodyId = (): Option.Option<number> =>
    Option.fromNullishOr(body.current?.id);

  /** Mirrors the runtime's scroll offset into the window model. */
  const sync = (): void => {
    Option.match(bodyId(), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getScrollOffset?.(id)), {
          onNone: () => {},
          onSome: (offset) =>
            Option.match(
              Option.all([
                Option.fromNullishOr(offset[0]),
                Option.fromNullishOr(offset[1]),
              ]),
              {
                onNone: () => {},
                onSome: ([x, y]) => setPan({ x, y }),
              },
            ),
        }),
    });
  };

  /** Component-owned scrolling: the body is the only scroll source. */
  const scrollBody = (x: number, y: number): void => {
    Option.match(bodyId(), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollTo?.(id, x, y),
    });
    sync();
  };

  const move = (key: string | undefined): void => {
    const next = {
      row: clampIndex(
        selected.row + (key === "down" ? 1 : key === "up" ? -1 : 0),
        ROW_COUNT - 1,
      ),
      column: clampIndex(
        selected.column + (key === "right" ? 1 : key === "left" ? -1 : 0),
        COLUMN_COUNT - 1,
      ),
    };
    if (next.row === selected.row && next.column === selected.column) return;
    scrollBody(
      revealOffset(pan.x, next.column, COLUMN_WIDTH, BODY_WIDTH, CONTENT_WIDTH),
      revealOffset(pan.y, next.row, ROW_HEIGHT, BODY_HEIGHT, CONTENT_HEIGHT),
    );
    setSelected(next);
  };

  /** Focus follows the selection, so the next key lands on the new cell. */
  useEffect(() => {
    if (selected.row < 0) return;
    Option.match(
      Option.fromNullishOr(
        cells.current[cellKey(selected.row, selected.column)]?.id,
      ),
      {
        onNone: () => {},
        onSome: (id) => renderer?.focusElement?.(id),
      },
    );
  }, [selected, renderer]);

  const rows = visibleWindow(pan.y, BODY_HEIGHT, ROW_HEIGHT, ROW_COUNT);
  const columns = visibleWindow(pan.x, BODY_WIDTH, COLUMN_WIDTH, COLUMN_COUNT);

  const cell = (row: number, column: number) => (
    <div
      key={column}
      ref={(instance) => {
        cells.current[cellKey(row, column)] = instance;
      }}
      testId={`grid-cell-${row}-${column}`}
      role="gridcell"
      aria-selected={selected.row === row && selected.column === column}
      aria-label={`row ${row} col ${column}`}
      aria-id={`grid-cell-${row}-${column}`}
      tabIndex={selected.row === row && selected.column === column ? 0 : -1}
      onClick={() => setSelected({ row, column })}
      onKeyDown={(event) => move(event.key)}
      style={{
        position: "absolute",
        left: column * COLUMN_WIDTH,
        top: 0,
        width: COLUMN_WIDTH,
        height: ROW_HEIGHT,
        justifyContent: "center",
        paddingLeft: theme.spacing.sm,
        backgroundColor:
          selected.row === row && selected.column === column
            ? theme.colors.accent
            : theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <text style={{ fontSize: 11, color: theme.colors.foreground }}>
        {`r${row} c${column}`}
      </text>
    </div>
  );

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 680 }}
    >
      <div
        testId="grid-root"
        style={{ display: "flex", height: HEADER_HEIGHT + BODY_HEIGHT }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: PINNED_WIDTH,
          }}
        >
          <div
            testId="grid-pinned-header"
            style={{
              height: HEADER_HEIGHT,
              justifyContent: "center",
              paddingLeft: theme.spacing.sm,
              backgroundColor: theme.colors.muted,
            }}
          >
            <text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
              Name
            </text>
          </div>
          <div
            testId="grid-pinned-viewport"
            style={{
              position: "relative",
              width: PINNED_WIDTH,
              height: BODY_HEIGHT,
              overflowX: "hidden",
              overflowY: "hidden",
            }}
          >
            {Arr.map(indices(rows), (row) => (
              <div
                key={row}
                testId={`grid-pinned-row-${row}`}
                style={{
                  position: "absolute",
                  left: 0,
                  top: row * ROW_HEIGHT + pan.y,
                  width: PINNED_WIDTH,
                  height: ROW_HEIGHT,
                  justifyContent: "center",
                  paddingLeft: theme.spacing.sm,
                  backgroundColor: theme.colors.card,
                  borderWidth: theme.borderWidth.thin,
                  borderColor: theme.colors.border,
                }}
              >
                <text style={{ fontSize: 11, color: theme.colors.foreground }}>
                  {`row ${row}`}
                </text>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: BODY_WIDTH,
          }}
        >
          <div
            testId="grid-header"
            style={{
              position: "relative",
              width: BODY_WIDTH,
              height: HEADER_HEIGHT,
              overflowX: "hidden",
              overflowY: "hidden",
              backgroundColor: theme.colors.muted,
            }}
          >
            {Arr.map(indices(columns), (column) => (
              <div
                key={column}
                testId={`grid-head-${column}`}
                style={{
                  position: "absolute",
                  left: column * COLUMN_WIDTH + pan.x,
                  top: 0,
                  width: COLUMN_WIDTH,
                  height: HEADER_HEIGHT,
                  justifyContent: "center",
                  paddingLeft: theme.spacing.sm,
                }}
              >
                <text
                  style={{ fontSize: 12, color: theme.colors.mutedForeground }}
                >
                  {`col ${column}`}
                </text>
              </div>
            ))}
          </div>
          <div
            ref={body}
            testId="grid-body"
            onScroll={sync}
            style={{
              width: BODY_WIDTH,
              height: BODY_HEIGHT,
              overflowX: "scroll",
              overflowY: "scroll",
              backgroundColor: theme.colors.background,
            }}
          >
            <div
              style={{
                position: "relative",
                width: CONTENT_WIDTH,
                height: CONTENT_HEIGHT,
              }}
            >
              {Arr.map(indices(rows), (row) => (
                <div
                  key={row}
                  testId={`grid-row-${row}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: row * ROW_HEIGHT,
                    width: CONTENT_WIDTH,
                    height: ROW_HEIGHT,
                  }}
                >
                  {Arr.map(indices(columns), (column) => cell(row, column))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Readout testId="grid-selection">
          {selected.row < 0
            ? "sel=none"
            : `sel=${selected.row},${selected.column}`}
        </Readout>
        <Readout testId="grid-pan">{`x=${pan.x} y=${pan.y}`}</Readout>
        <Pressable
          testId="grid-end"
          onClick={() => scrollBody(0 - (CONTENT_WIDTH - BODY_WIDTH), pan.y)}
        >
          <text>pan to end</text>
        </Pressable>
        <Pressable
          testId="grid-pan-four"
          onClick={() => scrollBody(-360, pan.y)}
        >
          <text>pan four columns</text>
        </Pressable>
        <Pressable
          testId="grid-pan-bottom"
          onClick={() => scrollBody(pan.x, BODY_HEIGHT - CONTENT_HEIGHT)}
        >
          <text>pan to bottom</text>
        </Pressable>
        <Pressable testId="grid-home" onClick={() => scrollBody(0, 0)}>
          <text>home</text>
        </Pressable>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Readout testId="sticky-note">
          position: sticky — measured, not assumed
        </Readout>
        <div
          testId="sticky-scroller"
          style={{ width: 220, height: 120, overflowY: "scroll" }}
        >
          <div
            testId="sticky-header"
            style={{
              position: "sticky",
              height: 24,
              backgroundColor: theme.colors.accent,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              sticky header
            </text>
          </div>
          {Arr.map(Arr.range(0, STICKY_ROWS - 1), (row) => (
            <div key={row} style={{ height: 24 }}>
              <text style={{ fontSize: 11, color: theme.colors.foreground }}>
                {`sticky row ${row}`}
              </text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const offsetOf = (ctx: Smoke.SmokeContext, axis: "x" | "y"): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset("grid-body")),
      (value) => value[axis],
    ),
    () => 0,
  );

/** `testId`'s text, or `none` so a missing readout fails a comparison. */
const textOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "none");

/** The focused test id, or `none` so a missing focus fails a comparison. */
const focusOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

const boundsOrFail = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const aligns = (
  ctx: Smoke.SmokeContext,
  label: string,
  left: Smoke.Bounds,
  right: Smoke.Bounds,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectNear(label, left.x, right.x, 1);

/** The accessibility node the scenario authored with `authorId`, if any. */
const ariaFor = (
  ctx: Smoke.SmokeContext,
  authorId: string,
): Option.Option<Smoke.A11yNode> =>
  Option.flatMap(Option.fromNullishOr(ctx.host.a11y()), (tree) =>
    Option.flatMap(
      Arr.findFirst(R.values(tree.nodes), (node) =>
        Option.match(node.aria, {
          onNone: () => false,
          onSome: (aria) =>
            Option.match(aria.author_id, {
              onNone: () => false,
              onSome: (id) => id === authorId,
            }),
        }),
      ),
      (node) => node.aria,
    ),
  );

export const gridScenario: PlaygroundScenario = {
  id: "grid-wide-table",
  title: "Grid: pinned chrome, one scroll source and column windowing",
  capability: "grid",
  view: () => <GridProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const root = yield* boundsOrFail(ctx, "grid-root", "the grid paints");
      const pinned = yield* boundsOrFail(
        ctx,
        "grid-pinned-header",
        "the pinned header paints",
      );
      const header = yield* boundsOrFail(
        ctx,
        "grid-header",
        "the column header paints",
      );
      // 0.10.0 reports the content origin, so the cell's 6 px padding shows here
      // (plan 529 §6.3: the published box is neither the border nor the content box).
      yield* ctx.expectNear(
        "the pinned column's content starts at the root",
        pinned.x,
        root.x + 6,
        1,
      );
      yield* ctx.expectNear(
        "the body starts after the pinned column",
        header.x,
        root.x + PINNED_WIDTH,
        1,
      );

      // `position: "sticky"` is ignored: the header is in flow and scrolls.
      const stickyBefore = yield* boundsOrFail(
        ctx,
        "sticky-header",
        "the sticky header paints",
      );
      ctx.host.wheel("sticky-scroller", 0, -80);
      const stickyAfter = yield* boundsOrFail(
        ctx,
        "sticky-header",
        "the sticky header still paints",
      );
      yield* ctx.expectNear(
        `position sticky is ignored, so the header scrolls with its content (dy=${stickyAfter.y - stickyBefore.y})`,
        stickyAfter.y,
        stickyBefore.y - 80,
        4,
      );

      const body = yield* boundsOrFail(ctx, "grid-body", "the body paints");
      const firstCell = yield* boundsOrFail(
        ctx,
        "grid-cell-0-0",
        "the first cell paints",
      );
      yield* ctx.expectNear(
        "the body starts at the top",
        offsetOf(ctx, "y"),
        0,
        1,
      );
      yield* ctx.expectNear(
        // 0.10.0 reports the content origin, 6 px inside the cell's padding
        // (plan 529 §6.3).
        "the first cell's content starts at the body origin",
        firstCell.x,
        body.x + 6,
        1,
      );

      // Vertical: one scroll source moves the body and the pinned column.
      ctx.host.wheel("grid-body", 0, -280);
      yield* ctx.expectNear(
        `the body scrolled ten rows (y=${offsetOf(ctx, "y")})`,
        offsetOf(ctx, "y"),
        -280,
        8,
      );
      const pinnedRow = yield* boundsOrFail(
        ctx,
        "grid-pinned-row-11",
        "the pinned row paints",
      );
      const bodyRow = yield* boundsOrFail(
        ctx,
        "grid-row-11",
        "the body row paints",
      );
      yield* ctx.expectNear(
        "the pinned row aligns with the body row",
        pinnedRow.y,
        bodyRow.y,
        1,
      );
      yield* ctx.expectEqual(
        "the scrolled-away row is not rendered",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-row-0"))),
        false,
      );
      const pinnedHeaderAfter = yield* boundsOrFail(
        ctx,
        "grid-pinned-header",
        "the pinned header stays painted",
      );
      yield* ctx.expectNear(
        "the pinned header does not scroll",
        pinnedHeaderAfter.y,
        pinned.y,
        1,
      );

      // A deltaX wheel over a body cell is swallowed by the virtual list on
      // 0.10.0 (plan 338), so the component-owned affordance is the pan route
      // (D30). The swallow is pinned first.
      ctx.host.wheel("grid-body", -360, 0);
      yield* ctx.expectNear(
        "a deltaX wheel over the body does not pan",
        offsetOf(ctx, "x"),
        0,
        1,
      );
      ctx.host.click("grid-pan-four");
      yield* ctx.expectNear(
        "the body panned four columns",
        offsetOf(ctx, "x"),
        -360,
        8,
      );
      const head = yield* boundsOrFail(
        ctx,
        "grid-head-5",
        "the header cell paints",
      );
      const bodyCell = yield* boundsOrFail(
        ctx,
        "grid-cell-11-5",
        "the body cell paints",
      );
      yield* aligns(
        ctx,
        "the header cell aligns with the body cell",
        head,
        bodyCell,
      );

      // Windowing: the far column is absent because it was never rendered.
      yield* ctx.expectEqual(
        "the scrolled-away column is not rendered",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-cell-11-0"))),
        false,
      );
      yield* ctx.expectEqual(
        "the far column is not rendered",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-cell-11-20"))),
        false,
      );

      ctx.host.click("grid-end");
      yield* ctx.expectNear(
        `the pan reaches the last viewport (x=${offsetOf(ctx, "x")})`,
        offsetOf(ctx, "x"),
        BODY_WIDTH - CONTENT_WIDTH,
        2,
      );
      const last = yield* boundsOrFail(
        ctx,
        "grid-cell-11-20",
        "the last columns paint at the end",
      );
      const lastHead = yield* boundsOrFail(
        ctx,
        "grid-head-20",
        "the last header cell paints",
      );
      yield* aligns(ctx, "the last header cell aligns", lastHead, last);
      yield* ctx.expectEqual(
        "the first column is gone at the end",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-cell-11-0"))),
        false,
      );

      // The same window applies vertically: rows are component-owned too.
      // The pointer's target is stale after a pan on 0.10.0, so the
      // component-owned affordance drives the vertical jump (plan 529 §6.3).
      ctx.host.click("grid-pan-bottom");
      yield* ctx.expectNear(
        `the body reaches the last viewport (y=${offsetOf(ctx, "y")})`,
        offsetOf(ctx, "y"),
        BODY_HEIGHT - CONTENT_HEIGHT,
        2,
      );
      const lastRow = yield* boundsOrFail(
        ctx,
        "grid-cell-39-20",
        "the last row paints",
      );
      const lastPinnedRow = yield* boundsOrFail(
        ctx,
        "grid-pinned-row-39",
        "the last pinned row paints",
      );
      yield* ctx.expectNear(
        "the last pinned row follows the bottom",
        lastPinnedRow.y,
        lastRow.y,
        1,
      );
      yield* ctx.expectEqual(
        "the first row is gone at the bottom",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-row-0"))),
        false,
      );

      ctx.host.click("grid-home");
      yield* ctx.expectNear(
        "home returns to the origin",
        offsetOf(ctx, "x"),
        0,
        1,
      );
      yield* ctx.expectEqual(
        "the first column is back",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-cell-0-0"))),
        true,
      );
      yield* ctx.expectEqual(
        "the far column is gone again",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("grid-cell-0-20"))),
        false,
      );

      ctx.host.click("grid-cell-0-1");
      yield* ctx.expectEqual(
        "a cell click selects it",
        textOf(ctx, "grid-selection"),
        "sel=0,1",
      );
      yield* ctx.expectEqual(
        "a cell click focuses it",
        focusOf(ctx),
        "grid-cell-0-1",
      );
      const aria = yield* ctx.expectSome(
        "the selected cell is exposed to assistive technology",
        ariaFor(ctx, "grid-cell-0-1"),
      );
      yield* ctx.expectEqual(
        "the cell carries its authored name",
        Option.getOrElse(aria.label, () => "none"),
        "row 0 col 1",
      );
      yield* ctx.expectEqual(
        "the cell role reaches AccessKit",
        Option.getOrElse(aria.role, () => "none"),
        "GridCell",
      );
      yield* ctx.expectEqual(
        "the cell announces its selection",
        Option.getOrElse(aria.selected, () => false),
        true,
      );

      ctx.host.key("right");
      yield* ctx.expectEqual(
        "Right moves the selection",
        textOf(ctx, "grid-selection"),
        "sel=0,2",
      );
      ctx.host.key("right");
      ctx.host.key("right");
      ctx.host.key("right");
      ctx.host.key("right");
      ctx.host.key("right");
      yield* ctx.expectEqual(
        "six Rights reach column seven",
        textOf(ctx, "grid-selection"),
        "sel=0,7",
      );
      yield* ctx.expectEqual(
        "focus follows the selection off the window",
        focusOf(ctx),
        "grid-cell-0-7",
      );
      yield* ctx.expectEqual(
        `the reveal panned the body (x=${offsetOf(ctx, "x")})`,
        offsetOf(ctx, "x") < 0,
        true,
      );
      const revealed = yield* boundsOrFail(
        ctx,
        "grid-cell-0-7",
        "the revealed cell paints",
      );
      yield* ctx.expectEqual(
        // The cell's reported box is its content box: 6 px in from its left
        // edge, 2 px narrower, so it can read 8 px past the viewport's content
        // box while fully painted (plan 529 §6.3).
        "the revealed cell is inside the viewport",
        revealed.x >= body.x - 1 &&
          revealed.x + revealed.width <= body.x + BODY_WIDTH + 8,
        true,
      );
      const revealedHead = yield* boundsOrFail(
        ctx,
        "grid-head-7",
        "the revealed column's header paints",
      );
      yield* aligns(ctx, "the revealed header aligns", revealedHead, revealed);

      ctx.host.key("down");
      ctx.host.key("down");
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "three Downs reach row three",
        textOf(ctx, "grid-selection"),
        "sel=3,7",
      );
      yield* ctx.expectEqual(
        "focus follows the selection down",
        focusOf(ctx),
        "grid-cell-3-7",
      );
      const downCell = yield* boundsOrFail(
        ctx,
        "grid-cell-3-7",
        "the selected row cell paints",
      );
      const downPinned = yield* boundsOrFail(
        ctx,
        "grid-pinned-row-3",
        "the selected pinned row paints",
      );
      yield* ctx.expectNear(
        "the pinned row follows the keyboard move",
        downPinned.y,
        downCell.y,
        1,
      );
    }),
};
