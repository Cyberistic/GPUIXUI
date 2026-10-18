/**
 * `data-grid-columns` — resizable columns inside the virtualized, panned data
 * grid (plan `349`).
 *
 * Plan `130` resized a column in a **plain flex row**; plan `338` measured the
 * real composition — one horizontal scroller holding a header and a
 * `<virtual-list>` wider than its viewport, with a frozen column. This probe
 * composes the two and measures what a grid needs on its first resize:
 *
 * - a 6 px handle on an **absolutely positioned** header cell drives per-column
 *   width state while the pointer is captured;
 * - every virtual row and the frozen column follow the header within 1 px;
 * - the content width, the row width and the pan maximum are derived from the
 *   widths, so a resize changes how far the body can pan;
 * - the virtual-list anchor and the selection survive a resize.
 *
 * The width arithmetic is pure (`column-resize-model.ts`); the view and the
 * scenario's expectations call the same functions.
 */
import { memo, useCallback, useRef, useState } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { ariaOf, fieldOf, focusedId, read, readoutNumber, text } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import type { GridRow } from "./data-grid-model.js";
import { anchoredWindow, indices, rowTop } from "./data-grid-model.js";
import { DATA_ROWS } from "./data-grid.js";
import type { Widths } from "./column-resize-model.js";
import {
  COLUMNS,
  boundsOf,
  contentWidth,
  describeWidths,
  initialWidths,
  maxPan,
  offsetOf,
  resetWidths,
  setWidth,
  widthOf,
} from "./column-resize-model.js";

const FROZEN_WIDTH = 150;
const VIEWPORT = 360;
const LIST_HEIGHT = 280;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 28;
const HANDLE_WIDTH = 6;
const JUMP_INDEX = 45;
const KEY_STEP = 16;

/** A drag in progress: the column, the pointer and the width at button down. */
interface Press {
  readonly id: string;
  readonly pointer: number;
  readonly start: number;
}

/** A row's text for one column. */
const cellText = (row: GridRow, id: string): string =>
  Match.value(id).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.kind),
    Match.when("size", () => `${row.size} B`),
    Match.orElse(() => `note ${row.id}`),
  );

