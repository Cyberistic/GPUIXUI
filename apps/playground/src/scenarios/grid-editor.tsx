/**
 * `grid-cell-editing` — the composition a data grid needs beyond sorting and
 * panning (plan `387`): one editable cell and one row menu inside a
 * `<virtual-list>`.
 *
 * Plans `348`, `338` and `164` measured the pieces separately. This probe
 * measures what only the composition answers:
 *
 * - where native focus and the typed keys go when the editing row leaves the
 *   painted window (and why an edit must end there);
 * - whether an ancestor grid key handler sees the editor's keys, so navigation
 *   needs a guard;
 * - whether a row-anchored menu stays truthful when the list scrolls (its
 *   window point does not move with the row);
 * - what a row-set change does to a draft that belongs to a row id.
 *
 * The editing rules are pure (`grid-editor-model.ts`); the view and the
 * scenario's expectations call the same functions.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import {
  ariaOf,
  focusedId,
  read,
  readoutField,
  readoutNumber,
} from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import type { Anchor, GridRow, SortDirection } from "./data-grid-model.js";
import { sortRows } from "./data-grid-model.js";
import type { EditorState, LastAction } from "./grid-editor-model.js";
import {
  LIST_HEIGHT,
  ROW_HEIGHT,
  activate,
  beginEdit,
  cancel,
  closePanel,
  commit,
  deleteRow,
  describe as describeEditor,
  editDraft,
  endEditingOutside,
  initial,
  makeRows,
  moveSelection,
  noteKey,
  openPanel,
  sorting,
  visibleIds,
} from "./grid-editor-model.js";

const READOUT = "ge-state";

/** A panel point in window coordinates. */
interface Point {
  readonly x: number;
  readonly y: number;
}

interface RowHandlers {
  readonly activate: (id: number) => void;
  readonly draft: (value: string) => void;
  readonly commit: () => void;
  readonly cancel: () => void;
  readonly open: (id: number) => void;
  readonly close: (reason: LastAction) => void;
  readonly rename: (id: number) => void;
  readonly remove: (id: number) => void;
  readonly register: (id: number, instance: PublicInstance | null) => void;
}

