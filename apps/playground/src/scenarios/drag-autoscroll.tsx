/**
 * `drag-autoscroll` — the two facts a movable tab strip or a reorderable list
 * needs and nothing had measured: does a captured drag scroll a container when
 * the pointer is held at its edge, and can component code scroll the container
 * mid-gesture without losing the capture or the drop?
 *
 * `drag-targets` settled the pointer model (capture owns every move and the up,
 * hover is frozen, the gesture ends in a click on the source). It did not drive
 * an edge hold. This probe does: a real press, held moves, a component-owned
 * edge-scroll loop and a release, with the drop index derived from the pointer
 * and the live offset the way a reorder component must derive it.
 *
 * Measured facts: plan `172` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 60;
const ROW_HEIGHT = 24;
const VIEWPORT_HEIGHT = 180;
const EDGE = 24;

const rowStyle = (theme: Theme) => ({
  height: ROW_HEIGHT,
  flexShrink: 0,
  paddingLeft: 4,
  backgroundColor: theme.colors.card,
});

/** The plain list: 60 rows in a scroll container, no edge loop. */
const PlainList = () => {
  const theme = useTheme();
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        testId="drag-plain"
        style={{
          width: 220,
          height: VIEWPORT_HEIGHT,
          overflowY: "scroll",
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(Arr.range(0, ROWS - 1), (row) => (
          <div
            key={row}
            testId={row === 0 ? "drag-plain-source" : `drag-plain-row-${row}`}
            onMouseDown={row === 0 ? () => record("down") : undefined}
            onMouseMove={row === 0 ? () => record("move") : undefined}
            onMouseUp={row === 0 ? () => record("up") : undefined}
            style={rowStyle(theme)}
          >
            <text style={{ fontSize: 12, color: theme.colors.foreground }}>
              {`plain row ${row}`}
            </text>
          </div>
        ))}
      </div>
      <Readout testId="drag-plain-log">{Arr.join(log, ">")}</Readout>
    </div>
  );
};

/** The reorder list: the same rows, plus the edge-scroll loop and a drop index. */
const ReorderList = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<Option.Option<PublicInstance>>(Option.none());
  const [offset, setOffset] = useState(0);
  const [dropIndex, setDropIndex] = useState(0);
  const [log, setLog] = useState<ReadonlyArray<string>>([]);

  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  const attach = (instance: PublicInstance | null): void => {
    list.current = Option.fromNullishOr(instance);
  };

  /**
   * The component-owned loop: a held move inside the edge band scrolls one row.
   * The drop index is derived from the pointer and the live offset — the same
   * calculation a reorder would use on release.
   */
  const onMove = (event: EventPayload): void => {
    Option.match(list.current, {
      onNone: () => undefined,
      onSome: (instance) => {
        const bounds = Option.fromNullishOr(
          renderer?.getElementBounds?.(instance.id),
        );
        if (Option.isNone(bounds)) return;
        const current = renderer?.getScrollOffset?.(instance.id);
        const scrollY = current?.[1] ?? 0;
        const viewY = (event.y ?? 0) - bounds.value.y;
        const delta =
          viewY > bounds.value.height - EDGE
            ? -ROW_HEIGHT
            : viewY < EDGE
              ? ROW_HEIGHT
              : 0;
        const next = scrollY + delta;
        if (delta !== 0) renderer?.scrollTo?.(instance.id, 0, next);
        setOffset(next);
        setDropIndex(
          Math.max(
            0,
            Math.min(ROWS - 1, Math.floor((viewY - next) / ROW_HEIGHT)),
          ),
        );
        record(`move:${Math.round(viewY)}:${next}`);
      },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        testId="drag-reorder"
        ref={attach}
        style={{
          width: 220,
          height: VIEWPORT_HEIGHT,
          overflowY: "scroll",
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(Arr.range(0, ROWS - 1), (row) => (
          <div
            key={row}
            testId={row === 0 ? "drag-source" : `drag-row-${row}`}
            onMouseDown={row === 0 ? () => record("down") : undefined}
            onMouseMove={row === 0 ? onMove : undefined}
            onMouseUp={row === 0 ? () => record("up") : undefined}
            onClick={row === 0 ? () => record("click") : undefined}
            style={rowStyle(theme)}
          >
            <text style={{ fontSize: 12, color: theme.colors.foreground }}>
              {`reorder row ${row}`}
            </text>
          </div>
        ))}
      </div>
      <Readout testId="drag-reorder-offset">{`offset=${offset}`}</Readout>
      <Readout testId="drag-drop-index">{`index=${dropIndex}`}</Readout>
      <Readout testId="drag-log">{Arr.join(log, ">")}</Readout>
    </div>
  );
};

const DragScrollProbe = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 24,
        marginLeft: 40,
        marginTop: 30,
        backgroundColor: theme.colors.background,
      }}
    >
      <PlainList />
      <ReorderList />
    </div>
  );
};

const logOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("drag-log")), () => "");

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

/** The x a held drag aims at: the list's horizontal centre. */
const centreX = (bounds: Smoke.Bounds): number => bounds.x + bounds.width / 2;

export const dragAutoscrollScenario: PlaygroundScenario = {
  id: "drag-autoscroll",
  title: "Drag: held edge scroll, capture and the derived drop index",
  capability: "drag",
  view: () => <DragScrollProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const plain = yield* ctx.expectSome(
        "the plain list has bounds",
        Option.fromNullishOr(ctx.host.bounds("drag-plain")),
      );
      const reorder = yield* ctx.expectSome(
        "the reorder list has bounds",
        Option.fromNullishOr(ctx.host.bounds("drag-reorder")),
      );
      const bottom = reorder.y + reorder.height - 6;
      const top = reorder.y + 6;

      // The reorder list's own loop: three held moves at the bottom edge scroll
      // one row each while the pointer does not move.
      ctx.host.press("drag-source");
      ctx.host.movePointer(centreX(reorder), bottom);
      ctx.host.advance(0);
      const first = yield* ctx.expectSome(
        "the reorder list reports an offset",
        Option.fromNullishOr(ctx.host.scrollOffset("drag-reorder")),
      );
      yield* ctx.expectEqual(
        "a held bottom-edge move scrolls one row",
        first.y,
        -ROW_HEIGHT,
      );
      ctx.host.movePointer(centreX(reorder), bottom);
      ctx.host.movePointer(centreX(reorder), bottom);
      ctx.host.advance(0);
      const held = yield* ctx.expectSome(
        "the held offset is readable",
        Option.fromNullishOr(ctx.host.scrollOffset("drag-reorder")),
      );
      yield* ctx.expectEqual(
        "three held moves scroll three rows",
        held.y,
        -ROW_HEIGHT * 3,
      );
      const dropNearBottom = Number(
        Str.replace("index=", "")(readout(ctx, "drag-drop-index")),
      );
      yield* ctx.expectEqual(
        "the drop index follows the scrolled content",
        dropNearBottom > 0,
        true,
      );

      // The pointer moves to the top edge: the loop scrolls back.
      ctx.host.movePointer(centreX(reorder), top);
      ctx.host.advance(0);
      const back = yield* ctx.expectSome(
        "the top-edge offset is readable",
        Option.fromNullishOr(ctx.host.scrollOffset("drag-reorder")),
      );
      yield* ctx.expectEqual(
        "a held top-edge move scrolls one row back",
        back.y,
        -ROW_HEIGHT * 2,
      );
      const dropNearTop = Number(
        Str.replace("index=", "")(readout(ctx, "drag-drop-index")),
      );
      yield* ctx.expectEqual(
        "the drop index moves toward the top with the scroll",
        dropNearTop < dropNearBottom,
        true,
      );

      // Release: the captured source still gets the up, and the gesture ends in
      // the documented click.
      ctx.host.releasePointer(centreX(reorder), top);
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the source received the down",
        logOf(ctx),
        "down",
      );
      yield* ctx.expectContains("the source received the up", logOf(ctx), "up");
      yield* ctx.expectContains(
        "the gesture ends in a click on the source",
        logOf(ctx),
        "click",
      );
      yield* ctx.expectEqual(
        "the source received every held move",
        Arr.length(
          Arr.filter(Str.split(">")(logOf(ctx)), Str.startsWith("move:")),
        ) >= 4,
        true,
      );

      // The plain list has no loop: this measures the runtime's own behaviour.
      ctx.host.press("drag-plain-source");
      ctx.host.movePointer(centreX(plain), plain.y + plain.height - 6);
      ctx.host.advance(600);
      const builtin = yield* ctx.expectSome(
        "the plain list reports an offset",
        Option.fromNullishOr(ctx.host.scrollOffset("drag-plain")),
      );
      yield* ctx.expectContains(
        "the plain gesture is live (its source receives the move)",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("drag-plain-log")),
          () => "",
        ),
        "move",
      );
      yield* ctx.expectEqual(
        "the runtime does not auto-scroll a held drag",
        builtin.y,
        0,
      );
      ctx.host.releasePointer(centreX(plain), plain.y + plain.height - 6);
    }),
};
