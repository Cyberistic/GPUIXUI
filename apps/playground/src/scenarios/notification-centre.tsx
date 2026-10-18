/**
 * `notification-centre` — a Tier 5 composition: bell → non-modal panel →
 * newest-first virtual list → live arrivals (plan `381`).
 *
 * Every ingredient is measured elsewhere; this probe answers the centre's own
 * questions. The important one is the **prepend**: a new notification arrives
 * above the reader, and the rows under their eyes must not move. The component
 * keeps the top row's **identity** across the insertion and re-anchors the list
 * to it with `renderer.scrollToItem`; a constant-height offset would be wrong
 * the moment a 24 px group header is above the 60 px rows.
 *
 * It records:
 *
 * - a non-modal `<anchored side="bottom" align="end">` panel whose trigger is a
 *   **sibling**, so a press inside cannot bubble to the bell's toggle;
 * - mixed row heights (24 px group headers, 60 px notifications) in one
 *   `<virtual-list>`, with `getListScrollTop` read inside `onVisibleRange`;
 * - a derived unread count and a badge that does not paint at zero;
 * - roving keyboard selection, Enter to mark read, and Escape returning native
 *   focus to the bell;
 * - an outside press that dismisses without stealing focus back;
 * - an empty state after clear-all and a later arrival that restores the list.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import {
  initialNotifications,
  newNotification,
  rowIndex,
  rowsOf,
  unreadCount,
} from "./notification-model.js";
import type { Notification, Row } from "./notification-model.js";
import { node, read, readoutField, treeOf } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const FRAME_WIDTH = 760;
const FRAME_HEIGHT = 460;
const BAR_HEIGHT = 52;
const BELL_SIZE = 36;
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 360;
const PANEL_HEADER = 44;
const LIST_HEIGHT = 280;
const PANEL_FOOTER = 36;
const HEADER_ROW = 24;
const NOTIFICATION_ROW = 60;
const GAP = 8;

const buttonStyle = {
  height: 24,
  padding: 0,
  paddingLeft: 6,
  paddingRight: 6,
  alignItems: "center",
  justifyContent: "center",
} as const;

/** The notification ids in the visual order the arrows walk. */
const orderedIds = (rows: ReadonlyArray<Row>): ReadonlyArray<number> =>
  Arr.getSomes(
    Arr.map(rows, (row) =>
      row.kind === "notification" ? Option.some(row.item.id) : Option.none(),
    ),
  );

/** The first notification's id, or `None` when the list is empty. */
const firstId = (rows: ReadonlyArray<Row>): Option.Option<number> =>
  Arr.head(orderedIds(rows));

/** One group header row. */
const GroupHeader = ({ label, testId }: { readonly label: string; readonly testId: string }) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{
        display: "flex",
        height: HEADER_ROW,
        alignItems: "center",
        paddingLeft: 12,
        backgroundColor: theme.colors.muted,
      }}
    >
      <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
        {label}
      </text>
    </div>
  );
};

const NotificationCentreProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const bell = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReadonlyArray<Notification>>(
    initialNotifications,
  );
  const [active, setActive] = useState<Option.Option<number>>(Option.none());
  const [anchor, setAnchor] = useState(0);
  const [top, setTop] = useState("none");
  const [inserts, setInserts] = useState(0);
  const nextId = useRef(7);

  const rows = rowsOf(items);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const anchorRef = useRef(0);
  const topKeyRef = useRef("none");
  const pendingTop = useRef<Option.Option<string>>(Option.none());

  const unread = unreadCount(items);

  /** The live anchor, read from the renderer; the payload lags a gesture. */
  const syncAnchor = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => {
        Option.match(Option.fromNullishOr(renderer?.getListScrollTop?.(id)), {
          onNone: () => {},
          onSome: (value) => {
            const index = value[0] ?? 0;
            const key = rowsRef.current[index]?.key ?? "none";
            anchorRef.current = index;
            topKeyRef.current = key;
            setAnchor(index);
            setTop(key);
          },
        });
      },
    });
  };

  /** Scroll the list to a row index (the app-owned re-anchor). */
  const scrollToRow = (index: number): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => {
        renderer?.scrollToItem?.(id, index);
        syncAnchor();
      },
    });
  };

  /** A reader scrolled below the top keeps the row they were reading. */
  useEffect(() => {
    Option.match(pendingTop.current, {
      onNone: () => {},
      onSome: (key) => {
        pendingTop.current = Option.none();
        Option.match(rowIndex(rowsRef.current, key), {
          onNone: () => {},
          onSome: scrollToRow,
        });
      },
    });
  }, [items.length]);

  const markRead = (id: number): void => {
    setItems((current) =>
      Arr.map(current, (item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  };

  const markAll = (): void => {
    setItems((current) => Arr.map(current, (item) => ({ ...item, read: true })));
  };

  const clearAll = (): void => {
    setItems([]);
    anchorRef.current = 0;
    topKeyRef.current = "none";
    setAnchor(0);
    setTop("none");
    setActive(Option.none());
  };

  const arrive = (): void => {
    const keep =
      open && anchorRef.current > 0
        ? Option.some(topKeyRef.current)
        : Option.none();
    pendingTop.current = keep;
    const id = nextId.current;
    nextId.current += 1;
    setItems((current) => Arr.prepend(current, newNotification(id)));
    setInserts((current) => current + 1);
  };

  const openPanel = (): void => {
    setOpen(true);
    setActive(firstId(rows));
    anchorRef.current = 0;
    topKeyRef.current = "none";
    setAnchor(0);
    setTop("none");
  };

  const close = (reason: "toggle" | "escape" | "outside"): void => {
    setOpen(false);
    setActive(Option.none());
    if (reason === "outside") return;
    Option.match(Option.fromNullishOr(bell.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  const move = (delta: number): void => {
    Arr.match(orderedIds(rows), {
      onEmpty: () => {},
      onNonEmpty: (values) => {
        const current = Option.flatMap(active, (id) =>
          Arr.findFirstIndex(values, (candidate) => candidate === id),
        );
        const start = Option.getOrElse(current, () => (delta > 0 ? -1 : 0));
        const next = Math.min(
          Math.max(start + delta, 0),
          Arr.length(values) - 1,
        );
        setActive(Arr.get(values, next));
      },
    });
  };

  const onPanelKey = (event: EventPayload): void => {
    if (event.key === "down") move(1);
    if (event.key === "up") move(-1);
    if (event.key === "enter")
      Option.match(active, { onNone: () => {}, onSome: markRead });
    if (event.key === "escape") close("escape");
  };

  const badge = (): ReactNode =>
    unread > 0 ? (
      <div
        testId="nc-badge"
        style={{
          position: "absolute",
          left: 22,
          top: -2,
          width: 16,
          height: 16,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.destructive,
        }}
      >
        <text
          style={{ fontSize: 9, color: theme.colors.destructiveForeground }}
        >
          {`${unread}`}
        </text>
      </div>
    ) : null;

  const row = (item: Notification) => (
    <div
      key={`n:${item.id}`}
      testId={`nc-row-${item.id}`}
      role="button"
      aria-label={`${item.title}, ${item.read ? "read" : "unread"}`}
      onClick={() => {
        setActive(Option.some(item.id));
        markRead(item.id);
      }}
      style={{
        display: "flex",
        height: NOTIFICATION_ROW,
        flexShrink: 0,
        alignItems: "center",
        gap: 8,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: Option.contains(active, item.id)
          ? theme.colors.accent
          : theme.colors.popover,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        hover: { backgroundColor: theme.colors.muted },
      }}
    >
      <div
        style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <text style={{ fontSize: 12, color: theme.colors.foreground }}>
          {item.title}
        </text>
        <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
          {item.body}
        </text>
        <text style={{ fontSize: 9, color: theme.colors.mutedForeground }}>
          {item.age}
        </text>
      </div>
      {item.read ? null : (
        <div
          testId={`nc-dot-${item.id}`}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.accent,
          }}
        />
      )}
    </div>
  );

  const panel = (
    <div
      testId="nc-panel"
      tabIndex={0}
      autoFocus
      role="region"
      aria-label="Notifications"
      onMouseDownOutside={() => close("outside")}
      onKeyDown={onPanelKey}
      style={{
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.popover,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
      }}
    >
      <div
        testId="nc-panel-header"
        style={{
          display: "flex",
          height: PANEL_HEADER,
          flexShrink: 0,
          alignItems: "center",
          gap: 4,
          paddingLeft: 12,
          paddingRight: 8,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <text style={{ fontSize: 12, color: theme.colors.foreground }}>
          Notifications
        </text>
        <div style={{ flexGrow: 1 }} />
        <Pressable testId="nc-mark-all" onClick={markAll} style={buttonStyle}>
          <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
            mark all read
          </text>
        </Pressable>
        <Pressable testId="nc-clear" onClick={clearAll} style={buttonStyle}>
          <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
            clear
          </text>
        </Pressable>
        <Pressable
          testId="nc-close"
          onClick={() => close("toggle")}
          style={buttonStyle}
        >
          <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
            close
          </text>
        </Pressable>
      </div>

      <div testId="nc-listview" style={{ width: PANEL_WIDTH, height: LIST_HEIGHT }}>
        {Arr.match(rows, {
          onEmpty: () => (
            <div
              testId="nc-empty"
              style={{
                width: PANEL_WIDTH,
                height: LIST_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                You're all caught up
              </text>
            </div>
          ),
          onNonEmpty: (listRows) => (
            <virtual-list
              testId="nc-list"
              ref={list}
              estimatedItemHeight={48}
              onVisibleRange={syncAnchor}
              style={{ width: PANEL_WIDTH, height: LIST_HEIGHT }}
            >
              {Arr.map(listRows, (listRow) =>
                listRow.kind === "header" ? (
                  <GroupHeader
                    key={listRow.key}
                    label={listRow.label}
                    testId={`nc-head-${listRow.key === "h:today" ? "today" : "earlier"}`}
                  />
                ) : (
                  row(listRow.item)
                ),
              )}
            </virtual-list>
          ),
        })}
      </div>

      <div
        testId="nc-panel-footer"
        style={{
          display: "flex",
          height: PANEL_FOOTER,
          flexShrink: 0,
          alignItems: "center",
          gap: 8,
          paddingLeft: 12,
          paddingRight: 8,
          borderTopWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <Pressable testId="nc-simulate" onClick={arrive} style={buttonStyle}>
          <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
            simulate arrival
          </text>
        </Pressable>
        <div style={{ flexGrow: 1 }} />
        <text style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
          {`unread ${unread}`}
        </text>
      </div>
    </div>
  );

  return (
    <div
      testId="nc-frame"
      style={{
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="nc-bar"
        style={{
          display: "flex",
          height: BAR_HEIGHT,
          flexShrink: 0,
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: theme.colors.card,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <text style={{ fontSize: 13, color: theme.colors.foreground }}>
          Notifications demo
        </text>
        <div style={{ flexGrow: 1 }} />
        <div
          testId="nc-bellwrap"
          style={{ width: BELL_SIZE, height: BELL_SIZE, position: "relative" }}
        >
          <div
            testId="nc-bell"
            ref={bell}
            tabIndex={0}
            role="button"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => (open ? close("toggle") : openPanel())}
            onKeyDown={(event) => {
              if (event.key === "enter")
                open ? close("toggle") : openPanel();
            }}
            style={{
              width: BELL_SIZE,
              height: BELL_SIZE,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: BELL_SIZE / 2,
              cursor: "pointer",
              backgroundColor: theme.colors.muted,
              hover: { backgroundColor: theme.colors.border },
            }}
          >
            <text style={{ fontSize: 13, color: theme.colors.foreground }}>
              bell
            </text>
            {badge()}
          </div>
          {open ? (
            <anchored
              deferred
              side="bottom"
              align="end"
              gap={GAP}
              priority={2}
              occlude
            >
              {panel}
            </anchored>
          ) : null}
        </div>
      </div>

      <div
        testId="nc-body"
        style={{ flexGrow: 1, padding: 16, gap: 12, display: "flex", flexDirection: "column" }}
      >
        <div testId="nc-content" style={{ height: 120, backgroundColor: theme.colors.muted }}>
          <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
            mock application content
          </text>
        </div>
        <Pressable testId="nc-arrive" onClick={arrive}>
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            simulate arrival
          </text>
        </Pressable>
        <Readout testId="nc-state">
          {`open=${open} unread=${unread} items=${Arr.length(items)} anchor=${anchor} top=${top} active=${Option.getOrElse(
            Option.map(active, (id) => `n:${id}`),
            () => "none",
          )} inserts=${inserts}`}
        </Readout>
      </div>
    </div>
  );
};

/** A `key=value` field of the state readout, or `"none"`. */
const stateField = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "nc-state", key), () => "none");

/** A painted row's box, or `None` when it never painted. */
const rowBox = (ctx: Smoke.SmokeContext, id: number) =>
  Option.fromNullishOr(ctx.host.bounds(`nc-row-${id}`));

/** The list's anchor index, or `-1` when it never reported one. */
const anchorIndex = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.listScrollTop("nc-list")),
      (value) => value[0],
    ),
    () => -1,
  );

export const notificationCentreScenario: PlaygroundScenario = {
  id: "notification-centre",
  title: "Notification centre: unread state, keyboard and prepend-stable scrolling",
  capability: "notification",
  view: () => <NotificationCentreProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. A closed centre: a badge and a label, no panel.
      const bell = yield* ctx.expectSome(
        "the bell paints",
        Option.fromNullishOr(ctx.host.bounds("nc-bell")),
      );
      yield* ctx.expectNear("the bell is 36 px wide", bell.width, 36, 1);
      yield* ctx.expectEqual("the badge counts unread", read(ctx, "nc-badge"), "3");
      yield* ctx.expectEqual(
        "the panel does not paint while closed",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-panel"))),
        true,
      );
      yield* ctx.expectContains(
        "the state starts closed with three unread",
        read(ctx, "nc-state"),
        "open=false unread=3 items=6",
      );
      const closedTree = yield* treeOf(ctx);
      yield* node(ctx, closedTree, "Button", "Notifications, 3 unread");

      // 2. Opening anchors the panel under the bell and focuses it.
      ctx.host.click("nc-bell");
      yield* ctx.expectEqual(
        "the click opens the panel",
        stateField(ctx, "open"),
        "true",
      );
      const panel = yield* ctx.expectSome(
        "the panel paints",
        Option.fromNullishOr(ctx.host.bounds("nc-panel")),
      );
      yield* ctx.expectNear("the panel is 320 px wide", panel.width, 320, 1);
      yield* ctx.expectNear("the panel is 360 px tall", panel.height, 360, 1);
      yield* ctx.expectNear(
        "the panel's right edge meets the bell's",
        panel.x + panel.width,
        bell.x + bell.width,
        1,
      );
      yield* ctx.expectNear(
        "the panel starts 8 px under the bell",
        panel.y,
        bell.y + bell.height + GAP,
        1,
      );
      yield* ctx.expectEqual(
        "opening focuses the panel",
        Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none"),
        "nc-panel",
      );
      yield* ctx.expectEqual(
        "opening does not mark read",
        stateField(ctx, "unread"),
        "3",
      );
      const listView = yield* ctx.expectSome(
        "the list viewport paints",
        Option.fromNullishOr(ctx.host.bounds("nc-listview")),
      );
      yield* ctx.expectNear("the list viewport is 280 px tall", listView.height, 280, 1);
      const today = yield* ctx.expectSome(
        "the Today header paints",
        Option.fromNullishOr(ctx.host.bounds("nc-head-today")),
      );
      yield* ctx.expectNear("the header row is 24 px", today.height, HEADER_ROW, 1);
      yield* ctx.expectNear("the header starts at the viewport top", today.y, listView.y, 1);
      const first = yield* ctx.expectSome("the newest row paints", rowBox(ctx, 6));
      yield* ctx.expectNear(
        "the first notification starts under the header",
        first.y,
        listView.y + HEADER_ROW,
        1,
      );
      yield* ctx.expectNear("a notification row is 60 px", first.height, NOTIFICATION_ROW, 1);
      yield* ctx.expectSome(
        "the Earlier header paints",
        Option.fromNullishOr(ctx.host.bounds("nc-head-earlier")),
      );
      yield* ctx.expectSome(
        "unread row 6 paints a dot",
        Option.fromNullishOr(ctx.host.bounds("nc-dot-6")),
      );
      yield* ctx.expectEqual(
        "read row 5 paints no dot",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-dot-5"))),
        true,
      );
      const openTree = yield* treeOf(ctx);
      yield* node(ctx, openTree, "Region", "Notifications");
      yield* node(ctx, openTree, "Button", "Build finished, unread");

      // 3. Arrows move the active row; Enter marks it read.
      yield* ctx.expectEqual("the first row starts active", stateField(ctx, "active"), "n:6");
      ctx.host.key("down");
      yield* ctx.expectEqual("Down moves the active row", stateField(ctx, "active"), "n:5");
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "a second Down reaches the next unread row",
        stateField(ctx, "active"),
        "n:4",
      );
      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "Enter marks the active row read",
        stateField(ctx, "unread"),
        "2",
      );
      yield* ctx.expectEqual(
        "the badge follows the read",
        read(ctx, "nc-badge"),
        "2",
      );
      yield* ctx.expectEqual(
        "the read row paints no dot",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-dot-4"))),
        true,
      );
      ctx.host.key("up");
      yield* ctx.expectEqual("Up walks back", stateField(ctx, "active"), "n:5");

      // 4. A row click marks read once and keeps the panel open.
      ctx.host.click("nc-row-6");
      yield* ctx.expectEqual(
        "a row click marks it read",
        stateField(ctx, "unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "a row click keeps the panel open",
        stateField(ctx, "open"),
        "true",
      );
      ctx.host.click("nc-row-6");
      yield* ctx.expectEqual(
        "a second click keeps it read",
        stateField(ctx, "unread"),
        "1",
      );

      // 5. Escape closes and returns native focus; read flags survive.
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the panel",
        stateField(ctx, "open"),
        "false",
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the bell",
        Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none"),
        "nc-bell",
      );
      ctx.host.click("nc-bell");
      yield* ctx.expectEqual(
        "reopening keeps the read flags",
        stateField(ctx, "unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "the read row is still read",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-dot-6"))),
        true,
      );
      ctx.host.scrollToItem("nc-list", 6, 0);
      ctx.host.advance(0);
      yield* ctx.expectSome(
        "the remaining unread row keeps its dot",
        Option.fromNullishOr(ctx.host.bounds("nc-dot-2")),
      );

      // 6. Mark all read: every dot and the badge disappear.
      ctx.host.click("nc-mark-all");
      yield* ctx.expectEqual(
        "mark all clears the count",
        stateField(ctx, "unread"),
        "0",
      );
      yield* ctx.expectEqual(
        "zero unread paints no badge",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-badge"))),
        true,
      );
      const zeroTree = yield* treeOf(ctx);
      yield* node(ctx, zeroTree, "Button", "Notifications, 0 unread");
      yield* ctx.expectEqual(
        "every dot is gone",
        Arr.every(
          Arr.map([6, 5, 4, 3, 2, 1], (id) =>
            Option.isNone(Option.fromNullishOr(ctx.host.bounds(`nc-dot-${id}`))),
          ),
          (gone) => gone,
        ),
        true,
      );

      // 7. An arrival while closed increments the badge; opening shows it first.
      ctx.host.key("escape");
      ctx.host.click("nc-arrive");
      yield* ctx.expectEqual(
        "a closed arrival increments the count",
        stateField(ctx, "unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "the closed badge follows",
        read(ctx, "nc-badge"),
        "1",
      );
      yield* ctx.expectEqual(
        "the arrival is in the model",
        stateField(ctx, "items"),
        "7",
      );
      ctx.host.click("nc-bell");
      const arrived = yield* ctx.expectSome(
        "the arrival paints when opened",
        rowBox(ctx, 7),
      );
      yield* ctx.expectNear(
        "the arrival sits under the Today header",
        arrived.y,
        listView.y + HEADER_ROW,
        1,
      );

      // 8. An arrival at the top keeps the reader at the top.
      ctx.host.click("nc-simulate");
      yield* ctx.expectEqual(
        "an inside arrival keeps the panel open",
        stateField(ctx, "open"),
        "true",
      );
      yield* ctx.expectEqual(
        "the second arrival increments the count",
        stateField(ctx, "unread"),
        "2",
      );
      const newest = yield* ctx.expectSome(
        "the newest arrival paints",
        rowBox(ctx, 8),
      );
      yield* ctx.expectNear(
        "the newest arrival is at the top of Today",
        newest.y,
        listView.y + HEADER_ROW,
        1,
      );
      yield* ctx.expectEqual(
        "a reader at the top stays at the top",
        anchorIndex(ctx),
        0,
      );

      // 9. The prepend: a scrolled reader keeps their row.
      ctx.host.scrollToItem("nc-list", 2, 0);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the jump anchors the reader's row",
        anchorIndex(ctx),
        2,
      );
      const kept = yield* ctx.expectSome(
        "the reader's row paints at the top",
        rowBox(ctx, 7),
      );
      yield* ctx.expectNear(
        "the reader's row starts at the viewport top",
        kept.y,
        listView.y,
        1,
      );
      yield* ctx.expectEqual(
        "the readout names the reader's row",
        stateField(ctx, "top"),
        "n:7",
      );
      ctx.host.click("nc-simulate");
      yield* ctx.expectEqual(
        "the scrolled arrival re-anchors by row identity",
        anchorIndex(ctx),
        3,
      );
      const stillKept = yield* ctx.expectSome(
        "the reader's row is still painted",
        rowBox(ctx, 7),
      );
      yield* ctx.expectNear(
        "the reader's row did not move",
        stillKept.y,
        kept.y,
        1,
      );
      yield* ctx.expectEqual(
        "the readout keeps the reader's row",
        stateField(ctx, "top"),
        "n:7",
      );
      yield* ctx.expectEqual(
        "the row above the reader is unpainted",
        Option.isNone(rowBox(ctx, 9)),
        true,
      );

      // 10. Clear-all paints the empty state; a later arrival restores the list.
      ctx.host.click("nc-clear");
      yield* ctx.expectEqual(
        "clear empties the model",
        stateField(ctx, "items"),
        "0",
      );
      yield* ctx.expectEqual(
        "clearing unpaints the badge",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-badge"))),
        true,
      );
      yield* ctx.expectSome(
        "the empty state paints",
        Option.fromNullishOr(ctx.host.bounds("nc-empty")),
      );
      yield* ctx.expectEqual(
        "the list is gone",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-list"))),
        true,
      );
      ctx.host.click("nc-simulate");
      yield* ctx.expectEqual(
        "an arrival restores one item",
        stateField(ctx, "items"),
        "1",
      );
      yield* ctx.expectEqual(
        "the restored item is unread",
        stateField(ctx, "unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "the empty state is gone",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("nc-empty"))),
        true,
      );
      const restored = yield* ctx.expectSome(
        "the restored row paints",
        rowBox(ctx, 10),
      );
      yield* ctx.expectNear(
        "the restored row sits under its header",
        restored.y,
        listView.y + HEADER_ROW,
        1,
      );

      // 11. An outside press dismisses; the state survives.
      ctx.host.click("nc-content");
      yield* ctx.expectEqual(
        "an outside press dismisses",
        stateField(ctx, "open"),
        "false",
      );
      yield* ctx.expectEqual(
        "the outside press keeps the state",
        stateField(ctx, "items"),
        "1",
      );
      yield* ctx.expectEqual(
        "the outside press keeps the unread count",
        stateField(ctx, "unread"),
        "1",
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/notification-centre.png",
      );
    }),
};
