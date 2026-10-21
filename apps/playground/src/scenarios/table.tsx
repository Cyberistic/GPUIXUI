/**
 * Tier 3 probes: `table-select-sort` and `table-column-resize`.
 *
 * GPUix has no table primitive, so the question is whether the composition it
 * does have can carry a data grid: fixed-width cells in flex rows, a vertical
 * scroller, sort/select in React state, and a drag-resized column. The probes
 * assert numbers; a `failed` verdict is a valid outcome the data-grid plan must
 * then design around (plan `130`).
 *
 * Deviation from plan `130` §3.1: `style.gridTemplateColumns` is a **column
 * count** in 0.10.0, not a CSS track list, so cells use explicit flex widths.
 */
import { useState } from "react";
import { Effect, Order } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as String from "effect/String";
import type { EventPayload } from "@gpuix/native";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { nextSize } from "../panels/resize.js";
import type { ScenarioBody } from "../types.js";

const ROWS = 200;
const STATUS_WIDTH = 100;
const SIZE_WIDTH = 80;
const NAME_MIN = 120;
const NAME_MAX = 360;

interface Row {
  readonly n: number;
  readonly name: string;
}

const rows: ReadonlyArray<Row> = Arr.map(Arr.range(0, ROWS - 1), (n) => ({
  n,
  name: `Item ${String.padStart(3, "0")(`${n}`)}`,
}));

const byName = Order.mapInput(Order.String, (row: Row) => row.name);

const ordered = (descending: boolean): ReadonlyArray<Row> => {
  const sorted = Arr.sort(rows, byName);
  return descending ? Arr.reverse(sorted) : sorted;
};

/** Shared cell metrics; the border colour comes from the active theme. */
const cell = { padding: 6, borderBottomWidth: 1 } as const;

