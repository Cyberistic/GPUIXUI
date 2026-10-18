/**
 * `data-grid-virtual` — the data grid's hardest composition (plan `338`).
 *
 * Plan `185` measured pinned chrome with plain rows; plan `152` measured rows
 * inside `<virtual-list>` with every column painted. This probe measures what
 * `185` §8 left to the data grid:
 *
 * - a `<virtual-list>` **wider than its viewport**, inside a plain horizontal
 *   scroller, so the header and every virtual row pan from one offset;
 * - a frozen column placed from the list's own anchor
 *   (`renderer.getListScrollTop` inside `onVisibleRange`, never the lagging
 *   payload — plan `300`);
 * - a sort/filter that changes the row set and must reset the anchor, or the
 *   reader points at an unrelated row;
 * - a cell in a wide virtual row that hit-tests and takes native focus while
 *   the body is panned.
 *
 * The sort/filter/window maths is pure (`data-grid-model.ts`); the view and the
 * scenario's expectations call the same functions.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { focusedId, read, readoutNumber } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import type { Anchor, GridRow, SortDirection } from "./data-grid-model.js";
import {
  anchoredWindow,
  filterRows,
  indices,
  rowTop,
  sortRows,
} from "./data-grid-model.js";

const FROZEN_WIDTH = 150;
const PAN_WIDTH = 500;
const COLUMN_WIDTH = 90;
const COLUMN_COUNT = 10;
const CONTENT_WIDTH = COLUMN_WIDTH * COLUMN_COUNT;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 28;
const LIST_HEIGHT = 300;
const ROW_COUNT = 60;
const MAX_PAN = -(CONTENT_WIDTH - PAN_WIDTH);
const JUMP_INDEX = 45;
const FILTER = "01";

/** The probe's rows; the scenario sorts and filters the same list. */
export const DATA_ROWS: ReadonlyArray<GridRow> = Arr.map(
  Arr.range(0, ROW_COUNT - 1),
  (id) => ({
    id,
    name: `Item ${Str.padStart(3, "0")(`${id}`)}`,
    kind: id % 3 === 0 ? "dir" : "file",
    size: id * 4,
  }),
);

const LAST_ID = ROW_COUNT - 1;
const LAST_NAME = `Item ${Str.padStart(3, "0")(`${LAST_ID}`)}`;

/** The rows the grid shows for a filter and a direction. */
export const gridRows = (
  query: string,
  direction: SortDirection,
): ReadonlyArray<GridRow> => sortRows(filterRows(DATA_ROWS, query), direction);

