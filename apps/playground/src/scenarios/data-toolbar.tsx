/**
 * `data-toolbar` — a data toolbar over a virtual table, with derived cards
 * (plan `377`).
 *
 * Two Tier 3 rows had no runtime evidence: data toolbars and statistic /
 * metric cards. `app-chrome` measured a **shell** toolbar; this probe measures
 * a toolbar whose controls mutate the row set under it, and the aggregates
 * that must follow. It records:
 *
 * - a search/filter/sort that narrows and reorders a `<virtual-list>` and
 *   resets its anchor from component code;
 * - three cards derived from the source, the filtered set and the selection;
 * - column visibility that unpaints a header and its cells;
 * - selection that survives a scroll, clears on a row-set change, and feeds a
 *   bulk archive that removes the selected rows;
 * - `Toolbar`, `TextInput` and `Button` exposure in AccessKit.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import { ariaOf, readoutField, text } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const FRAME_WIDTH = 860;
const CARD_WIDTH = 160;
const CARD_HEIGHT = 64;
const CARD_GAP = 8;
const TOOLBAR_HEIGHT = 40;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 28;
const VIEWPORT_HEIGHT = 360;
const ROW_COUNT = 60;
const NAME_WIDTH = 400;
const STATUS_WIDTH = 200;
const OWNER_WIDTH = 260;
const WHEEL_TO_ROW_30 = -840;

type Status = "active" | "paused" | "archived";
type Sort = "id" | "status";
type Filter = "all" | Status;

interface Row {
  readonly id: number;
  readonly name: string;
  readonly status: Status;
  readonly owner: string;
}

const STATUSES: ReadonlyArray<Status> = ["active", "paused", "archived"];
const OWNERS: ReadonlyArray<string> = ["Ada", "Grace", "Linus"];

const rowAt = (id: number): Row => ({
  id,
  name: `Item ${id}`,
  status: Option.getOrElse(
    Arr.get([...STATUSES], id % Arr.length(STATUSES)),
    () => "active" as const,
  ),
  owner: Option.getOrElse(
    Arr.get([...OWNERS], id % Arr.length(OWNERS)),
    () => "Ada",
  ),
});

const INITIAL_ROWS: ReadonlyArray<Row> = Arr.map(
  Arr.range(0, ROW_COUNT - 1),
  rowAt,
);

/** The rows a search and a status filter keep. */
const matching = (
  rows: ReadonlyArray<Row>,
  query: string,
  filter: Filter,
): ReadonlyArray<Row> => {
  const needle = Str.toLowerCase(query);
  return Arr.filter(
    rows,
    (row) =>
      (filter === "all" || row.status === filter) &&
      (Str.isEmpty(needle) || Str.includes(needle)(Str.toLowerCase(row.name))),
  );
};

/**
 * The order the table paints: id ascending, or status **descending** so the
 * paused rows come first (the reorder a check can see).
 */
const ordered = (rows: ReadonlyArray<Row>, sort: Sort): ReadonlyArray<Row> =>
  Arr.sort(
    rows,
    sort === "id"
      ? Order.mapInput(Order.Number, (row: Row) => row.id)
      : Order.mapInput(Order.flip(Order.String), (row: Row) => row.status),
  );

