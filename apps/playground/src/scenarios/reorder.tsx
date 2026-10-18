/**
 * `list-reorder` — the reorder itself, which the drag probes left unmeasured.
 *
 * `drag-targets` (plan `162`) settled pointer capture and the gesture-ending
 * click; `drag-autoscroll` (plan `172`) settled the edge loop and that the move
 * handler must sit on the **pressed element**. Neither applied an order change.
 * This probe does, for a plain list and a virtualized one, and it measures the
 * three things a reorder component cannot guess:
 *
 * - a pointer names an insertion **boundary**; the item's removal shifts every
 *   boundary after it, so a downward drop is one index earlier (plan `391`);
 * - a click on a handle is not a drag, and the gesture-ending click must be
 *   swallowed or the drop also activates the row;
 * - keyboard lift/arrow/drop is the accessible path, and native focus must end
 *   on the moved row.
 *
 * Measured facts: plan `391` §9.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";
import { fieldOf, read } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  describeOrder,
  dropIndex,
  indexOfId,
  indicatorY,
  insertionAt,
  moveItem,
  nextBoundary,
  type ReorderItem,
} from "./reorder-model.js";

const ROW_HEIGHT = 32;
const V_ROW_HEIGHT = 24;
const V_HEIGHT = 240;
const V_COUNT = 60;
/** A pointer has to travel this far before a press counts as a drag. */
const DRAG_THRESHOLD = 2;

const NAMES = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
] as const;

const PLAIN_ROWS: ReadonlyArray<ReorderItem> = Arr.map(NAMES, (id) => ({ id }));
const V_ROWS: ReadonlyArray<ReorderItem> = Arr.map(
  Arr.range(0, V_COUNT - 1),
  (index) => ({ id: `v-${index}` }),
);

interface Drag {
  readonly id: string;
  readonly from: number;
  readonly boundary: number;
  readonly mode: "pointer" | "keyboard";
  readonly moved: boolean;
}

interface Stats {
  readonly activations: number;
  readonly suppressed: number;
}

/** The reorder state machine both lists share. */
const useReorder = (initial: ReadonlyArray<ReorderItem>, rowHeight: number) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<Option.Option<PublicInstance>>(Option.none());
  const drag = useRef<Option.Option<Drag>>(Option.none());
  const pressY = useRef(0);
  const suppressClick = useRef(false);

  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<Option.Option<Drag>>(Option.none());
  const [stats, setStats] = useState<Stats>({ activations: 0, suppressed: 0 });
  const [log, setLog] = useState<ReadonlyArray<string>>([]);

  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  const setDrag = (next: Option.Option<Drag>): void => {
    drag.current = next;
    setPending(next);
  };

  const count = Arr.length(initial);

  /** Content scrolled above the viewport, in positive pixels. */
  const contentOffset = (): number =>
    Option.match(list.current, {
      onNone: () => 0,
      onSome: (instance) =>
        -(renderer?.getScrollOffset?.(instance.id)?.[1] ?? 0),
    });

  const viewY = (event: EventPayload): number =>
    Option.match(list.current, {
      onNone: () => 0,
      onSome: (instance) =>
        Option.match(
          Option.fromNullishOr(renderer?.getElementBounds?.(instance.id)),
          {
            onNone: () => 0,
            onSome: (bounds) => (event.y ?? 0) - bounds.y,
          },
        ),
    });

  const boundaryAt = (event: EventPayload): number =>
    insertionAt(viewY(event), contentOffset(), rowHeight, count);

  const onDown =
    (id: string) =>
    (event: EventPayload): void => {
      Option.match(indexOfId(items, id), {
        onNone: () => undefined,
        onSome: (from) => {
          pressY.current = event.y ?? 0;
          setDrag(
            Option.some({
              id,
              from,
              boundary: from,
              mode: "pointer",
              moved: false,
            }),
          );
          record(`down:${id}`);
        },
      });
    };

  const onMove = (event: EventPayload): void => {
    Option.match(drag.current, {
      onNone: () => undefined,
      onSome: (current) => {
        if (current.mode !== "pointer") return;
        const boundary = boundaryAt(event);
        const moved =
          current.moved ||
          Math.abs((event.y ?? 0) - pressY.current) > DRAG_THRESHOLD;
        if (boundary === current.boundary && moved === current.moved) return;
        setDrag(Option.some({ ...current, boundary, moved }));
        if (boundary !== current.boundary) record(`move:${boundary}`);
      },
    });
  };

  /** Applies the pending drop; returns whether an order change happened. */
  const commit = (current: Drag): boolean => {
    if (!current.moved) {
      record("cancel");
      return false;
    }
    const to = dropIndex(current.from, current.boundary, count);
    setItems((previous) => moveItem(previous, current.from, to));
    record(`drop:${to}`);
    return true;
  };

  const onUp = (id: string) => (): void => {
    Option.match(drag.current, {
      onNone: () => undefined,
      onSome: (current) => {
        if (current.mode !== "pointer") return;
        record(`up:${id}`);
        if (commit(current)) suppressClick.current = true;
        setDrag(Option.none());
      },
    });
  };

  const onClick = (id: string) => (): void => {
    record(`click:${id}`);
    if (suppressClick.current) {
      suppressClick.current = false;
      record(`suppressed:${id}`);
      setStats((previous) => ({
        ...previous,
        suppressed: previous.suppressed + 1,
      }));
      return;
    }
    setStats((previous) => ({
      ...previous,
      activations: previous.activations + 1,
    }));
  };

  const cancel = (): void => {
    Option.match(drag.current, {
      onNone: () => undefined,
      onSome: () => {
        record("cancel");
        setDrag(Option.none());
      },
    });
  };

  const onKeyDown =
    (id: string) =>
    (event: EventPayload): void => {
      const key = event.key ?? "";
      Option.match(drag.current, {
        onNone: () => {
          if (key !== "enter" && key !== "space") return;
          Option.match(indexOfId(items, id), {
            onNone: () => undefined,
            onSome: (from) => {
              setDrag(
                Option.some({
                  id,
                  from,
                  boundary: from,
                  mode: "keyboard",
                  moved: true,
                }),
              );
              record(`lift:${id}`);
            },
          });
        },
        onSome: (current) => {
          if (current.mode !== "keyboard" || current.id !== id) return;
          if (key === "down" || key === "up") {
            const boundary = nextBoundary(
              current.boundary,
              key === "down" ? 1 : -1,
              count,
            );
            setDrag(Option.some({ ...current, boundary }));
            record(`step:${boundary}`);
            return;
          }
          if (key !== "enter") return;
          commit(current);
          setDrag(Option.none());
        },
      });
    };

  const attachList = (instance: PublicInstance | null): void => {
    list.current = Option.fromNullishOr(instance);
  };

  const dragText = Option.match(pending, {
    onNone: () => "drag=none boundary=none",
    onSome: (current) =>
      `drag=${current.id} boundary=${current.boundary} mode=${current.mode}`,
  });

  return {
    theme,
    items,
    pending,
    stats,
    log,
    dragText,
    onDown,
    onMove,
    onUp,
    onClick,
    onKeyDown,
    cancel,
    attachList,
  };
};