/** One virtual row; memoized so a pan does not rebuild every cell. */
const RowView = memo(
  ({
    row,
    widths,
    selected,
    onSelect,
  }: {
    readonly row: GridRow;
    readonly widths: Widths;
    readonly selected: boolean;
    readonly onSelect: (id: number) => void;
  }) => {
    const theme = useTheme();
    return (
      <div
        testId={`columns-row-${row.id}`}
        onClick={() => onSelect(row.id)}
        style={{
          display: "flex",
          width: contentWidth(widths),
          height: ROW_HEIGHT,
          backgroundColor: selected
            ? theme.colors.muted
            : theme.colors.background,
        }}
      >
        {Arr.map(COLUMNS, (column) => (
          <div
            key={column.id}
            testId={`columns-cell-${row.id}-${column.id}`}
            role="gridcell"
            aria-selected={selected}
            aria-label={`row ${row.id} ${column.label}`}
            aria-id={`columns-cell-${row.id}-${column.id}`}
            tabIndex={selected && column.id === "name" ? 0 : -1}
            style={{
              width: widthOf(widths, column.id),
              height: ROW_HEIGHT,
              flexShrink: 0,
              justifyContent: "center",
              paddingLeft: theme.spacing.sm,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {cellText(row, column.id)}
            </text>
          </div>
        ))}
      </div>
    );
  },
);

const DataGridColumnsProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const pan = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const [widths, setWidths] = useState<Widths>(initialWidths);
  const [press, setPress] = useState(Option.none<Press>());
  const [panX, setPanX] = useState(0);
  const [anchor, setAnchor] = useState({ index: 0, offset: 0 });
  const [selected, setSelected] = useState(Option.none<number>());
  const select = useCallback((id: number) => setSelected(Option.some(id)), []);

  const content = contentWidth(widths);
  const window = anchoredWindow(
    anchor,
    LIST_HEIGHT,
    ROW_HEIGHT,
    Arr.length(DATA_ROWS),
  );

  /** The list's post-scroll anchor; the payload lags a gesture, this does not. */
  const syncAnchor = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getListScrollTop?.(id)), {
          onNone: () => {},
          onSome: (value) => {
            const next = { index: value[0] ?? 0, offset: value[1] ?? 0 };
            setAnchor((current) =>
              current.index === next.index && current.offset === next.offset
                ? current
                : next,
            );
          },
        }),
    });
  };

  /** The horizontal offset belongs to the plain ancestor scroller. */
  const syncPan = (): void => {
    Option.match(Option.fromNullishOr(pan.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getScrollOffset?.(id)), {
          onNone: () => {},
          onSome: (offset) => setPanX(offset[0] ?? 0),
        }),
    });
  };

  const scrollPan = (x: number): void => {
    Option.match(Option.fromNullishOr(pan.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollTo?.(id, x, 0),
    });
    setPanX(x);
  };

  const jump = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, JUMP_INDEX),
    });
    setAnchor({ index: JUMP_INDEX, offset: 0 });
  };

  /** A keyboard resize, relative to the width in the same update. */
  const resizeBy = (id: string, delta: number) =>
    setWidths((current) => setWidth(current, id, widthOf(current, id) + delta));

  /** A keyboard bound: `min` for Home, `max` for End. */
  const resizeToBound = (id: string, bound: "min" | "max") =>
    Option.match(boundsOf(id), {
      onNone: () => {},
      onSome: (b) => setWidths((current) => setWidth(current, id, b[bound])),
    });

  return (
    <div
      testId="columns-frame"
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 660 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable testId="columns-reset" onClick={() => setWidths(resetWidths())}>
          <text style={{ color: theme.colors.foreground }}>reset widths</text>
        </Pressable>
        <Pressable
          testId="columns-pan-end"
          onClick={() => scrollPan(maxPan(widths, VIEWPORT))}
        >
          <text style={{ color: theme.colors.foreground }}>pan end</text>
        </Pressable>
        <Pressable testId="columns-jump" onClick={jump}>
          <text style={{ color: theme.colors.foreground }}>jump</text>
        </Pressable>
      </div>

      <Readout testId="columns-state">
        {`${describeWidths(widths)} content=${content} x=${panX} anchor=${anchor.index} sel=${Option.match(
          selected,
          { onNone: () => "none", onSome: (id) => `${id}` },
        )}`}
      </Readout>

      <div testId="columns-grid" style={{ display: "flex", height: 308 }}>
        <div
          testId="columns-frozen"
          style={{ display: "flex", flexDirection: "column", width: FROZEN_WIDTH }}
        >
          <div
            testId="columns-frozen-head"
            style={{
              width: FROZEN_WIDTH,
              height: HEADER_HEIGHT,
              justifyContent: "center",
              paddingLeft: theme.spacing.sm,
              backgroundColor: theme.colors.muted,
            }}
          >
            <text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
              ID
            </text>
          </div>
          <div
            style={{
              position: "relative",
              width: FROZEN_WIDTH,
              height: LIST_HEIGHT,
              overflowX: "hidden",
              overflowY: "hidden",
            }}
          >
            {Arr.getSomes(
              Arr.map(indices(window), (index) =>
                Option.map(Arr.get(DATA_ROWS, index), (row) => (
                  <div
                    key={row.id}
                    testId={`columns-frozen-row-${row.id}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: rowTop(index, anchor, ROW_HEIGHT),
                      width: FROZEN_WIDTH,
                      height: ROW_HEIGHT,
                      justifyContent: "center",
                      paddingLeft: theme.spacing.sm,
                      backgroundColor: Option.contains(selected, row.id)
                        ? theme.colors.accent
                        : theme.colors.card,
                      borderWidth: theme.borderWidth.thin,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <text style={{ fontSize: 11, color: theme.colors.foreground }}>
                      {`#${row.id}`}
                    </text>
                  </div>
                )),
              ),
            )}
          </div>
        </div>

        <div
          ref={pan}
          testId="columns-pan"
          onScroll={syncPan}
          style={{
            width: VIEWPORT,
            height: HEADER_HEIGHT + LIST_HEIGHT,
            overflowX: "scroll",
            overflowY: "hidden",
            backgroundColor: theme.colors.background,
          }}
        >
          <div style={{ width: content }}>
            <div
              testId="columns-headrow"
              style={{
                position: "relative",
                width: content,
                height: HEADER_HEIGHT,
                backgroundColor: theme.colors.muted,
              }}
            >
              {Arr.map(COLUMNS, (column) => (
                <div
                  key={column.id}
                  testId={`columns-head-${column.id}`}
                  style={{
                    position: "absolute",
                    left: offsetOf(widths, column.id),
                    top: 0,
                    width: widthOf(widths, column.id),
                    height: HEADER_HEIGHT,
                    justifyContent: "center",
                    paddingLeft: theme.spacing.sm,
                  }}
                >
                  <text
                    style={{ fontSize: 12, color: theme.colors.mutedForeground }}
                  >
                    {column.label}
                  </text>
                  <div
                    testId={`columns-handle-${column.id}`}
                    aria-id={`columns-handle-${column.id}`}
                    aria-label={`Resize ${column.label} column`}
                    aria-valuetext={`${widthOf(widths, column.id)}px`}
                    role="separator"
                    tabIndex={0}
                    onMouseDown={(event) =>
                      setPress(
                        Option.some({
                          id: column.id,
                          pointer: event.x ?? 0,
                          start: widthOf(widths, column.id),
                        }),
                      )
                    }
                    onMouseMove={(event) =>
                      Option.match(press, {
                        onNone: () => {},
                        onSome: (start) =>
                          setWidths((current) =>
                            setWidth(
                              current,
                              start.id,
                              start.start + (event.x ?? 0) - start.pointer,
                            ),
                          ),
                      })
                    }
                    onMouseUp={() => setPress(Option.none())}
                    onKeyDown={(event) =>
                      Match.value(event.key).pipe(
                        Match.when("left", () => resizeBy(column.id, -KEY_STEP)),
                        Match.when("right", () => resizeBy(column.id, KEY_STEP)),
                        Match.when("home", () => resizeToBound(column.id, "min")),
                        Match.when("end", () => resizeToBound(column.id, "max")),
                        Match.orElse(() => {}),
                      )
                    }
                    style={{
                      position: "absolute",
                      left: widthOf(widths, column.id) - HANDLE_WIDTH,
                      top: 0,
                      width: HANDLE_WIDTH,
                      height: HEADER_HEIGHT,
                      cursor: "col-resize",
                      backgroundColor: theme.colors.border,
                      hover: { backgroundColor: theme.colors.primary },
                    }}
                  />
                </div>
              ))}
            </div>
            <virtual-list
              testId="columns-list"
              ref={list}
              estimatedItemHeight={ROW_HEIGHT}
              onVisibleRange={syncAnchor}
              style={{ width: content, height: LIST_HEIGHT }}
            >
              {Arr.map(DATA_ROWS, (row) => (
                <RowView
                  key={row.id}
                  row={row}
                  widths={widths}
                  selected={Option.contains(selected, row.id)}
                  onSelect={select}
                />
              ))}
            </virtual-list>
          </div>
        </div>
      </div>
    </div>
  );
};