const EditorRow = ({
  row,
  state,
  point,
  handlers,
}: {
  readonly row: GridRow;
  readonly state: EditorState;
  readonly point: Option.Option<Point>;
  readonly handlers: RowHandlers;
}) => {
  const theme = useTheme();
  const editing = Option.contains(state.editing, row.id);
  const selected = Option.contains(state.selected, row.id);
  const open = Option.contains(state.panel, row.id);
  const value: StyleDesc = {
    width: 180,
    height: 26,
    justifyContent: "center",
    paddingLeft: theme.spacing.sm,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  };

  return (
    <div
      testId={`ge-row-${row.id}`}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: ROW_HEIGHT,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: selected ? theme.colors.accent : theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <div
        testId={`ge-cell-${row.id}`}
        role="gridcell"
        aria-id={`ge-cell-${row.id}`}
        aria-label={`Row ${row.id}`}
        aria-selected={selected}
        tabIndex={0}
        onClick={() => handlers.activate(row.id)}
        style={value}
      >
        {editing ? (
          <input
            testId={`ge-editor-${row.id}`}
            aria-id={`ge-editor-${row.id}`}
            aria-label={`Name for row ${row.id}`}
            autoFocus
            value={state.draft}
            onChange={(event) => handlers.draft(event.value ?? "")}
            onSubmit={handlers.commit}
            onKeyDown={(event) => {
              if (event.key === "escape") handlers.cancel();
            }}
            style={{
              width: 168,
              height: 24,
              padding: 4,
              color: theme.colors.inputForeground,
              backgroundColor: theme.colors.input,
              borderRadius: theme.radius.sm,
            }}
          />
        ) : (
          <text
            testId={`ge-value-${row.id}`}
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            {row.name}
          </text>
        )}
      </div>
      <text
        testId={`ge-size-${row.id}`}
        style={{
          ...textStyle(theme, "caption"),
          width: 64,
          color: theme.colors.mutedForeground,
        }}
      >
        {`${row.size} B`}
      </text>
      <div
        testId={`ge-menu-${row.id}`}
        ref={(instance) => handlers.register(row.id, instance)}
        role="button"
        aria-id={`ge-menu-${row.id}`}
        aria-label="Row actions"
        tabIndex={0}
        onClick={() => handlers.open(row.id)}
        style={{
          width: 44,
          height: 24,
          justifyContent: "center",
          cursor: "pointer",
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
          hover: { backgroundColor: theme.colors.border },
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          menu
        </text>
      </div>
      {open
        ? Option.match(point, {
            onNone: () => null,
            onSome: (at) => (
              <anchored
                position={at}
                deferred
                priority={1}
                occlude
                style={{ position: "absolute" }}
              >
                <div
                  testId="ge-menu-panel"
                  role="group"
                  aria-id="ge-menu-panel"
                  aria-label="Row actions"
                  tabIndex={-1}
                  autoFocus
                  onMouseDownOutside={() => handlers.close("outside")}
                  onKeyDown={(event) => {
                    if (event.key === "escape") handlers.close("escape");
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: 160,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.card,
                    borderWidth: theme.borderWidth.thin,
                    borderColor: theme.colors.border,
                  }}
                >
                  <div
                    testId="ge-menu-rename"
                    role="button"
                    aria-label="Rename row"
                    tabIndex={0}
                    onClick={() => handlers.rename(row.id)}
                    style={{
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.sm,
                      cursor: "pointer",
                      hover: { backgroundColor: theme.colors.muted },
                    }}
                  >
                    <text
                      style={{
                        ...textStyle(theme, "caption"),
                        color: theme.colors.foreground,
                      }}
                    >
                      Rename
                    </text>
                  </div>
                  <div
                    testId="ge-menu-delete"
                    role="button"
                    aria-label="Delete row"
                    tabIndex={0}
                    onClick={() => handlers.remove(row.id)}
                    style={{
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.sm,
                      cursor: "pointer",
                      hover: { backgroundColor: theme.colors.muted },
                    }}
                  >
                    <text
                      style={{
                        ...textStyle(theme, "caption"),
                        color: theme.colors.destructive,
                      }}
                    >
                      Delete
                    </text>
                  </div>
                </div>
              </anchored>
            ),
          })
        : null}
    </div>
  );
};

const GridCellEditingProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const actions = useRef(new Map<number, PublicInstance>());
  const anchorRef = useRef<Anchor>({ index: 0, offset: 0 });
  const [state, setState] = useState(() => initial(makeRows()));
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [anchor, setAnchor] = useState<Anchor>(anchorRef.current);
  const [point, setPoint] = useState(Option.none<Point>());

  const ordered = sortRows(state.rows, direction);

  /** Ends an edit and closes a menu when the viewport moved past them. */
  const applyViewport = (next: Anchor): void => {
    anchorRef.current = next;
    setAnchor(next);
    setState((current) =>
      closePanel(
        endEditingOutside(
          current,
          visibleIds(
            sortRows(current.rows, direction),
            next,
            LIST_HEIGHT,
            ROW_HEIGHT,
          ),
        ),
        "scroll",
      ),
    );
  };

  /** The list's post-scroll anchor; the payload lags a gesture, this does not. */
  const syncAnchor = (): void => {
    const instance = list.current;
    if (!instance) return;
    const next = renderer?.getListScrollTop?.(instance.id);
    if (!next) return;
    const moved: Anchor = { index: next[0] ?? 0, offset: next[1] ?? 0 };
    if (
      moved.index === anchorRef.current.index &&
      moved.offset === anchorRef.current.offset
    ) {
      // A row-set change can hide the editing row without moving the anchor.
      setState((current) =>
        endEditingOutside(
          current,
          visibleIds(
            sortRows(current.rows, direction),
            anchorRef.current,
            LIST_HEIGHT,
            ROW_HEIGHT,
          ),
        ),
      );
      return;
    }
    applyViewport(moved);
  };

  const jump = (index: number): void => {
    const instance = list.current;
    if (!instance) return;
    renderer?.scrollToItem?.(instance.id, index);
    applyViewport({ index, offset: 0 });
  };

  const handlers: RowHandlers = {
    activate: (id) => setState((current) => activate(current, id)),
    draft: (value) => setState((current) => editDraft(current, value)),
    commit: () => setState((current) => commit(current)),
    cancel: () => setState((current) => cancel(current)),
    open: (id) => {
      const instance = actions.current.get(id);
      if (!instance) return;
      const bounds = renderer?.getElementBounds?.(instance.id);
      if (!bounds) return;
      setPoint(Option.some({ x: bounds.x, y: bounds.y + bounds.height }));
      setState((current) => openPanel(current, id));
    },
    close: (reason) => {
      const id = Option.getOrElse(state.panel, () => -1);
      setState((current) => closePanel(current, reason));
      setPoint(Option.none());
      if (reason !== "escape") return;
      const instance = actions.current.get(id);
      if (instance) renderer?.focusElement?.(instance.id);
    },
    rename: (id) => {
      setState((current) =>
        beginEdit(closePanel(current, "rename"), id, "rename"),
      );
      setPoint(Option.none());
    },
    remove: (id) => {
      setState((current) => deleteRow(current, id));
      setPoint(Option.none());
    },
    register: (id, instance) => {
      if (instance) actions.current.set(id, instance);
    },
  };

  const sort = (): void => {
    setState((current) => sorting(current));
    setDirection((current) => (current === "asc" ? "desc" : "asc"));
    const instance = list.current;
    if (instance) renderer?.scrollToItem?.(instance.id, 0);
    anchorRef.current = { index: 0, offset: 0 };
    setAnchor(anchorRef.current);
    setPoint(Option.none());
  };

  return (
    <div
      testId="ge-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 720,
        padding: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable testId="ge-sort" onClick={sort}>
          <text style={{ color: theme.colors.foreground }}>
            {`sort: ${direction}`}
          </text>
        </Pressable>
        <Pressable testId="ge-jump" onClick={() => jump(45)}>
          <text style={{ color: theme.colors.foreground }}>jump</text>
        </Pressable>
        <Pressable testId="ge-top" onClick={() => jump(0)}>
          <text style={{ color: theme.colors.foreground }}>top</text>
        </Pressable>
        <div
          testId="ge-outside"
          style={{
            width: 120,
            height: 32,
            backgroundColor: theme.colors.muted,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Readout testId={READOUT}>
          {`${describeEditor(state)} anchor=${anchor.index} sort=${direction}`}
        </Readout>
        <text
          testId="ge-preview"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          {Option.getOrElse(
            Option.map(
              Option.flatMap(state.selected, (id) =>
                Arr.findFirst(state.rows, (row) => row.id === id),
              ),
              (row) => row.name,
            ),
            () => "none",
          )}
        </text>
      </div>

      <div
        testId="ge-grid"
        role="grid"
        aria-label="Editable rows"
        onKeyDown={(event) => {
          setState((current) => noteKey(current));
          if (Option.isSome(state.editing)) return;
          if (event.key === "down") {
            setState((current) => moveSelection(current, ordered, 1));
          }
          if (event.key === "up") {
            setState((current) => moveSelection(current, ordered, -1));
          }
        }}
        style={{ height: LIST_HEIGHT }}
      >
        <virtual-list
          testId="ge-list"
          ref={list}
          estimatedItemHeight={ROW_HEIGHT}
          onVisibleRange={syncAnchor}
          style={{ height: LIST_HEIGHT }}
        >
          {Arr.map(ordered, (row) => (
            <EditorRow
              key={row.id}
              row={row}
              state={state}
              point={point}
              handlers={handlers}
            />
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

const field = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, READOUT, key), () => "none");

const number = (ctx: Smoke.SmokeContext, key: string): number =>
  Option.getOrElse(readoutNumber(ctx, READOUT, key), () => -1);

const paints = (ctx: Smoke.SmokeContext, line: string): boolean =>
  Arr.some(ctx.host.paintedText(), (painted) => painted === line);

const boundsOf = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

const unpainted = (ctx: Smoke.SmokeContext, testId: string): boolean =>
  Option.isNone(Option.fromNullishOr(ctx.host.bounds(testId)));

/** Types `keys` as one space-separated native keystroke sequence. */
const type = (ctx: Smoke.SmokeContext, keys: ReadonlyArray<string>): void =>
  ctx.host.key(Arr.join(keys, " "));

export const gridCellEditingScenario: PlaygroundScenario = {
  id: "grid-cell-editing",
  title: "Editable grid cells: draft, commit, windowing and a row menu",
  capability: "cell-editing",
  view: () => <GridCellEditingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the editable grid frame painted",
        Option.fromNullishOr(ctx.host.bounds("ge-frame")),
      );
      yield* ctx.expectEqual(
        "the grid starts idle",
        read(ctx, "ge-state"),
        "editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start anchor=0 sort=asc",
      );
      const first = yield* boundsOf(ctx, "ge-row-0", "the first row painted");
      yield* ctx.expectNear("a grid row is 32 px tall", first.height, 32, 1);
      yield* ctx.expectEqual(
        "the first row paints its committed name",
        read(ctx, "ge-value-0"),
        "item-00",
      );
      yield* ctx.expectEqual(
        "a row past the window is not painted",
        unpainted(ctx, "ge-row-40"),
        true,
      );

      // 1. A cell press selects the row; a second press mounts a real editor.
      ctx.host.click("ge-cell-0");
      yield* ctx.expectEqual(
        "a first press selects the row",
        `${field(ctx, "sel")} ${field(ctx, "last")}`,
        "0 select",
      );
      ctx.host.click("ge-cell-0");
      yield* ctx.expectEqual(
        "a second press opens its editor",
        `${field(ctx, "editing")} ${field(ctx, "draft")} ${field(ctx, "last")}`,
        "0 item-00 edit",
      );
      yield* ctx.expectEqual(
        "the conditionally mounted editor takes native focus",
        focusedId(ctx),
        "ge-editor-0",
      );
      const editor = yield* ctx.expectSome(
        "the editor is exposed to assistive technology",
        ariaOf(ctx, "ge-editor-0"),
      );
      yield* ctx.expectEqual(
        "the editor is a TextInput with the committed value",
        `${Option.getOrElse(editor.role, () => "none")} ${Option.getOrElse(editor.value, () => "none")}`,
        "TextInput item-00",
      );

      // 2. Typing is a draft; the row keeps its committed value.
      ctx.host.key("cmd-a");
      type(ctx, ["b", "e", "t", "a"]);
      yield* ctx.expectEqual(
        "typing changes the draft only",
        `${field(ctx, "draft")} ${field(ctx, "commits")}`,
        "beta 0",
      );
      yield* ctx.expectEqual(
        "the committed value is unchanged before Enter",
        read(ctx, "ge-preview"),
        "item-00",
      );
      yield* ctx.expectEqual(
        "the editor paints its own draft",
        paints(ctx, "beta"),
        true,
      );

      // 3. The grid's own handler saw the editor's keys, and the guard stops it.
      const keysBefore = number(ctx, "keys");
      yield* ctx.expectEqual(
        "editor keystrokes bubble to the grid handler",
        keysBefore > 0,
        true,
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "an editing cell keeps grid selection still",
        field(ctx, "sel"),
        "0",
      );
      yield* ctx.expectEqual(
        "the down key still reached the grid handler",
        number(ctx, "keys") > keysBefore,
        true,
      );
      yield* ctx.expectEqual(
        "the caret key keeps native focus in the editor",
        focusedId(ctx),
        "ge-editor-0",
      );

      // 4. Enter commits through the editor's own submit.
      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "Enter commits the draft",
        `${field(ctx, "editing")} ${field(ctx, "commits")} ${field(ctx, "last")}`,
        "none 1 commit",
      );
      yield* ctx.expectEqual(
        "the committed value repaints the preview",
        read(ctx, "ge-preview"),
        "beta",
      );
      yield* ctx.expectEqual(
        "the committed value repaints the row",
        read(ctx, "ge-value-0"),
        "beta",
      );

      // 5. With no editor, the grid navigates.
      ctx.host.click("ge-cell-1");
      yield* ctx.expectEqual(
        "clicking a cell selects its row",
        `${field(ctx, "sel")} ${field(ctx, "last")}`,
        "1 select",
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down moves the grid selection",
        field(ctx, "sel"),
        "2",
      );
      ctx.host.key("up");
      yield* ctx.expectEqual("Up moves it back", field(ctx, "sel"), "1");

      // 6. An edit ends when its row leaves the window, and is committed.
      ctx.host.click("ge-cell-0");
      ctx.host.click("ge-cell-0");
      type(ctx, ["x"]);
      yield* ctx.expectEqual(
        "the second edit holds a draft",
        `${field(ctx, "editing")} ${field(ctx, "draft")}`,
        "0 betax",
      );
      ctx.host.scrollToItem("ge-list", 40);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the list anchors the jumped row",
        field(ctx, "anchor"),
        "40",
      );
      yield* ctx.expectEqual(
        "the edited row left the window",
        unpainted(ctx, "ge-row-0"),
        true,
      );
      yield* ctx.expectEqual(
        "leaving the window ends the edit",
        `${field(ctx, "editing")} ${field(ctx, "commits")} ${field(ctx, "last")}`,
        "none 2 leave",
      );
      ctx.host.scrollToItem("ge-list", 0);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the committed value survives the leave",
        read(ctx, "ge-value-0"),
        "betax",
      );

      // 7. A row menu opens at its action, unclipped, and takes focus.
      ctx.host.click("ge-menu-2");
      yield* ctx.expectEqual(
        "the row action opens its menu",
        `${field(ctx, "panel")} ${field(ctx, "last")}`,
        "2 panel",
      );
      const action = yield* boundsOf(
        ctx,
        "ge-menu-2",
        "the row action painted",
      );
      const panel = yield* boundsOf(
        ctx,
        "ge-menu-panel",
        "the row menu painted",
      );
      yield* ctx.expectNear(
        "the menu opens at its action's left edge",
        panel.x,
        action.x,
        1,
      );
      yield* ctx.expectNear(
        "the menu opens below its action",
        panel.y,
        action.y + action.height,
        1,
      );
      yield* ctx.expectEqual(
        "the menu takes native focus",
        focusedId(ctx),
        "ge-menu-panel",
      );
      const panelAria = yield* ctx.expectSome(
        "the menu is exposed to assistive technology",
        ariaOf(ctx, "ge-menu-panel"),
      );
      yield* ctx.expectEqual(
        "the menu is a named group",
        `${Option.getOrElse(panelAria.role, () => "none")} ${Option.getOrElse(panelAria.label, () => "none")}`,
        "Group Row actions",
      );

      // 8. Escape closes it and returns focus to the action.
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the menu and records it",
        `${field(ctx, "panel")} ${field(ctx, "last")}`,
        "none escape",
      );
      yield* ctx.expectEqual(
        "the closed menu unpaints",
        unpainted(ctx, "ge-menu-panel"),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the row action",
        focusedId(ctx),
        "ge-menu-2",
      );

      // 9. A menu action opens the editor for that row.
      ctx.host.click("ge-menu-2");
      ctx.host.click("ge-menu-rename");
      yield* ctx.expectEqual(
        "Rename starts editing the menu's row",
        `${field(ctx, "editing")} ${field(ctx, "panel")} ${field(ctx, "last")}`,
        "2 none rename",
      );
      yield* ctx.expectEqual(
        "Rename focuses the new editor",
        focusedId(ctx),
        "ge-editor-2",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape in the editor cancels the edit",
        `${field(ctx, "editing")} ${field(ctx, "last")}`,
        "none cancel",
      );

      // 10. Delete removes the named row and not another one.
      ctx.host.click("ge-menu-3");
      ctx.host.click("ge-menu-delete");
      yield* ctx.expectEqual(
        "delete removes its row",
        `${field(ctx, "rows")} ${field(ctx, "panel")} ${field(ctx, "last")}`,
        "59 none delete",
      );
      yield* ctx.expectEqual(
        "the deleted row unpaints",
        unpainted(ctx, "ge-row-3"),
        true,
      );
      yield* ctx.expectEqual(
        "the neighbouring row still paints",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("ge-row-2"))),
        true,
      );

      // 11. A scroll closes the menu instead of leaving a stale window point.
      ctx.host.click("ge-menu-4");
      ctx.host.scrollToItem("ge-list", 40);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a scroll closes the row menu",
        `${field(ctx, "panel")} ${field(ctx, "last")}`,
        "none scroll",
      );
      yield* ctx.expectEqual(
        "the scrolled-away menu unpaints",
        unpainted(ctx, "ge-menu-panel"),
        true,
      );

      // 12. An outside press dismisses without returning focus.
      ctx.host.click("ge-top");
      ctx.host.advance(50);
      ctx.host.click("ge-menu-4");
      ctx.host.click("ge-outside");
      yield* ctx.expectEqual(
        "an outside press closes the menu",
        `${field(ctx, "panel")} ${field(ctx, "last")}`,
        "none outside",
      );
      yield* ctx.expectEqual(
        "the outside-dismissed menu unpaints",
        unpainted(ctx, "ge-menu-panel"),
        true,
      );

      // 13. A sort commits the open edit and keeps it with its row id.
      ctx.host.click("ge-cell-1");
      ctx.host.click("ge-cell-1");
      type(ctx, ["z"]);
      yield* ctx.expectEqual(
        "the third edit holds a draft",
        `${field(ctx, "editing")} ${field(ctx, "draft")}`,
        "1 item-01z",
      );
      ctx.host.click("ge-sort");
      yield* ctx.expectEqual(
        "a sort ends the edit and commits it",
        `${field(ctx, "editing")} ${field(ctx, "commits")} ${field(ctx, "last")}`,
        "none 3 sort",
      );
      yield* ctx.expectEqual(
        "the sort flips the order",
        field(ctx, "sort"),
        "desc",
      );
      const last = yield* boundsOf(
        ctx,
        "ge-row-59",
        "the descending order's first row painted",
      );
      const top = yield* boundsOf(ctx, "ge-row-58", "its neighbour painted");
      yield* ctx.expectNear(
        "the descending order paints the highest id first",
        last.y,
        top.y - 32,
        1,
      );
      ctx.host.scrollToItem("ge-list", 55);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the committed edit follows its row id",
        read(ctx, "ge-value-1"),
        "item-01z",
      );
    }),
};

export { GridCellEditingProbe };