type Reorder = ReturnType<typeof useReorder>;

const rowStyle = (theme: Reorder["theme"], index: number) => ({
  height: ROW_HEIGHT,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingLeft: 8,
  backgroundColor: index % 2 === 0 ? theme.colors.card : theme.colors.muted,
});

const handleStyle = (theme: Reorder["theme"]): StyleDesc => ({
  width: 20,
  height: 24,
  flexShrink: 0,
  cursor: "grab",
  borderRadius: theme.radius.sm,
  backgroundColor: theme.colors.muted,
});

const Handle = ({
  reorder,
  id,
  testId,
  style,
}: {
  readonly reorder: Reorder;
  readonly id: string;
  readonly testId: string;
  readonly style: ReturnType<typeof handleStyle>;
}) => (
  <div
    testId={testId}
    tabIndex={0}
    role="button"
    aria-label={`Reorder ${id}`}
    onMouseDown={reorder.onDown(id)}
    onMouseMove={reorder.onMove}
    onMouseUp={reorder.onUp(id)}
    onClick={reorder.onClick(id)}
    onKeyDown={reorder.onKeyDown(id)}
    style={style}
  />
);

const PlainList = ({ reorder }: { readonly reorder: Reorder }) => {
  const theme = reorder.theme;
  const indicator = Option.match(reorder.pending, {
    onNone: () => null,
    onSome: (current) => (
      <div
        testId="reorder-indicator"
        style={{
          position: "absolute",
          left: 0,
          top: indicatorY(current.boundary, ROW_HEIGHT),
          width: "100%",
          height: 2,
          backgroundColor: theme.colors.primary,
          pointerEvents: "none",
        }}
      />
    ),
  });
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}
    >
      <Readout testId="reorder-state">
        {`${reorder.dragText} activations=${reorder.stats.activations} suppressed=${reorder.stats.suppressed}`}
      </Readout>
      <Readout testId="reorder-order">{describeOrder(reorder.items)}</Readout>
      <div
        testId="reorder-list"
        ref={reorder.attachList}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: 280,
          backgroundColor: theme.colors.background,
        }}
      >
        {Arr.map(reorder.items, (row, index) => (
          <div
            key={row.id}
            testId={`reorder-row-${row.id}`}
            style={rowStyle(theme, index)}
          >
            <Handle
              reorder={reorder}
              id={row.id}
              testId={`reorder-handle-${row.id}`}
              style={handleStyle(theme)}
            />
            <text style={{ fontSize: 12, color: theme.colors.foreground }}>
              {row.id}
            </text>
          </div>
        ))}
        {indicator}
      </div>
      <Readout testId="reorder-log">{Arr.join(reorder.log, ">")}</Readout>
    </div>
  );
};