/** A sortable, selectable table with a drag-resized name column. */
const TableProbe = () => {
  const theme = useTheme();
  const [descending, setDescending] = useState(false);
  const [selected, setSelected] = useState(Option.none<number>());
  const [nameWidth, setNameWidth] = useState(160);
  const [press, setPress] = useState(
    Option.none<{ readonly x: number; readonly width: number }>(),
  );

  const shown = ordered(descending);
  const innerWidth = nameWidth + STATUS_WIDTH + SIZE_WIDTH;
  const direction = descending ? "name-desc" : "name-asc";

  const select = (n: number) => setSelected(Option.some(n));

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 420 }}
    >
      <Readout testId="table-readout">
        {`rows=${ROWS} sorted=${direction} selected=${Option.match(selected, {
          onNone: () => "none",
          onSome: (n) => `r${n}`,
        })} w=${nameWidth}`}
      </Readout>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable
          testId="table-sort"
          onClick={() => setDescending((current) => !current)}
          style={{ padding: 4 }}
        >
          <text
            style={{ color: theme.colors.foreground }}
          >{`sort: ${direction}`}</text>
        </Pressable>
      </div>
      <div
        style={{
          display: "flex",
          width: innerWidth,
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          testId="table-header-name"
          style={{
            ...cell,
            borderColor: theme.colors.border,
            width: nameWidth,
            flexShrink: 0,
          }}
        >
          <text style={{ color: theme.colors.mutedForeground }}>name</text>
        </div>
        <div
          testId="col-name-handle"
          style={{
            width: 6,
            flexShrink: 0,
            cursor: "col-resize",
            backgroundColor: theme.colors.border,
            hover: { backgroundColor: theme.colors.primary },
          }}
          onMouseDown={(event) =>
            setPress(Option.some({ x: event.x ?? 0, width: nameWidth }))
          }
          onMouseMove={(event) =>
            Option.match(press, {
              onNone: () => {},
              onSome: (start) =>
                setNameWidth(
                  nextSize({
                    start: start.width,
                    pointerDelta: (event.x ?? 0) - start.x,
                    min: NAME_MIN,
                    max: NAME_MAX,
                  }),
                ),
            })
          }
          onMouseUp={() => setPress(Option.none())}
        />
        <div
          style={{
            ...cell,
            borderColor: theme.colors.border,
            width: STATUS_WIDTH,
            flexShrink: 0,
          }}
        >
          <text style={{ color: theme.colors.mutedForeground }}>status</text>
        </div>
        <div
          style={{
            ...cell,
            borderColor: theme.colors.border,
            width: SIZE_WIDTH,
            flexShrink: 0,
          }}
        >
          <text style={{ color: theme.colors.mutedForeground }}>size</text>
        </div>
      </div>
      <div testId="table-scroll" style={{ height: 220, overflowY: "scroll" }}>
        {Arr.map(shown, (row, index) => (
          <div
            key={row.n}
            testId={index === 0 ? "table-first" : `table-row-${row.n}`}
            tabIndex={0}
            role="row"
            aria-selected={Option.contains(selected, row.n)}
            onClick={() => select(row.n)}
            onKeyDown={(event: EventPayload) => {
              if (event.key === "down") select(Math.min(row.n + 1, ROWS - 1));
              if (event.key === "up") select(Math.max(row.n - 1, 0));
            }}
            style={{
              display: "flex",
              width: innerWidth,
              flexShrink: 0,
              backgroundColor: Option.contains(selected, row.n)
                ? theme.colors.muted
                : theme.colors.background,
              hover: { backgroundColor: theme.colors.muted },
            }}
          >
            <div
              style={{
                ...cell,
                borderColor: theme.colors.border,
                width: nameWidth,
                flexShrink: 0,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>{row.name}</text>
            </div>
            <div
              style={{
                ...cell,
                borderColor: theme.colors.border,
                width: STATUS_WIDTH + 6,
                flexShrink: 0,
              }}
            >
              <text style={{ color: theme.colors.mutedForeground }}>
                {row.n % 3 === 0 ? "ready" : "idle"}
              </text>
            </div>
            <div
              style={{
                ...cell,
                borderColor: theme.colors.border,
                width: SIZE_WIDTH,
                flexShrink: 0,
              }}
            >
              <text
                style={{ color: theme.colors.mutedForeground }}
              >{`${row.n + 1} B`}</text>
            </div>
          </div>
        ))}
      </div>
      <Readout testId="table-note">
        frozen header is not native: the header is a sibling of the scroller
      </Readout>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

export const tableSelectSortScenario: ScenarioBody = {
  view: () => <TableProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "initial table state",
        readout(ctx, "table-readout"),
        "rows=200 sorted=name-asc selected=none",
      );

      // Select and navigate *before* sorting: row 3 is visible in ascending
      // order, but after a descending sort it sits ~4 700px down, outside the
      // 220px scroller, so a click on it would hit nothing (plan `140` §4).
      ctx.host.click("table-row-3");
      yield* ctx.expectContains(
        "row click selected it",
        readout(ctx, "table-readout"),
        "selected=r3",
      );

      ctx.host.key("down");
      yield* ctx.expectContains(
        "down arrow moved the selection",
        readout(ctx, "table-readout"),
        "selected=r4",
      );

      ctx.host.click("table-sort");
      yield* ctx.expectContains(
        "header click changed the sort",
        readout(ctx, "table-readout"),
        "name-desc",
      );
      yield* ctx.expectContains(
        "sort is real: the first row is the last name",
        readout(ctx, "table-first"),
        "Item 199",
      );

      ctx.host.wheel("table-scroll", 0, -200);
      const offset = yield* ctx.expectSome(
        "table scroller reports an offset",
        Option.fromNullishOr(ctx.host.scrollOffset("table-scroll")),
      );
      yield* ctx.expectEqual("wheel scrolled the rows", offset.y < 0, true);
    }),
};

export const tableColumnResizeScenario: ScenarioBody = {
  view: () => <TableProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "column starts at 160",
        readout(ctx, "table-readout"),
        "w=160",
      );

      ctx.host.drag("col-name-handle", 60, 0, 6);
      yield* ctx.expectContains(
        "drag grew the column by 60",
        readout(ctx, "table-readout"),
        "w=220",
      );

      ctx.host.drag("col-name-handle", -600, 0, 6);
      yield* ctx.expectContains(
        "drag clamps at the minimum",
        readout(ctx, "table-readout"),
        "w=120",
      );

      const header = yield* ctx.expectSome(
        "header name cell painted",
        Option.fromNullishOr(ctx.host.bounds("table-header-name")),
      );
      yield* ctx.expectNear(
        "header cell width matches the readout",
        header.width,
        120,
        2,
      );
    }),
};