/** A metric card: a muted label over a large value. */
const MetricCard = ({
  id,
  label,
  value,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={`tb-card-${id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        paddingLeft: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      <text
        testId={`tb-card-${id}-label`}
        style={{ fontSize: 11, color: theme.colors.mutedForeground }}
      >
        {label}
      </text>
      <text
        testId={`tb-card-${id}-value`}
        style={{ fontSize: 20, color: theme.colors.foreground }}
      >
        {`${value}`}
      </text>
    </div>
  );
};

const DataToolbarProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [rows, setRows] = useState<ReadonlyArray<Row>>(INITIAL_ROWS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("id");
  const [statusColumn, setStatusColumn] = useState(true);
  const [ownerColumn, setOwnerColumn] = useState(true);
  const [selected, setSelected] = useState<ReadonlyArray<number>>([]);
  const [archived, setArchived] = useState(0);
  const [anchor, setAnchor] = useState(0);

  const visible = ordered(matching(rows, query, filter), sort);

  /** The list's post-scroll anchor; the range payload lags a gesture (`300`). */
  const syncAnchor = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getListScrollTop?.(id)), {
          onNone: () => {},
          onSome: (value) => setAnchor(value[0] ?? 0),
        }),
    });
  };

  /**
   * The toolbar's anchor rule: a row-set change starts at the first row.
   *
   * The renderer resets its own anchor when a filtered re-render shrinks the
   * list, but it does not report that through `onVisibleRange`; an app-owned
   * readout would stay stale. The explicit `scrollToItem` makes the reset
   * deterministic and the state mirror is what keeps the readout honest.
   */
  const scrollTop = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, 0),
    });
    setAnchor(0);
  };

  /** Apply a row-set change, drop a now-stale selection and reset the anchor. */
  const changeView = (change: () => void): void => {
    change();
    setSelected([]);
    scrollTop();
  };

  const chooseFilter = (next: Filter): void => {
    if (filter !== next) changeView(() => setFilter(next));
  };

  const toggleSort = (): void => {
    changeView(() =>
      setSort((current) => (current === "id" ? "status" : "id")),
    );
  };

  const toggleRow = (id: number): void => {
    setSelected((current) =>
      Arr.contains(current, id)
        ? Arr.filter(current, (value) => value !== id)
        : Arr.append(current, id),
    );
  };

  const archive = (): void => {
    if (Arr.length(selected) === 0) return;
    const removed = selected;
    setRows((current) =>
      Arr.filter(current, (row) => !Arr.contains(removed, row.id)),
    );
    setArchived((current) => current + Arr.length(removed));
    setSelected([]);
  };

  const clear = (): void => {
    setQuery("");
    setFilter("all");
    setSort("id");
    setStatusColumn(true);
    setOwnerColumn(true);
    setSelected([]);
    scrollTop();
  };

  const field = {
    height: 26,
    width: 200,
    paddingLeft: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.inputForeground,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  };

  return (
    <div
      testId="tb-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: CARD_GAP,
        width: FRAME_WIDTH,
      }}
    >
      <div testId="tb-cards" style={{ display: "flex", gap: CARD_GAP }}>
        <MetricCard id="total" label="Total" value={Arr.length(rows)} />
        <MetricCard id="showing" label="Showing" value={Arr.length(visible)} />
        <MetricCard
          id="selected"
          label="Selected"
          value={Arr.length(selected)}
        />
      </div>

      <div
        testId="tb-toolbar"
        aria-id="tb-toolbar"
        aria-label="Data toolbar"
        role="toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: TOOLBAR_HEIGHT,
          paddingLeft: 4,
          backgroundColor: theme.colors.muted,
        }}
      >
        <input
          testId="tb-search"
          value={query}
          aria-id="tb-search"
          aria-label="Search"
          placeholder="search"
          onChange={(event) => changeView(() => setQuery(event.value ?? ""))}
          style={field}
        />
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["paused", "Paused"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            testId={`tb-filter-${value}`}
            onClick={() => chooseFilter(value)}
            style={{
              height: 26,
              padding: 0,
              paddingLeft: 8,
              paddingRight: 8,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                filter === value ? theme.colors.accent : theme.colors.muted,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {label}
            </text>
          </Pressable>
        ))}
        <Pressable
          testId="tb-sort"
          onClick={toggleSort}
          style={{ height: 26, padding: 0, paddingLeft: 8, paddingRight: 8 }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            {`sort: ${sort}`}
          </text>
        </Pressable>
        <Pressable
          testId="tb-cols-status"
          onClick={() => setStatusColumn((current) => !current)}
          style={{ height: 26, padding: 0, paddingLeft: 8, paddingRight: 8 }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            {`status: ${statusColumn ? "on" : "off"}`}
          </text>
        </Pressable>
        <Pressable
          testId="tb-cols-owner"
          onClick={() => setOwnerColumn((current) => !current)}
          style={{ height: 26, padding: 0, paddingLeft: 8, paddingRight: 8 }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            {`owner: ${ownerColumn ? "on" : "off"}`}
          </text>
        </Pressable>
        <Pressable
          testId="tb-clear"
          onClick={clear}
          style={{ height: 26, padding: 0, paddingLeft: 8, paddingRight: 8 }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            clear
          </text>
        </Pressable>
        <text
          testId="tb-selection"
          style={{ fontSize: 11, color: theme.colors.mutedForeground }}
        >
          {`selected=${Arr.length(selected)}`}
        </text>
        <Pressable
          testId="tb-archive"
          onClick={archive}
          style={{ height: 26, padding: 0, paddingLeft: 8, paddingRight: 8 }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            archive
          </text>
        </Pressable>
      </div>

      <div
        testId="tb-header"
        style={{
          display: "flex",
          height: HEADER_HEIGHT,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <div
          testId="tb-head-name"
          style={{
            width: NAME_WIDTH,
            justifyContent: "center",
            paddingLeft: 8,
          }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            Name
          </text>
        </div>
        {statusColumn ? (
          <div
            testId="tb-head-status"
            style={{
              width: STATUS_WIDTH,
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              Status
            </text>
          </div>
        ) : null}
        {ownerColumn ? (
          <div
            testId="tb-head-owner"
            style={{
              width: OWNER_WIDTH,
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              Owner
            </text>
          </div>
        ) : null}
      </div>

      <div
        testId="tb-viewport"
        style={{ width: FRAME_WIDTH, height: VIEWPORT_HEIGHT }}
      >
        <virtual-list
          testId="tb-list"
          ref={list}
          estimatedItemHeight={ROW_HEIGHT}
          onVisibleRange={syncAnchor}
          style={{ width: FRAME_WIDTH, height: VIEWPORT_HEIGHT }}
        >
          {Arr.map(visible, (row) => (
            <div
              key={row.id}
              testId={`tb-row-${row.id}`}
              role="row"
              aria-selected={Arr.contains(selected, row.id)}
              onClick={() => toggleRow(row.id)}
              style={{
                display: "flex",
                height: ROW_HEIGHT,
                flexShrink: 0,
                backgroundColor: Arr.contains(selected, row.id)
                  ? theme.colors.accent
                  : theme.colors.background,
                borderWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
                hover: { backgroundColor: theme.colors.muted },
              }}
            >
              <div
                testId={`tb-row-${row.id}-name`}
                style={{
                  width: NAME_WIDTH,
                  justifyContent: "center",
                  paddingLeft: 8,
                }}
              >
                <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                  {row.name}
                </text>
              </div>
              {statusColumn ? (
                <div
                  testId={`tb-row-${row.id}-status`}
                  style={{
                    width: STATUS_WIDTH,
                    justifyContent: "center",
                    paddingLeft: 8,
                  }}
                >
                  <text
                    style={{ fontSize: 12, color: theme.colors.foreground }}
                  >
                    {row.status}
                  </text>
                </div>
              ) : null}
              {ownerColumn ? (
                <div
                  testId={`tb-row-${row.id}-owner`}
                  style={{
                    width: OWNER_WIDTH,
                    justifyContent: "center",
                    paddingLeft: 8,
                  }}
                >
                  <text
                    style={{ fontSize: 12, color: theme.colors.foreground }}
                  >
                    {row.owner}
                  </text>
                </div>
              ) : null}
            </div>
          ))}
        </virtual-list>
      </div>

      <Readout testId="tb-state">
        {`total=${Arr.length(rows)} showing=${Arr.length(visible)} selected=${Arr.length(selected)} sort=${sort} filter=${filter} cols=${Arr.join(
          Arr.filter(
            [statusColumn ? "status" : "", ownerColumn ? "owner" : ""],
            (value) => value !== "",
          ),
          ",",
        )} archived=${archived} anchor=${anchor}`}
      </Readout>
    </div>
  );
};

/** A `key=value` field of the state readout, or `"none"`. */
const stateField = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "tb-state", key), () => "none");

/** A value text, or `"none"` when the card never painted. */
const cardValue = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text(`tb-card-${id}-value`)),
    () => "none",
  );

/** The list's anchor index, or `-1` when it never reported one. */
const anchorIndex = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.listScrollTop("tb-list")),
      (anchor) => anchor[0],
    ),
    () => -1,
  );

/** A painted row's box, or `None` when it never painted. */
const row = (ctx: Smoke.SmokeContext, id: number) =>
  Option.fromNullishOr(ctx.host.bounds(`tb-row-${id}`));

/** Whether the painted text contains `needle` on any line. */
const paints = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Arr.some(ctx.host.paintedText(), Str.includes(needle));

/** The background of a painted element, or `None` when it has no style. */
const background = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (style) => style.backgroundColor,
  );

export const dataToolbarScenario: PlaygroundScenario = {
  id: "data-toolbar",
  title: "Data toolbar: search, filter, sort, columns, selection and cards",
  capability: "data-toolbar",
  view: () => <DataToolbarProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // Cards, toolbar and table geometry.
      const card = yield* ctx.expectSome(
        "the total card paints",
        Option.fromNullishOr(ctx.host.bounds("tb-card-total")),
      );
      // 0.10.0 excludes the 1 px borders (plan 529 §6.3).
      yield* ctx.expectNear(
        "the cards are 158 px inside their borders",
        card.width,
        158,
        1,
      );
      yield* ctx.expectNear(
        "the cards are 62 px inside their borders",
        card.height,
        62,
        1,
      );
      const toolbar = yield* ctx.expectSome(
        "the toolbar paints",
        Option.fromNullishOr(ctx.host.bounds("tb-toolbar")),
      );
      yield* ctx.expectNear("the toolbar is 40 px tall", toolbar.height, 40, 1);
      yield* ctx.expectNear(
        "the toolbar sits under the cards",
        toolbar.y,
        card.y + 64 + CARD_GAP,
        1,
      );
      const viewport = yield* ctx.expectSome(
        "the table viewport paints",
        Option.fromNullishOr(ctx.host.bounds("tb-viewport")),
      );
      const first = yield* ctx.expectSome("the first row paints", row(ctx, 0));
      yield* ctx.expectNear(
        "the first row starts at the viewport top",
        first.y,
        viewport.y,
        1,
      );
      yield* ctx.expectEqual(
        "the cards start at the source counts",
        `${cardValue(ctx, "total")}:${cardValue(ctx, "showing")}:${cardValue(ctx, "selected")}`,
        "60:60:0",
      );
      yield* ctx.expectEqual(
        "the state starts at the default view",
        stateField(ctx, "total") +
          ":" +
          stateField(ctx, "showing") +
          ":" +
          stateField(ctx, "sort") +
          ":" +
          stateField(ctx, "filter") +
          ":" +
          stateField(ctx, "cols"),
        "60:60:id:all:status,owner",
      );
      yield* ctx.expectSome(
        "the header paints its cells",
        Option.fromNullishOr(ctx.host.bounds("tb-head-name")),
      );

      // Sort: status descending puts a paused row first.
      ctx.host.click("tb-sort");
      yield* ctx.expectEqual(
        "the sort toggles to status",
        stateField(ctx, "sort"),
        "status",
      );
      const pausedFirst = yield* ctx.expectSome(
        "the paused row paints after the sort",
        row(ctx, 1),
      );
      yield* ctx.expectNear(
        "status sort moves a paused row to the top",
        pausedFirst.y,
        viewport.y,
        1,
      );
      const activeAfter = row(ctx, 0);
      yield* ctx.expectEqual(
        "the sorted first row is no longer id 0",
        Option.isNone(activeAfter),
        true,
      );
      ctx.host.click("tb-sort");
      yield* ctx.expectEqual(
        "a second click restores the id order",
        stateField(ctx, "sort"),
        "id",
      );
      const firstAgain = yield* ctx.expectSome(
        "row 0 paints again",
        row(ctx, 0),
      );
      yield* ctx.expectNear(
        "the id order puts row 0 first",
        firstAgain.y,
        viewport.y,
        1,
      );

      // Filter: only paused rows, and the cards follow.
      ctx.host.click("tb-filter-paused");
      yield* ctx.expectEqual(
        "the paused filter narrows the rows",
        stateField(ctx, "showing"),
        "20",
      );
      yield* ctx.expectEqual(
        "the showing card follows the filter",
        cardValue(ctx, "showing"),
        "20",
      );
      yield* ctx.expectEqual(
        "an active row is unpainted",
        Option.isNone(row(ctx, 0)),
        true,
      );
      yield* ctx.expectSome("a paused row is painted", row(ctx, 1));
      yield* ctx.expectEqual(
        "an archived row is unpainted",
        Option.isNone(row(ctx, 2)),
        true,
      );
      ctx.host.click("tb-filter-all");
      yield* ctx.expectEqual(
        "the all filter restores every row",
        stateField(ctx, "showing"),
        "60",
      );

      // Search: narrow to the rows whose name contains "item 1".
      ctx.host.click("tb-search");
      ctx.host.key("i t e m space 1");
      yield* ctx.expectEqual(
        "the search narrows to eleven rows",
        stateField(ctx, "showing"),
        "11",
      );
      yield* ctx.expectEqual(
        "the showing card follows the search",
        cardValue(ctx, "showing"),
        "11",
      );
      const searchedFirst = yield* ctx.expectSome(
        "the first match paints",
        row(ctx, 1),
      );
      yield* ctx.expectNear(
        "the first match is at the top",
        searchedFirst.y,
        viewport.y,
        1,
      );
      yield* ctx.expectEqual(
        "a non-matching row is unpainted",
        Option.isNone(row(ctx, 0)),
        true,
      );

      // The anchor: a filter after a wheel returns the list to the top.
      ctx.host.click("tb-clear");
      yield* ctx.expectEqual(
        "clear restores the default view",
        `${stateField(ctx, "showing")}:${stateField(ctx, "filter")}:${stateField(ctx, "sort")}:${stateField(ctx, "cols")}`,
        "60:all:id:status,owner",
      );
      ctx.host.wheel("tb-viewport", 0, WHEEL_TO_ROW_30);
      yield* ctx.expectEqual(
        "the wheel moves the table to row 30",
        anchorIndex(ctx),
        30,
      );
      ctx.host.click("tb-filter-paused");
      yield* ctx.expectEqual(
        "a filter resets the list anchor",
        anchorIndex(ctx),
        0,
      );
      yield* ctx.expectEqual(
        "the reset reaches the readout",
        stateField(ctx, "anchor"),
        "0",
      );
      const resetFirst = yield* ctx.expectSome(
        "the filtered first row paints after the reset",
        row(ctx, 1),
      );
      yield* ctx.expectNear(
        "the reset puts the filtered first row at the top",
        resetFirst.y,
        viewport.y,
        1,
      );
      ctx.host.click("tb-clear");

      // Columns: hiding one unpaints its header and cells.
      ctx.host.click("tb-clear");
      ctx.host.click("tb-cols-owner");
      yield* ctx.expectEqual(
        "the owner column leaves the state",
        stateField(ctx, "cols"),
        "status",
      );
      yield* ctx.expectEqual(
        "the owner header is unpainted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("tb-head-owner"))),
        true,
      );
      yield* ctx.expectEqual(
        "an owner cell is unpainted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("tb-row-0-owner"))),
        true,
      );
      yield* ctx.expectSome(
        "the name cell still paints",
        Option.fromNullishOr(ctx.host.bounds("tb-row-0-name")),
      );
      ctx.host.click("tb-cols-owner");
      yield* ctx.expectEqual(
        "toggling the owner column restores it",
        stateField(ctx, "cols"),
        "status,owner",
      );

      // Selection: two rows, a paint, and survival across a scroll.
      ctx.host.click("tb-row-2");
      ctx.host.click("tb-row-5");
      yield* ctx.expectEqual(
        "two rows are selected",
        stateField(ctx, "selected"),
        "2",
      );
      yield* ctx.expectEqual(
        "the selected card follows",
        cardValue(ctx, "selected"),
        "2",
      );
      yield* ctx.expectEqual(
        "a selected row paints the accent",
        Option.getOrElse(background(ctx, "tb-row-2"), () => "none"),
        palettes.dark.colors.accent,
      );
      ctx.host.wheel("tb-viewport", 0, WHEEL_TO_ROW_30);
      yield* ctx.expectEqual(
        "the scroll does not clear the selection",
        stateField(ctx, "selected"),
        "2",
      );
      ctx.host.wheel("tb-viewport", 0, -WHEEL_TO_ROW_30);
      yield* ctx.expectEqual(
        "the selection survives the scroll back",
        stateField(ctx, "selected"),
        "2",
      );
      yield* ctx.expectEqual(
        "the selected row still paints the accent",
        Option.getOrElse(background(ctx, "tb-row-2"), () => "none"),
        palettes.dark.colors.accent,
      );

      // A row-set change clears a stale selection.
      ctx.host.click("tb-filter-active");
      yield* ctx.expectEqual(
        "a filter clears the selection",
        stateField(ctx, "selected"),
        "0",
      );
      yield* ctx.expectEqual(
        "the selected card returns to zero",
        cardValue(ctx, "selected"),
        "0",
      );
      ctx.host.click("tb-clear");

      // The bulk action removes the selected rows and moves the cards.
      ctx.host.click("tb-row-2");
      ctx.host.click("tb-row-5");
      ctx.host.click("tb-archive");
      yield* ctx.expectEqual(
        "archive removes the selected rows",
        stateField(ctx, "total") + ":" + stateField(ctx, "selected"),
        "58:0",
      );
      yield* ctx.expectEqual(
        "archive counts what it removed",
        stateField(ctx, "archived"),
        "2",
      );
      yield* ctx.expectEqual(
        "archive updates the total card",
        cardValue(ctx, "total"),
        "58",
      );
      yield* ctx.expectEqual(
        "archive updates the showing card",
        cardValue(ctx, "showing"),
        "58",
      );
      yield* ctx.expectEqual(
        "an archived row stops painting",
        paints(ctx, "Item 5"),
        false,
      );
      yield* ctx.expectEqual(
        "the rest of the table still paints",
        paints(ctx, "Item 6"),
        true,
      );

      // Clear resets the view but keeps the archive.
      ctx.host.click("tb-clear");
      yield* ctx.expectEqual(
        "clear resets query, filter, sort and columns",
        `${stateField(ctx, "showing")}:${stateField(ctx, "filter")}:${stateField(ctx, "sort")}:${stateField(ctx, "cols")}:${stateField(ctx, "selected")}`,
        "58:all:id:status,owner:0",
      );
      yield* ctx.expectEqual(
        "clear keeps the archived rows out",
        stateField(ctx, "archived"),
        "2",
      );

      // Accessibility: the toolbar, its search field and one control.
      const toolbarNode = yield* ctx.expectSome(
        "the toolbar is exposed to assistive technology",
        ariaOf(ctx, "tb-toolbar"),
      );
      yield* ctx.expectEqual(
        "the toolbar is a named Toolbar",
        `${text(toolbarNode.role)}:${text(toolbarNode.label)}`,
        "Toolbar:Data toolbar",
      );
      const searchNode = yield* ctx.expectSome(
        "the search field is exposed to assistive technology",
        ariaOf(ctx, "tb-search"),
      );
      yield* ctx.expectEqual(
        "the search field is a named TextInput",
        `${text(searchNode.role)}:${text(searchNode.label)}`,
        "TextInput:Search",
      );
    }),
};