const VirtualList = ({ reorder }: { readonly reorder: Reorder }) => {
  const theme = reorder.theme;
  const style = handleStyle(theme);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}
    >
      <Readout testId="reorder-v-order">{describeOrder(reorder.items)}</Readout>
      <div
        testId="reorder-v-frame"
        ref={reorder.attachList}
        style={{ width: 280, height: V_HEIGHT }}
      >
        <virtual-list
          testId="reorder-v-list"
          estimatedItemHeight={V_ROW_HEIGHT}
          style={{ width: 280, height: V_HEIGHT }}
        >
          {Arr.map(reorder.items, (row) => (
            <div
              key={row.id}
              testId={`reorder-v-row-${row.id}`}
              style={{
                height: V_ROW_HEIGHT,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingLeft: 6,
                backgroundColor: theme.colors.card,
              }}
            >
              <Handle
                reorder={reorder}
                id={row.id}
                testId={`reorder-v-handle-${row.id}`}
                style={{ ...style, height: V_ROW_HEIGHT }}
              />
              <text style={{ fontSize: 11, color: theme.colors.foreground }}>
                {row.id}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

/** The probe; exported so the live twin mounts the same tree. */
export const ReorderProbe = () => {
  const plain = useReorder(PLAIN_ROWS, ROW_HEIGHT);
  const virtual = useReorder(V_ROWS, V_ROW_HEIGHT);
  useWindowKey((event) => {
    if (event.key !== "escape") return;
    plain.cancel();
    virtual.cancel();
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 24,
        padding: 24,
        backgroundColor: plain.theme.colors.background,
      }}
    >
      <PlainList reorder={plain} />
      <VirtualList reorder={virtual} />
    </div>
  );
};

const box = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

/** A readout field as a plain string, or `"none"` so a failure names it. */
const stateField = (readout: string, key: string): string =>
  Option.getOrElse(fieldOf(readout, key), () => "none");

export const listReorderScenario: PlaygroundScenario = {
  id: "list-reorder",
  title: "Reorder: pointer drops, the boundary rule, keyboard and cancel",
  capability: "reorder",
  view: () => <ReorderProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const initial = "alpha,bravo,charlie,delta,echo,foxtrot,golf,hotel";
      const moved = "bravo,charlie,alpha,delta,echo,foxtrot,golf,hotel";

      yield* ctx.expectEqual(
        "the list starts in declaration order",
        read(ctx, "reorder-order"),
        initial,
      );
      yield* ctx.expectEqual(
        "no indicator paints before a gesture",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("reorder-indicator")),
        ),
        true,
      );

      // 1. A click focuses the handle but is not a drag.
      ctx.host.click("reorder-handle-alpha");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a click does not reorder",
        read(ctx, "reorder-order"),
        initial,
      );
      yield* ctx.expectEqual(
        "the click is an activation, not a drop",
        stateField(read(ctx, "reorder-state"), "activations"),
        "1",
      );
      yield* ctx.expectEqual(
        "the handle holds native focus after the click",
        focused(ctx),
        "reorder-handle-alpha",
      );

      // 2. Drag alpha to the lower half of row 2: boundary 3.
      const list = yield* box(ctx, "reorder-list");
      const midX = list.x + list.width / 2;
      const dropY = list.y + ROW_HEIGHT * 2 + 24;
      ctx.host.press("reorder-handle-alpha");
      ctx.host.movePointer(midX, dropY);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the pointer names boundary 3",
        stateField(read(ctx, "reorder-state"), "boundary"),
        "3",
      );
      const indicator = yield* box(ctx, "reorder-indicator");
      yield* ctx.expectNear(
        "the indicator paints on the boundary",
        indicator.y,
        list.y + ROW_HEIGHT * 3,
        1,
      );

      ctx.host.releasePointer(midX, dropY);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a downward drop lands one index earlier than the boundary",
        read(ctx, "reorder-order"),
        moved,
      );
      const alpha = yield* box(ctx, "reorder-row-alpha");
      yield* ctx.expectNear(
        "the moved row paints at index 2",
        alpha.y,
        list.y + ROW_HEIGHT * 2,
        1,
      );
      const delta = yield* box(ctx, "reorder-row-delta");
      yield* ctx.expectNear(
        "a row below the source keeps its place",
        delta.y,
        list.y + ROW_HEIGHT * 3,
        1,
      );
      yield* ctx.expectEqual(
        "the gesture-ending click did not activate the row",
        stateField(read(ctx, "reorder-state"), "activations"),
        "1",
      );
      yield* ctx.expectEqual(
        "the ending click was suppressed",
        stateField(read(ctx, "reorder-state"), "suppressed"),
        "1",
      );
      yield* ctx.expectContains(
        "the source still receives the ending click",
        read(ctx, "reorder-log"),
        "click:alpha",
      );

      // 3. Drag the same item back to the top.
      ctx.host.press("reorder-handle-alpha");
      ctx.host.movePointer(midX, list.y + 4);
      ctx.host.advance(0);
      ctx.host.releasePointer(midX, list.y + 4);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "an upward drop restores the original order",
        read(ctx, "reorder-order"),
        initial,
      );
      const restored = yield* box(ctx, "reorder-row-alpha");
      yield* ctx.expectNear(
        "the row paints back at index 0",
        restored.y,
        list.y,
        1,
      );

      // 4. Escape cancels a held pointer drag.
      ctx.host.press("reorder-handle-bravo");
      ctx.host.movePointer(midX, list.y + ROW_HEIGHT * 5 + 16);
      ctx.host.advance(0);
      ctx.host.key("escape");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "Escape cancels without a reorder",
        read(ctx, "reorder-order"),
        initial,
      );
      yield* ctx.expectEqual(
        "the indicator leaves on cancel",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("reorder-indicator")),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "Escape clears the pending drag",
        stateField(read(ctx, "reorder-state"), "drag"),
        "none",
      );
      ctx.host.releasePointer(midX, list.y + ROW_HEIGHT * 5 + 16);
      ctx.host.advance(0);

      // 5. Keyboard: lift, two steps down, drop at index 1.
      ctx.host.click("reorder-handle-alpha");
      ctx.host.advance(0);
      ctx.host.keyDown("reorder-handle-alpha", "enter");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a keyboard lift shows the item's boundary",
        stateField(read(ctx, "reorder-state"), "boundary"),
        "0",
      );
      ctx.host.keyDown("reorder-handle-alpha", "down");
      ctx.host.advance(0);
      ctx.host.keyDown("reorder-handle-alpha", "down");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "two steps move the boundary to 2",
        stateField(read(ctx, "reorder-state"), "boundary"),
        "2",
      );
      ctx.host.keyDown("reorder-handle-alpha", "enter");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the keyboard drop uses the same boundary rule",
        read(ctx, "reorder-order"),
        "bravo,alpha,charlie,delta,echo,foxtrot,golf,hotel",
      );
      const keyed = yield* box(ctx, "reorder-row-alpha");
      yield* ctx.expectNear(
        "the keyboard-moved row paints at index 1",
        keyed.y,
        list.y + ROW_HEIGHT,
        1,
      );
      yield* ctx.expectEqual(
        "native focus follows the keyboard-moved row",
        focused(ctx),
        "reorder-handle-alpha",
      );

      // 6. A virtualized list reorders its keyed rows.
      const frame = yield* box(ctx, "reorder-v-frame");
      const vX = frame.x + frame.width / 2;
      const vDrop = frame.y + V_ROW_HEIGHT * 4 + 12;
      ctx.host.press("reorder-v-handle-v-0");
      ctx.host.movePointer(vX, vDrop);
      ctx.host.advance(0);
      ctx.host.releasePointer(vX, vDrop);
      ctx.host.advance(0);
      const vOrder = read(ctx, "reorder-v-order");
      yield* ctx.expectEqual(
        "the virtual list keeps every row",
        Arr.length(Str.split(",")(vOrder)),
        V_COUNT,
      );
      yield* ctx.expectEqual(
        "the virtual list reorders keyed rows",
        Arr.join(Arr.take(Str.split(",")(vOrder), 6), ","),
        "v-1,v-2,v-3,v-4,v-0,v-5",
      );
      const vMoved = yield* box(ctx, "reorder-v-row-v-0");
      yield* ctx.expectNear(
        "the virtual moved row paints at index 4",
        vMoved.y,
        frame.y + V_ROW_HEIGHT * 4,
        1,
      );
      const anchor = yield* ctx.expectSome(
        "the virtual list reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("reorder-v-list")),
      );
      yield* ctx.expectEqual("the virtual list stays at the top", anchor[0], 0);
    }),
};