const state = (ctx: Smoke.SmokeContext): string => read(ctx, "columns-state");

/** The `readout`'s numeric field, or `-1` so a comparison names the absence. */
const field = (ctx: Smoke.SmokeContext, key: string): number =>
  Option.getOrElse(readoutNumber(ctx, "columns-state", key), () => -1);

const selectedId = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(fieldOf(state(ctx), "sel"), () => "none");

const boundsOrFail = (
  ctx: Smoke.SmokeContext,
  testId: string,
  label: string,
) => ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const panOffset = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset("columns-pan")),
      (value) => value.x,
    ),
    () => 0,
  );

/** The header cell and the body cell of one column share a left edge and width. */
const alignedColumn = (
  ctx: Smoke.SmokeContext,
  id: string,
  rowId: number,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const head = yield* boundsOrFail(
      ctx,
      `columns-head-${id}`,
      `the ${id} header paints`,
    );
    const cell = yield* boundsOrFail(
      ctx,
      `columns-cell-${rowId}-${id}`,
      `the ${id} body cell paints`,
    );
    yield* ctx.expectNear(
      `the ${id} header and body share a left edge`,
      cell.x,
      head.x,
      1,
    );
    yield* ctx.expectNear(
      `the ${id} header and body share a width`,
      cell.width,
      head.width,
      1,
    );
  });

/** The frozen row for `index` aligns with its virtual body row. */
const frozenFollows = (
  ctx: Smoke.SmokeContext,
  index: number,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const frozen = yield* boundsOrFail(
      ctx,
      `columns-frozen-row-${index}`,
      `the frozen row ${index} paints`,
    );
    const body = yield* boundsOrFail(
      ctx,
      `columns-row-${index}`,
      `the body row ${index} paints`,
    );
    yield* ctx.expectNear(
      `the frozen row ${index} aligns with its body row`,
      frozen.y,
      body.y,
      1,
    );
  });