/** One row; memoized so an anchor change does not rebuild every row's cells. */
const GridRowView = memo(
  ({
    row,
    selected,
    onSelect,
  }: {
    readonly row: GridRow;
    readonly selected: boolean;
    readonly onSelect: (id: number) => void;
  }) => {
    const theme = useTheme();
    return (
      <div
        testId={`dg-row-${row.id}`}
        style={{
          display: "flex",
          width: CONTENT_WIDTH,
          height: ROW_HEIGHT,
        }}
      >
        {Arr.map(Arr.range(0, COLUMN_COUNT - 1), (column) => (
          <div
            key={column}
            testId={`dg-cell-${row.id}-${column}`}
            role="gridcell"
            aria-selected={selected}
            aria-label={`row ${row.id} col ${column}`}
            aria-id={`dg-cell-${row.id}-${column}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(row.id)}
            style={{
              width: COLUMN_WIDTH,
              height: ROW_HEIGHT,
              flexShrink: 0,
              justifyContent: "center",
              paddingLeft: theme.spacing.sm,
              backgroundColor: selected
                ? theme.colors.accent
                : theme.colors.card,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {column === 0 ? row.name : `c${column}`}
            </text>
          </div>
        ))}
      </div>
    );
  },
);

const DataGridProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const pan = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(Option.none<number>());
  const [anchor, setAnchor] = useState<Anchor>({ index: 0, offset: 0 });
  const [panX, setPanX] = useState(0);
  const select = useCallback((id: number) => setSelected(Option.some(id)), []);

  const rows = gridRows(query, direction);
  const topId = Option.map(Arr.get(rows, anchor.index), (row) => row.id);

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

  /** A sort or filter invalidates the reader's row, so the anchor returns to the top. */
  useEffect(() => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, 0),
    });
    setAnchor({ index: 0, offset: 0 });
  }, [direction, query, renderer]);

  const jump = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, JUMP_INDEX),
    });
    setAnchor({ index: JUMP_INDEX, offset: 0 });
  };

  const window = anchoredWindow(anchor, LIST_HEIGHT, ROW_HEIGHT, rows.length);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 680 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable
          testId="dg-sort"
          onClick={() =>
            setDirection((current) => (current === "asc" ? "desc" : "asc"))
          }
        >
          <text style={{ color: theme.colors.foreground }}>
            {`sort: ${direction}`}
          </text>
        </Pressable>
        <input
          testId="dg-filter"
          value={query}
          onChange={(event) => setQuery(event.value ?? "")}
          style={{
            width: 120,
            color: theme.colors.inputForeground,
            backgroundColor: theme.colors.input,
            padding: 6,
          }}
        />
        <Pressable testId="dg-clear" onClick={() => setQuery("")}>
          <text style={{ color: theme.colors.foreground }}>clear</text>
        </Pressable>
        <Pressable testId="dg-jump" onClick={jump}>
          <text style={{ color: theme.colors.foreground }}>jump</text>
        </Pressable>
        <Pressable testId="dg-pan-end" onClick={() => scrollPan(MAX_PAN)}>
          <text style={{ color: theme.colors.foreground }}>pan end</text>
        </Pressable>
        <Pressable testId="dg-pan-home" onClick={() => scrollPan(0)}>
          <text style={{ color: theme.colors.foreground }}>home</text>
        </Pressable>
      </div>

      <Readout testId="dg-state">
        {`sort=${direction} filter=${query.length} count=${rows.length} anchor=${anchor.index} first=${Option.getOrElse(topId, () => -1)} sel=${Option.match(
          selected,
          { onNone: () => "none", onSome: (id) => `${id}` },
        )} x=${panX}`}
      </Readout>

      <div testId="dg-grid" style={{ display: "flex", height: 328 }}>
        <div
          testId="dg-frozen"
          style={{
            display: "flex",
            flexDirection: "column",
            width: FROZEN_WIDTH,
          }}
        >
          <div
            testId="dg-frozen-head"
            style={{
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
                Option.map(Arr.get(rows, index), (row) => (
                  <div
                    key={row.id}
                    testId={`dg-frozen-row-${row.id}`}
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
                    <text
                      style={{ fontSize: 11, color: theme.colors.foreground }}
                    >{`#${row.id}`}</text>
                  </div>
                )),
              ),
            )}
          </div>
        </div>

        <div
          ref={pan}
          testId="dg-pan"
          onScroll={syncPan}
          style={{
            width: PAN_WIDTH,
            height: HEADER_HEIGHT + LIST_HEIGHT,
            overflowX: "scroll",
            overflowY: "hidden",
            backgroundColor: theme.colors.background,
          }}
        >
          <div style={{ width: CONTENT_WIDTH }}>
            <div
              testId="dg-headrow"
              style={{
                position: "relative",
                width: CONTENT_WIDTH,
                height: HEADER_HEIGHT,
                backgroundColor: theme.colors.muted,
              }}
            >
              {Arr.map(Arr.range(0, COLUMN_COUNT - 1), (column) => (
                <div
                  key={column}
                  testId={`dg-head-${column}`}
                  style={{
                    position: "absolute",
                    left: column * COLUMN_WIDTH,
                    top: 0,
                    width: COLUMN_WIDTH,
                    height: HEADER_HEIGHT,
                    justifyContent: "center",
                    paddingLeft: theme.spacing.sm,
                  }}
                >
                  <text
                    style={{
                      fontSize: 12,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {column === 0 ? "name" : `col ${column}`}
                  </text>
                </div>
              ))}
            </div>
            <virtual-list
              testId="dg-list"
              ref={list}
              estimatedItemHeight={ROW_HEIGHT}
              onVisibleRange={syncAnchor}
              style={{ width: CONTENT_WIDTH, height: LIST_HEIGHT }}
            >
              {Arr.map(rows, (row) => (
                <GridRowView
                  key={row.id}
                  row={row}
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

/** The `readout`'s numeric field, or `-1` so a comparison names the absence. */
const field = (ctx: Smoke.SmokeContext, key: string): number =>
  Option.getOrElse(readoutNumber(ctx, "dg-state", key), () => -1);

const boundsOrFail = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const panOffset = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset("dg-pan")),
      (value) => value.x,
    ),
    () => 0,
  );

const firstId = (ctx: Smoke.SmokeContext): number => field(ctx, "first");

const idAt = (index: number, query = "", direction: SortDirection = "asc") =>
  gridRows(query, direction)[index]?.id ?? -1;

const aligns = (
  ctx: Smoke.SmokeContext,
  label: string,
  left: Smoke.Bounds,
  right: Smoke.Bounds,
  axis: "x" | "y",
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectNear(label, left[axis], right[axis], 1);

/** Asserts the frozen row for the current top id aligns with its body row. */
const frozenFollows = (ctx: Smoke.SmokeContext) =>
  Effect.gen(function* () {
    const id = firstId(ctx);
    const frozen = yield* boundsOrFail(
      ctx,
      `dg-frozen-row-${id}`,
      `the frozen row for the top id ${id} paints`,
    );
    const body = yield* boundsOrFail(
      ctx,
      `dg-row-${id}`,
      `the body row ${id} paints`,
    );
    yield* aligns(
      ctx,
      "the frozen row aligns with the body row",
      frozen,
      body,
      "y",
    );
  });

export const dataGridScenario: PlaygroundScenario = {
  id: "data-grid-virtual",
  title:
    "Data grid: virtual rows, a horizontal pan, a frozen column, sort and filter",
  capability: "data-grid",
  view: () => <DataGridProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // Geometry: the frozen column is outside the pan.
      const root = yield* boundsOrFail(ctx, "dg-grid", "the grid paints");
      const frozenHead = yield* boundsOrFail(
        ctx,
        "dg-frozen-head",
        "the frozen header paints",
      );
      const pan = yield* boundsOrFail(ctx, "dg-pan", "the pan paints");
      yield* ctx.expectNear(
        "the pan starts after the frozen column",
        pan.x,
        root.x + FROZEN_WIDTH,
        1,
      );
      yield* ctx.expectNear(
        "the pan is the viewport width",
        pan.width,
        PAN_WIDTH,
        1,
      );
      const row0 = yield* boundsOrFail(
        ctx,
        "dg-frozen-row-0",
        "the first frozen row paints",
      );
      const body0 = yield* boundsOrFail(
        ctx,
        "dg-row-0",
        "the first row paints",
      );
      yield* aligns(
        ctx,
        "row 0 aligns with the frozen column",
        row0,
        body0,
        "y",
      );

      // Virtualization: a wheel moves the list, not the header or the frozen column.
      const headBefore = yield* boundsOrFail(
        ctx,
        "dg-headrow",
        "the header paints",
      );
      const panBefore = panOffset(ctx);
      ctx.host.wheel("dg-pan", 0, -280);
      yield* ctx.expectEqual(
        `the list virtualizes (anchor=${field(ctx, "anchor")})`,
        field(ctx, "anchor") > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the first row leaves the window",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("dg-row-0"))),
        false,
      );
      const headAfter = yield* boundsOrFail(
        ctx,
        "dg-headrow",
        "the header still paints",
      );
      yield* ctx.expectNear(
        "the header does not scroll for a vertical wheel",
        headAfter.y,
        headBefore.y,
        1,
      );
      yield* ctx.expectNear(
        "a vertical wheel does not pan",
        panOffset(ctx),
        panBefore,
        1,
      );
      yield* frozenFollows(ctx);

      // Horizontal: the header strip pans the one scroller, and the list follows.
      ctx.host.click("dg-pan-home");
      ctx.host.wheel("dg-head-2", -90, 0);
      yield* ctx.expectNear(
        `the header strip pans the body (x=${panOffset(ctx)})`,
        panOffset(ctx),
        -90,
        8,
      );
      const head3 = yield* boundsOrFail(
        ctx,
        "dg-head-3",
        "the header cell pans into view",
      );
      const body3 = yield* boundsOrFail(
        ctx,
        `dg-cell-${firstId(ctx)}-3`,
        "the body cell stays addressable after the pan",
      );
      yield* aligns(
        ctx,
        "the header cell aligns with the body cell",
        head3,
        body3,
        "x",
      );
      const frozenAfterPan = yield* boundsOrFail(
        ctx,
        "dg-frozen-head",
        "the frozen header still paints",
      );
      yield* ctx.expectNear(
        "the frozen column does not pan",
        frozenAfterPan.x,
        frozenHead.x,
        1,
      );

      // The far edge: the same composition at the maximum pan.
      ctx.host.click("dg-pan-end");
      yield* ctx.expectNear(
        `the pan reaches the far edge (x=${panOffset(ctx)})`,
        panOffset(ctx),
        MAX_PAN,
        2,
      );
      const head8 = yield* boundsOrFail(
        ctx,
        "dg-head-8",
        "the far header cell paints",
      );
      const body8 = yield* boundsOrFail(
        ctx,
        `dg-cell-${firstId(ctx)}-8`,
        "the far body cell paints",
      );
      yield* aligns(
        ctx,
        "the far header cell aligns with the body cell",
        head8,
        body8,
        "x",
      );

      // Hit-testing and native focus inside a panned virtual row.
      const cell9 = `dg-cell-${firstId(ctx)}-9`;
      ctx.host.click(cell9);
      yield* ctx.expectEqual(
        "a panned cell selects its row",
        field(ctx, "sel"),
        firstId(ctx),
      );
      yield* ctx.expectEqual(
        "a panned cell takes native focus",
        focusedId(ctx),
        cell9,
      );
      yield* ctx.expectNear(
        "clicking a cell does not pan",
        panOffset(ctx),
        MAX_PAN,
        1,
      );

      // A vertical wheel while panned keeps the pan and realigns the frozen column.
      ctx.host.wheel("dg-pan", 0, -280);
      yield* frozenFollows(ctx);
      yield* ctx.expectNear(
        "a vertical wheel keeps the horizontal pan",
        panOffset(ctx),
        MAX_PAN,
        1,
      );

      // A horizontal wheel over the body is swallowed by the list; the header
      // strip is the wheel route that pans (measured, plan `338` §8).
      const panBeforeBodyWheel = panOffset(ctx);
      ctx.host.wheel(`dg-cell-${firstId(ctx)}-3`, 90, 0);
      yield* ctx.expectNear(
        "a horizontal wheel over the body does not pan",
        panOffset(ctx),
        panBeforeBodyWheel,
        1,
      );

      // An app-owned jump to a deep row: the frozen column agrees with the runtime.
      ctx.host.click("dg-jump");
      yield* ctx.expectEqual(
        `the jump anchors the list (anchor=${field(ctx, "anchor")})`,
        field(ctx, "anchor"),
        JUMP_INDEX,
      );
      const anchored = yield* ctx.expectSome(
        "the list reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("dg-list")),
      );
      yield* ctx.expectEqual(
        "the runtime anchor is the jump index",
        anchored[0],
        JUMP_INDEX,
      );
      yield* ctx.expectEqual(
        "the readout names the jumped row",
        firstId(ctx),
        idAt(JUMP_INDEX),
      );
      yield* frozenFollows(ctx);

      // A filter from a deep anchor changes the row set and resets to the top.
      ctx.host.click("dg-filter");
      ctx.host.key("0");
      ctx.host.key("1");
      yield* ctx.expectEqual(
        "the filter narrows the row set",
        field(ctx, "count"),
        filterRows(DATA_ROWS, FILTER).length,
      );
      yield* ctx.expectEqual(
        "the filter resets the anchor",
        field(ctx, "anchor"),
        0,
      );
      yield* ctx.expectEqual(
        "the filtered rows start at the expected row",
        firstId(ctx),
        idAt(0, FILTER),
      );
      yield* ctx.expectEqual(
        "the filtered set paints every row",
        Option.isSome(
          Option.fromNullishOr(ctx.host.bounds(`dg-row-${idAt(9, FILTER)}`)),
        ),
        true,
      );
      yield* ctx.expectContains(
        "the painted text holds the filtered rows",
        ctx.host.paintedText().join(" "),
        "Item 01",
      );
      yield* ctx.expectEqual(
        "a filtered-out row is not painted",
        Arr.some(ctx.host.paintedText(), Str.includes(LAST_NAME)),
        false,
      );
      yield* frozenFollows(ctx);

      // Clearing restores the full set at the top.
      ctx.host.click("dg-clear");
      yield* ctx.expectEqual(
        "clearing restores every row",
        field(ctx, "count"),
        ROW_COUNT,
      );
      yield* ctx.expectEqual(
        "clearing keeps the top anchor",
        field(ctx, "anchor"),
        0,
      );

      // A sort from a deep anchor resets and repaints the new order.
      ctx.host.click("dg-jump");
      ctx.host.click("dg-sort");
      yield* ctx.expectEqual(
        "the sort flips",
        Str.includes("sort=desc")(read(ctx, "dg-state")),
        true,
      );
      yield* ctx.expectEqual(
        "the sort resets the anchor",
        field(ctx, "anchor"),
        0,
      );
      yield* ctx.expectEqual(
        "the descending order starts at the last row",
        firstId(ctx),
        idAt(0, "", "desc"),
      );
      yield* ctx.expectContains(
        "the painted text holds the descending top row",
        read(ctx, `dg-row-${LAST_ID}`),
        LAST_NAME,
      );

      // And back.
      ctx.host.click("dg-sort");
      yield* ctx.expectEqual(
        "the ascending order starts at the first row",
        firstId(ctx),
        idAt(0, "", "asc"),
      );
      yield* ctx.expectContains(
        "the painted text holds the ascending top row",
        read(ctx, "dg-row-0"),
        "Item 000",
      );
    }),
};
