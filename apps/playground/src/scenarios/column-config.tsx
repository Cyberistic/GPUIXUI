/**
 * `column-config` — hiding, showing and reordering columns inside the
 * virtualized, panned data grid (plan `384`).
 *
 * Plans `338` and `349` measured the grid's scroll, freeze and resize
 * mechanics; every column always painted. A settings surface changes the
 * **set** and the **order** of the cells, which is a different question:
 *
 * - does a `<virtual-list>` repaint when the number of cells per row changes?
 * - does the horizontal scroller follow a smaller visible width?
 * - does the reader's row survive a hide, a reorder and a show?
 * - does an anchored panel opened from app chrome stay usable while the grid
 *   re-renders underneath it?
 *
 * The order/visibility arithmetic is pure (`column-config-model.ts`) and sits on
 * the plan-349 width model; the view and the scenario's expectations call the
 * same functions.
 */
import { memo, useCallback, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import { ariaOf, fieldOf, focusedId, read, readoutNumber } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import type { GridRow } from "./data-grid-model.js";
import {
  anchoredWindow,
  cellText,
  indices,
  rowTop,
} from "./data-grid-model.js";
import { DATA_ROWS } from "./data-grid.js";
import type { Widths } from "./column-resize-model.js";
import {
  initialWidths,
  resetWidths,
  setWidth,
  widthOf,
} from "./column-resize-model.js";
import type { ColumnConfig } from "./column-config-model.js";
import {
  contentWidthOf,
  describeConfig,
  initialConfig,
  isVisible,
  maxPanOf,
  moveBy,
  offsetIn,
  orderOf,
  resetConfig,
  toggle,
  visibleIds,
} from "./column-config-model.js";

const FROZEN_WIDTH = 150;
const VIEWPORT = 360;
const LIST_HEIGHT = 280;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 28;
const JUMP_INDEX = 45;
const WIDE_NAME = 240;

/** A panel point in window coordinates. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** One virtual row; memoized so a pan does not rebuild every cell. */
const RowView = memo(
  ({
    row,
    config,
    widths,
    selected,
    onSelect,
  }: {
    readonly row: GridRow;
    readonly config: ColumnConfig;
    readonly widths: Widths;
    readonly selected: boolean;
    readonly onSelect: (id: number) => void;
  }) => {
    const theme = useTheme();
    const visible = visibleIds(config);
    const first = Option.getOrElse(Arr.head(visible), () => "");
    return (
      <div
        testId={`config-row-${row.id}`}
        onClick={() => onSelect(row.id)}
        style={{
          display: "flex",
          width: contentWidthOf(config, widths),
          height: ROW_HEIGHT,
          backgroundColor: selected
            ? theme.colors.accent
            : theme.colors.background,
        }}
      >
        {Arr.map(visible, (id) => (
          <div
            key={id}
            testId={`config-cell-${row.id}-${id}`}
            role="gridcell"
            aria-selected={selected}
            aria-label={`row ${row.id} ${id}`}
            aria-id={`config-cell-${row.id}-${id}`}
            tabIndex={selected && id === first ? 0 : -1}
            style={{
              width: widthOf(widths, id),
              height: ROW_HEIGHT,
              flexShrink: 0,
              justifyContent: "center",
              paddingLeft: theme.spacing.sm,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {cellText(row, id)}
            </text>
          </div>
        ))}
      </div>
    );
  },
);

const ColumnConfigProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const trigger = useRef<PublicInstance | null>(null);
  const pan = useRef<PublicInstance | null>(null);
  const list = useRef<PublicInstance | null>(null);
  const [config, setConfig] = useState<ColumnConfig>(initialConfig);
  const [widths, setWidths] = useState<Widths>(initialWidths);
  const [open, setOpen] = useState(Option.none<Point>());
  const [last, setLast] = useState("none");
  const [panX, setPanX] = useState(0);
  const [anchor, setAnchor] = useState({ index: 0, offset: 0 });
  const [selected, setSelected] = useState(Option.none<number>());
  const select = useCallback((id: number) => setSelected(Option.some(id)), []);

  const content = contentWidthOf(config, widths);
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

  const openPanel = (): void => {
    Option.match(Option.fromNullishOr(trigger.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getElementBounds?.(id)), {
          onNone: () => {},
          onSome: (bounds) =>
            setOpen(Option.some({ x: bounds.x, y: bounds.y + bounds.height })),
        }),
    });
  };

  const closePanel = (reason: string): void => {
    setOpen(Option.none());
    setLast(reason);
    if (reason !== "escape") return;
    Option.match(Option.fromNullishOr(trigger.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  const jump = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, JUMP_INDEX),
    });
    setAnchor({ index: JUMP_INDEX, offset: 0 });
  };

  const reset = (): void => {
    setConfig(resetConfig());
    setWidths(resetWidths());
  };

  return (
    <div
      testId="config-frame"
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 660 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          testId="config-open"
          ref={trigger}
          role="button"
          aria-id="config-open"
          aria-label="Configure columns"
          tabIndex={0}
          onClick={openPanel}
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
            hover: { backgroundColor: theme.colors.border },
          }}
        >
          <text style={{ color: theme.colors.foreground }}>columns…</text>
        </div>
        <Pressable testId="config-reset" onClick={reset}>
          <text style={{ color: theme.colors.foreground }}>reset</text>
        </Pressable>
        <Pressable
          testId="config-widen"
          onClick={() =>
            setWidths((current) => setWidth(current, "name", WIDE_NAME))
          }
        >
          <text style={{ color: theme.colors.foreground }}>widen name</text>
        </Pressable>
        <Pressable
          testId="config-pan-end"
          onClick={() => scrollPan(maxPanOf(config, widths, VIEWPORT))}
        >
          <text style={{ color: theme.colors.foreground }}>pan end</text>
        </Pressable>
        <Pressable testId="config-jump" onClick={jump}>
          <text style={{ color: theme.colors.foreground }}>jump</text>
        </Pressable>
        <div
          testId="config-outside"
          style={{
            width: 120,
            height: 32,
            backgroundColor: theme.colors.muted,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        />
      </div>

      <Readout testId="config-state">
        {`${describeConfig(config)} content=${content} x=${panX} anchor=${anchor.index} sel=${Option.match(
          selected,
          { onNone: () => "none", onSome: (id) => `${id}` },
        )} last=${last}`}
      </Readout>

      {Option.match(open, {
        onNone: () => null,
        onSome: (point) => (
          <anchored
            position={point}
            deferred
            priority={1}
            occlude
            style={{ position: "absolute" }}
          >
            <div
              testId="config-panel"
              role="group"
              aria-id="config-panel"
              aria-label="Columns"
              tabIndex={-1}
              autoFocus
              onMouseDownOutside={() => closePanel("outside")}
              onKeyDown={(event) => {
                if (event.key === "escape") closePanel("escape");
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: 224,
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.card,
                borderWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
              }}
            >
              <text
                testId="config-panel-title"
                style={{
                  fontSize: 12,
                  color: theme.colors.mutedForeground,
                  paddingBottom: 2,
                }}
              >
                Columns
              </text>
              {Arr.map(orderOf(config), (id) => {
                const shown = isVisible(config, id);
                return (
                  <div
                    key={id}
                    testId={`config-item-${id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      height: 26,
                    }}
                  >
                    <text
                      style={{
                        width: 54,
                        fontSize: 12,
                        color: theme.colors.foreground,
                      }}
                    >
                      {id}
                    </text>
                    <div
                      testId={`config-show-${id}`}
                      role="checkbox"
                      aria-id={`config-show-${id}`}
                      aria-label={`Show ${id}`}
                      aria-valuetext={shown ? "shown" : "hidden"}
                      tabIndex={0}
                      onClick={() =>
                        setConfig((current) => toggle(current, id))
                      }
                      style={{
                        width: 62,
                        height: 20,
                        justifyContent: "center",
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.muted,
                        cursor: "pointer",
                      }}
                    >
                      <text
                        style={{ fontSize: 11, color: theme.colors.foreground }}
                      >
                        {shown ? "shown" : "hidden"}
                      </text>
                    </div>
                    <div
                      testId={`config-up-${id}`}
                      role="button"
                      aria-label={`Move ${id} up`}
                      tabIndex={0}
                      onClick={() =>
                        setConfig((current) => moveBy(current, id, -1))
                      }
                      style={{
                        width: 22,
                        height: 20,
                        justifyContent: "center",
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.muted,
                        cursor: "pointer",
                      }}
                    >
                      <text style={{ color: theme.colors.foreground }}>↑</text>
                    </div>
                    <div
                      testId={`config-down-${id}`}
                      role="button"
                      aria-label={`Move ${id} down`}
                      tabIndex={0}
                      onClick={() =>
                        setConfig((current) => moveBy(current, id, 1))
                      }
                      style={{
                        width: 22,
                        height: 20,
                        justifyContent: "center",
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.muted,
                        cursor: "pointer",
                      }}
                    >
                      <text style={{ color: theme.colors.foreground }}>↓</text>
                    </div>
                  </div>
                );
              })}
            </div>
          </anchored>
        ),
      })}

      <div testId="config-grid" style={{ display: "flex", height: 308 }}>
        <div
          testId="config-frozen"
          style={{
            display: "flex",
            flexDirection: "column",
            width: FROZEN_WIDTH,
          }}
        >
          <div
            testId="config-frozen-head"
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
                    testId={`config-frozen-row-${row.id}`}
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
                    >
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
          testId="config-pan"
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
              testId="config-headrow"
              style={{
                position: "relative",
                width: content,
                height: HEADER_HEIGHT,
                backgroundColor: theme.colors.muted,
              }}
            >
              {Arr.map(visibleIds(config), (id) => (
                <div
                  key={id}
                  testId={`config-head-${id}`}
                  style={{
                    position: "absolute",
                    left: offsetIn(config, widths, id),
                    top: 0,
                    width: widthOf(widths, id),
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
                    {id}
                  </text>
                </div>
              ))}
            </div>
            <virtual-list
              testId="config-list"
              ref={list}
              estimatedItemHeight={ROW_HEIGHT}
              onVisibleRange={syncAnchor}
              style={{ width: content, height: LIST_HEIGHT }}
            >
              {Arr.map(DATA_ROWS, (row) => (
                <RowView
                  key={row.id}
                  row={row}
                  config={config}
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

const state = (ctx: Smoke.SmokeContext): string => read(ctx, "config-state");

/** The `readout`'s numeric field, or `-1` so a comparison names the absence. */
const field = (ctx: Smoke.SmokeContext, key: string): number =>
  Option.getOrElse(readoutNumber(ctx, "config-state", key), () => -1);

const selectedId = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(fieldOf(state(ctx), "sel"), () => "none");

const lastReason = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(fieldOf(state(ctx), "last"), () => "none");

const boundsOrFail = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const unpainted = (
  ctx: Smoke.SmokeContext,
  testId: string,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(
    label,
    Option.isNone(Option.fromNullishOr(ctx.host.bounds(testId))),
    true,
  );

const panOffset = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset("config-pan")),
      (value) => value.x,
    ),
    () => 0,
  );

/** The painted background of a row, or `"none"` when it never painted. */
const background = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(ctx.host.paintedStyle(testId)),
      (style) => style.backgroundColor,
    ),
    () => "none",
  );

/** The header cell and the body cell of one column share an edge and width. */
const alignedColumn = (
  ctx: Smoke.SmokeContext,
  id: string,
  rowId: number,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const head = yield* boundsOrFail(
      ctx,
      `config-head-${id}`,
      `the ${id} header paints`,
    );
    const cell = yield* boundsOrFail(
      ctx,
      `config-cell-${rowId}-${id}`,
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
      // A header cell and a body cell differ only by their border, which 0.10.0
      // excludes from the reported width (plan 529 §6.3).
      2,
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
      `config-frozen-row-${index}`,
      `the frozen row ${index} paints`,
    );
    const body = yield* boundsOrFail(
      ctx,
      `config-row-${index}`,
      `the body row ${index} paints`,
    );
    yield* ctx.expectNear(
      `the frozen row ${index} aligns with its body row`,
      frozen.y,
      body.y,
      1,
    );
  });

export const columnConfigScenario: PlaygroundScenario = {
  id: "column-config",
  title: "Data grid: hide, show and reorder columns without losing the reader",
  capability: "column-config",
  view: () => <ColumnConfigProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const config0 = initialConfig;
      const widths0 = initialWidths;
      const config1 = toggle(config0, "status");
      const config2 = toggle(config1, "status");
      const config3 = moveBy(config2, "notes", -1);
      const config4 = toggle(config3, "size");
      const config5 = toggle(config4, "size");
      const widths1 = setWidth(widths0, "name", WIDE_NAME);
      const config6 = toggle(config3, "name");
      const config7 = toggle(config0, "notes");

      // Geometry: the pan starts at the frozen column and the header is the
      // content width.
      const pan = yield* boundsOrFail(ctx, "config-pan", "the pan paints");
      const frozen = yield* boundsOrFail(
        ctx,
        "config-frozen-head",
        "the frozen header paints",
      );
      const head = yield* boundsOrFail(
        ctx,
        "config-headrow",
        "the header row paints",
      );
      yield* ctx.expectNear(
        "the pan starts at the frozen column's right edge",
        pan.x,
        frozen.x + frozen.width - 6,
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
        contentWidthOf(config0, widths0),
        1,
      );
      yield* ctx.expectEqual(
        "the grid starts with every column shown in declaration order",
        state(ctx),
        `${describeConfig(config0)} content=560 x=0 anchor=0 sel=none last=none`,
      );
      yield* Effect.forEach(
        ["name", "status", "size"],
        (id) => alignedColumn(ctx, id, 0),
        { concurrency: 1, discard: true },
      );

      // The settings panel: anchored under its trigger, focused and named.
      const trigger = yield* boundsOrFail(
        ctx,
        "config-open",
        "the configuration trigger paints",
      );
      ctx.host.click("config-open");
      const panel = yield* boundsOrFail(
        ctx,
        "config-panel",
        "the configuration panel paints",
      );
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the panel opens at the trigger's left edge",
        panel.x,
        trigger.x + 7,
        1,
      );
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the panel opens under the trigger",
        panel.y,
        trigger.y + trigger.height + 7,
        1,
      );
      yield* ctx.expectEqual(
        "the panel takes native focus",
        focusedId(ctx),
        "config-panel",
      );
      yield* ctx.expectEqual(
        "the panel names itself",
        read(ctx, "config-panel-title"),
        "Columns",
      );
      const panelAria = yield* ctx.expectSome(
        "the panel is exposed to assistive technology",
        ariaOf(ctx, "config-panel"),
      );
      yield* ctx.expectEqual(
        "the panel's role is a group",
        Option.getOrElse(panelAria.role, () => "none"),
        "Group",
      );
      yield* ctx.expectEqual(
        "the panel's accessible name is Columns",
        Option.getOrElse(panelAria.label, () => "none"),
        "Columns",
      );
      const triggerAria = yield* ctx.expectSome(
        "the trigger is exposed to assistive technology",
        ariaOf(ctx, "config-open"),
      );
      yield* ctx.expectEqual(
        "the trigger's role is a button",
        Option.getOrElse(triggerAria.role, () => "none"),
        "Button",
      );

      // Hiding a column drops its paint and closes the gap, and the panel
      // survives the grid's re-render.
      ctx.host.click("config-show-status");
      yield* ctx.expectEqual(
        "hiding status leaves three visible columns",
        state(ctx),
        `${describeConfig(config1)} content=440 x=0 anchor=0 sel=none last=none`,
      );
      yield* unpainted(
        ctx,
        "config-head-status",
        "the hidden column has no header",
      );
      yield* unpainted(
        ctx,
        "config-cell-0-status",
        "the hidden column has no body cell",
      );
      const nameHead = yield* boundsOrFail(
        ctx,
        "config-head-name",
        "the name header paints",
      );
      const sizeHead = yield* boundsOrFail(
        ctx,
        "config-head-size",
        "the size header paints",
      );
      yield* ctx.expectNear(
        "the next column closes the hidden column's gap",
        sizeHead.x,
        nameHead.x + nameHead.width,
        1,
      );
      yield* alignedColumn(ctx, "size", 0);
      yield* ctx.expectNear(
        "the header row narrows to the visible width",
        (yield* boundsOrFail(
          ctx,
          "config-headrow",
          "the narrowed header row paints",
        )).width,
        contentWidthOf(config1, widths0),
        1,
      );
      yield* ctx.expectEqual(
        "the panel stays open while the grid repaints",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("config-panel"))),
        true,
      );
      const showAria = yield* ctx.expectSome(
        "the hidden column's control is still exposed",
        ariaOf(ctx, "config-show-status"),
      );
      yield* ctx.expectEqual(
        "the control reports the hidden state",
        Option.getOrElse(showAria.value, () => "none"),
        "hidden",
      );

      // A smaller visible width shrinks the pan range; the runtime clamps at once.
      ctx.host.click("config-pan-end");
      yield* ctx.expectEqual(
        "the outside press closed the panel",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("config-panel"))),
        true,
      );
      yield* ctx.expectEqual(
        "the close names the outside press",
        lastReason(ctx),
        "outside",
      );
      yield* ctx.expectNear(
        `the pan reaches the visible maximum (x=${field(ctx, "x")})`,
        field(ctx, "x"),
        maxPanOf(config1, widths0, VIEWPORT),
        1,
      );
      yield* ctx.expectNear(
        "the runtime pan follows the visible width",
        panOffset(ctx),
        maxPanOf(config1, widths0, VIEWPORT),
        1,
      );

      // Showing the column restores its order slot, width and cells.
      ctx.host.click("config-open");
      ctx.host.click("config-show-status");
      yield* ctx.expectEqual(
        "showing status restores every column",
        state(ctx),
        `${describeConfig(config2)} content=560 x=-80 anchor=0 sel=none last=outside`,
      );
      yield* alignedColumn(ctx, "status", 0);
      yield* ctx.expectNear(
        "the restored column paints its default width",
        (yield* boundsOrFail(
          ctx,
          "config-head-status",
          "the restored status header paints",
        )).width,
        120,
        1,
      );

      // Reordering moves the header offsets and the body cells together.
      ctx.host.click("config-up-notes");
      yield* ctx.expectEqual(
        "the reorder readout names the new order",
        state(ctx),
        `${describeConfig(config3)} content=560 x=-80 anchor=0 sel=none last=outside`,
      );
      const notesHead = yield* boundsOrFail(
        ctx,
        "config-head-notes",
        "the moved notes header paints",
      );
      const statusHead = yield* boundsOrFail(
        ctx,
        "config-head-status",
        "the status header paints after the reorder",
      );
      yield* ctx.expectNear(
        "the moved column takes the slot after status",
        notesHead.x,
        statusHead.x + statusHead.width,
        1,
      );
      const movedSize = yield* boundsOrFail(
        ctx,
        "config-head-size",
        "the displaced size header paints",
      );
      yield* ctx.expectNear(
        "the displaced column moves to the end",
        movedSize.x,
        notesHead.x + notesHead.width,
        1,
      );
      yield* Effect.forEach(
        ["status", "notes", "size"],
        (id) => alignedColumn(ctx, id, 0),
        { concurrency: 1, discard: true },
      );

      // Both ends clamp.
      ctx.host.click("config-up-name");
      ctx.host.click("config-down-size");
      yield* ctx.expectEqual(
        "the order clamps at both ends",
        state(ctx),
        `${describeConfig(config3)} content=560 x=-80 anchor=0 sel=none last=outside`,
      );

      // Escape closes and returns focus to the trigger.
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the panel",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("config-panel"))),
        true,
      );
      yield* ctx.expectEqual(
        "the close names Escape",
        lastReason(ctx),
        "escape",
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        focusedId(ctx),
        "config-open",
      );

      // The reader's row and selection survive a hide and a show.
      ctx.host.click("config-jump");
      yield* ctx.expectEqual(
        `the jump anchors the list (anchor=${field(ctx, "anchor")})`,
        field(ctx, "anchor"),
        JUMP_INDEX,
      );
      const anchored = yield* ctx.expectSome(
        "the list reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("config-list")),
      );
      yield* ctx.expectEqual(
        "the runtime anchor is the jump index",
        anchored[0],
        JUMP_INDEX,
      );
      ctx.host.click(`config-cell-${JUMP_INDEX}-name`);
      yield* ctx.expectEqual(
        "a cell click selects its row",
        selectedId(ctx),
        `${JUMP_INDEX}`,
      );
      yield* ctx.expectEqual(
        "the selected row paints the accent",
        background(ctx, `config-row-${JUMP_INDEX}`),
        palettes.dark.colors.accent,
      );
      ctx.host.click("config-open");
      ctx.host.click("config-show-size");
      yield* ctx.expectEqual(
        "hiding a column keeps the reader's row",
        state(ctx),
        `${describeConfig(config4)} content=470 x=-80 anchor=45 sel=45 last=escape`,
      );
      const keptAnchor = yield* ctx.expectSome(
        "the list still reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("config-list")),
      );
      yield* ctx.expectEqual(
        "the runtime anchor survives the hide",
        keptAnchor[0],
        JUMP_INDEX,
      );
      yield* frozenFollows(ctx, JUMP_INDEX);
      yield* ctx.expectEqual(
        "the selection survives the hide",
        selectedId(ctx),
        `${JUMP_INDEX}`,
      );
      yield* alignedColumn(ctx, "notes", JUMP_INDEX);
      ctx.host.click("config-show-size");
      yield* ctx.expectEqual(
        "showing the column restores the content width",
        field(ctx, "content"),
        contentWidthOf(config5, widths0),
      );
      yield* alignedColumn(ctx, "size", JUMP_INDEX);
      ctx.host.key("escape");

      // A width set before a hide is still there after the show.
      ctx.host.click("config-widen");
      yield* ctx.expectEqual(
        "the widened column grows the content",
        field(ctx, "content"),
        contentWidthOf(config3, widths1),
      );
      const wideName = yield* boundsOrFail(
        ctx,
        "config-head-name",
        "the widened name header paints",
      );
      yield* ctx.expectNear(
        "the header paints the widened width",
        wideName.width,
        WIDE_NAME,
        1,
      );
      ctx.host.click("config-open");
      ctx.host.click("config-show-name");
      yield* ctx.expectEqual(
        "hiding the widened column shrinks the content",
        field(ctx, "content"),
        contentWidthOf(config6, widths1),
      );
      yield* unpainted(
        ctx,
        "config-head-name",
        "the hidden widened column has no header",
      );
      const keptWideAnchor = yield* ctx.expectSome(
        "the list still reports its anchor after the shrink",
        Option.fromNullishOr(ctx.host.listScrollTop("config-list")),
      );
      yield* ctx.expectEqual(
        "the shrink keeps the reader's row",
        keptWideAnchor[0],
        JUMP_INDEX,
      );
      ctx.host.click("config-pan-end");
      yield* ctx.expectEqual(
        "the visible width no longer overflows",
        field(ctx, "x"),
        0,
      );
      yield* ctx.expectNear(
        "the runtime pan is back at the origin",
        panOffset(ctx),
        0,
        1,
      );
      ctx.host.click("config-open");
      ctx.host.click("config-show-name");
      yield* ctx.expectEqual(
        "showing the widened column restores its width",
        field(ctx, "content"),
        contentWidthOf(config3, widths1),
      );
      const restoredName = yield* boundsOrFail(
        ctx,
        "config-head-name",
        "the restored widened header paints",
      );
      yield* ctx.expectNear(
        "the restored column kept the widened width",
        restoredName.width,
        WIDE_NAME,
        1,
      );
      ctx.host.key("escape");

      // Reset restores order, visibility and every default width.
      ctx.host.click("config-reset");
      yield* ctx.expectEqual(
        "reset restores the default configuration",
        state(ctx),
        `${describeConfig(config0)} content=560 x=0 anchor=45 sel=45 last=escape`,
      );
      yield* ctx.expectNear(
        "reset restores the default width",
        (yield* boundsOrFail(
          ctx,
          "config-head-name",
          "the reset name header paints",
        )).width,
        200,
        1,
      );

      // An outside press dismisses without the panel taking focus back.
      ctx.host.click("config-open");
      ctx.host.click("config-outside");
      yield* ctx.expectEqual(
        "an outside press closes the panel",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("config-panel"))),
        true,
      );
      yield* ctx.expectEqual(
        "the outside close names itself",
        lastReason(ctx),
        "outside",
      );
      yield* ctx.expectEqual(
        "the dismissal does not return focus to the panel",
        focusedId(ctx),
        "none",
      );

      // A configuration shrink clamps a panned scroller at once — the same
      // runtime behaviour plan `349` measured for a resize.
      ctx.host.click("config-pan-end");
      yield* ctx.expectNear(
        "the pan starts from the default maximum",
        panOffset(ctx),
        maxPanOf(config0, widths0, VIEWPORT),
        1,
      );
      ctx.host.click("config-open");
      ctx.host.click("config-show-notes");
      yield* ctx.expectEqual(
        "hiding the last column narrows the content",
        field(ctx, "content"),
        contentWidthOf(config7, widths0),
      );
      yield* ctx.expectNear(
        "the runtime clamps the panned offset at once",
        panOffset(ctx),
        maxPanOf(config7, widths0, VIEWPORT),
        1,
      );
      ctx.host.click("config-pan-end");
      yield* ctx.expectNear(
        "the readout agrees with the clamped offset",
        field(ctx, "x"),
        maxPanOf(config7, widths0, VIEWPORT),
        1,
      );
      ctx.host.click("config-open");
      ctx.host.click("config-show-notes");
      yield* ctx.expectEqual(
        "showing the last column restores the full width",
        field(ctx, "content"),
        560,
      );
      ctx.host.key("escape");
    }),
};