export const dataGridColumnsScenario: PlaygroundScenario = {
  id: "data-grid-columns",
  title: "Data grid: drag a header handle, the virtual rows and pan follow",
  capability: "columns",
  view: () => <DataGridColumnsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // Geometry: the pan starts at the frozen column, and the header is the
      // content width.
      const pan = yield* boundsOrFail(ctx, "columns-pan", "the pan paints");
      const frozen = yield* boundsOrFail(
        ctx,
        "columns-frozen-head",
        "the frozen header paints",
      );
      const head = yield* boundsOrFail(
        ctx,
        "columns-headrow",
        "the header row paints",
      );
      yield* ctx.expectNear(
        "the pan starts at the frozen column's right edge",
        pan.x,
        frozen.x + FROZEN_WIDTH,
        1,
      );
      yield* ctx.expectNear(
        "the pan is the viewport width",
        pan.width,
        VIEWPORT,
        1,
      );
      yield* ctx.expectNear(
        "the header row is the content width",
        head.width,
        contentWidth(initialWidths),
        1,
      );
      yield* ctx.expectNear(
        "the header row starts at the pan's left edge",
        head.x,
        pan.x,
        1,
      );
      yield* ctx.expectEqual(
        "the widths start at their defaults",
        state(ctx),
        `${describeWidths(initialWidths)} content=560 x=0 anchor=0 sel=none`,
      );
      yield* Effect.forEach(
        ["name", "status", "size"],
        (id) => alignedColumn(ctx, id, 0),
        { concurrency: 1, discard: true },
      );

      // A drag on the header handle grows the column; every later cell moves.
      ctx.host.drag("columns-handle-name", 40, 0);
      yield* ctx.expectEqual(
        "the drag grows the name column",
        field(ctx, "name"),
        240,
      );
      yield* ctx.expectEqual(
        "the row width follows the column",
        field(ctx, "content"),
        600,
      );
      const grownHead = yield* boundsOrFail(
        ctx,
        "columns-head-name",
        "the name header paints after the drag",
      );
      yield* ctx.expectNear(
        "the header paints the new width",
        grownHead.width,
        240,
        1,
      );
      const statusHead = yield* boundsOrFail(
        ctx,
        "columns-head-status",
        "the status header paints after the drag",
      );
      yield* ctx.expectNear(
        "the next column moves by the drag delta",
        statusHead.x,
        grownHead.x + 240,
        1,
      );
      yield* alignedColumn(ctx, "status", 0);

      // Inclusive clamps at both ends.
      ctx.host.drag("columns-handle-name", -400, 0);
      yield* ctx.expectEqual(
        "the drag clamps at the minimum",
        field(ctx, "name"),
        96,
      );
      ctx.host.drag("columns-handle-name", 400, 0);
      yield* ctx.expectEqual(
        "the drag clamps at the maximum",
        field(ctx, "name"),
        320,
      );
      ctx.host.click("columns-reset");
      yield* ctx.expectEqual(
        "reset restores the defaults",
        field(ctx, "content"),
        560,
      );

      // Pan to the far edge, then resize the last column at the edge.
      ctx.host.click("columns-pan-end");
      yield* ctx.expectNear(
        `the pan reaches the far edge (x=${field(ctx, "x")})`,
        field(ctx, "x"),
        maxPan(initialWidths, VIEWPORT),
        1,
      );
      yield* ctx.expectNear(
        "the runtime reports the same pan",
        panOffset(ctx),
        maxPan(initialWidths, VIEWPORT),
        1,
      );
      ctx.host.drag("columns-handle-notes", 400, 0);
      yield* ctx.expectEqual(
        "the last column clamps at its maximum",
        field(ctx, "notes"),
        300,
      );
      yield* ctx.expectEqual(
        "the grew content widens the row",
        field(ctx, "content"),
        710,
      );
      ctx.host.click("columns-pan-end");
      yield* ctx.expectNear(
        `the pan maximum follows the resize (x=${field(ctx, "x")})`,
        field(ctx, "x"),
        -350,
        1,
      );
      yield* ctx.expectNear(
        "the runtime pan follows the resize",
        panOffset(ctx),
        -350,
        1,
      );
      const notesHead = yield* boundsOrFail(
        ctx,
        "columns-head-notes",
        "the last header paints at the far pan",
      );
      yield* ctx.expectNear(
        "the last column ends at the viewport's right edge",
        notesHead.x + notesHead.width,
        pan.x + VIEWPORT,
        2,
      );
      yield* alignedColumn(ctx, "notes", 0);

      // Shrinking the content leaves the pan out of range; a new pan-end is legal.
      ctx.host.drag("columns-handle-notes", -400, 0);
      yield* ctx.expectEqual(
        "the last column clamps at its minimum",
        field(ctx, "notes"),
        80,
      );
      yield* ctx.expectEqual(
        "the shrank content narrows the row",
        field(ctx, "content"),
        490,
      );
      const afterShrink = panOffset(ctx);
      yield* ctx.expectEqual(
        `a shrink never leaves a positive pan (x=${afterShrink})`,
        afterShrink <= 0,
        true,
      );
      ctx.host.click("columns-pan-end");
      yield* ctx.expectNear(
        `the new pan maximum is the smaller content (x=${field(ctx, "x")})`,
        field(ctx, "x"),
        -130,
        1,
      );
      yield* ctx.expectNear("the runtime pan is legal again", panOffset(ctx), -130, 1);
      yield* Effect.forEach(
        ["name", "status", "size"],
        (id) => alignedColumn(ctx, id, 0),
        { concurrency: 1, discard: true },
      );

      // Reset and re-pan at the default widths.
      ctx.host.click("columns-reset");
      ctx.host.click("columns-pan-end");
      yield* ctx.expectNear(
        "reset restores the pan range",
        panOffset(ctx),
        maxPan(initialWidths, VIEWPORT),
        1,
      );

      // The anchor and the frozen column survive a resize.
      ctx.host.click("columns-jump");
      yield* ctx.expectEqual(
        `the jump anchors the list (anchor=${field(ctx, "anchor")})`,
        field(ctx, "anchor"),
        JUMP_INDEX,
      );
      const anchored = yield* ctx.expectSome(
        "the list reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("columns-list")),
      );
      yield* ctx.expectEqual(
        "the runtime anchor is the jump index",
        anchored[0],
        JUMP_INDEX,
      );
      yield* frozenFollows(ctx, JUMP_INDEX);
      ctx.host.drag("columns-handle-status", 20, 0);
      yield* ctx.expectEqual(
        "a resize grows the focused row's column",
        field(ctx, "status"),
        140,
      );
      yield* ctx.expectEqual(
        "a resize keeps the anchor readout",
        field(ctx, "anchor"),
        JUMP_INDEX,
      );
      const anchoredAfter = yield* ctx.expectSome(
        "the list still reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("columns-list")),
      );
      yield* ctx.expectEqual(
        "a resize does not scroll the list",
        anchoredAfter[0],
        JUMP_INDEX,
      );
      yield* frozenFollows(ctx, JUMP_INDEX);

      // Selection survives the same resize.
      ctx.host.click(`columns-cell-${JUMP_INDEX}-status`);
      yield* ctx.expectEqual(
        "a cell click selects its row",
        selectedId(ctx),
        `${JUMP_INDEX}`,
      );
      ctx.host.drag("columns-handle-size", 10, 0);
      yield* ctx.expectEqual("the size column grew", field(ctx, "size"), 100);
      yield* ctx.expectEqual(
        "a resize keeps the selection",
        selectedId(ctx),
        `${JUMP_INDEX}`,
      );

      // The keyboard path: a click focuses the handle, arrows step, Home/End clamp.
      ctx.host.click("columns-handle-status");
      yield* ctx.expectEqual(
        "the handle takes native focus",
        focusedId(ctx),
        "columns-handle-status",
      );
      ctx.host.key("right");
      yield* ctx.expectEqual(
        "Right grows the column by one step",
        field(ctx, "status"),
        156,
      );
      ctx.host.key("end");
      yield* ctx.expectEqual(
        "End clamps at the maximum",
        field(ctx, "status"),
        240,
      );
      ctx.host.key("home");
      yield* ctx.expectEqual(
        "Home clamps at the minimum",
        field(ctx, "status"),
        80,
      );
      ctx.host.click("columns-reset");
      yield* ctx.expectEqual(
        "reset restores the resized column",
        field(ctx, "status"),
        120,
      );

      // The handle is a named splitter carrying its width.
      const handleAria = yield* ctx.expectSome(
        "the resize handle is exposed to assistive technology",
        ariaOf(ctx, "columns-handle-name"),
      );
      yield* ctx.expectEqual(
        "the handle's role is a splitter",
        text(handleAria.role),
        "Splitter",
      );
      yield* ctx.expectEqual(
        "the handle reports its width",
        text(handleAria.value),
        "200px",
      );
    }),
};
