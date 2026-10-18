/**
 * The pure model behind `grid-cell-editing` (plan `387`): one editable cell,
 * one row menu and the rules that keep them truthful inside a virtualized grid.
 *
 * The grid primitives are plan `338`'s (`GridRow`, `Anchor`, `sortRows`); this
 * model adds only the editing state, so the parts a grid must get right —
 * which row is being edited, when an edit ends, what a menu's dismissal
 * records, and what survives a row-set change — are provable without a
 * renderer.
 *
 * Measured facts and the contract: plan `387` §9.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { Anchor, GridRow } from "./data-grid-model.js";

/** The probe's row count. */
export const ROW_COUNT = 60;
/** One row's height; the list and the model agree on it. */
export const ROW_HEIGHT = 32;
/** The list's viewport height. */
export const LIST_HEIGHT = 320;

const pad = (id: number): string => Str.padStart(2, "0")(`${id}`);

/** `item-00` … `item-59`; the zero-padded name order is the id order. */
export const makeRows = (): ReadonlyArray<GridRow> =>
  Arr.map(Arr.range(0, ROW_COUNT - 1), (id) => ({
    id,
    name: `item-${pad(id)}`,
    kind: id % 2 === 0 ? "dir" : "file",
    size: id * 4,
  }));

/** What the last user action did. */
export const LastAction = [
  "start",
  "edit",
  "draft",
  "commit",
  "cancel",
  "leave",
  "select",
  "panel",
  "escape",
  "outside",
  "scroll",
  "delete",
  "rename",
  "sort",
] as const;
/** What the last user action did. */
export type LastAction = (typeof LastAction)[number];

/** Everything the editable grid renders. */
export interface EditorState {
  readonly rows: ReadonlyArray<GridRow>;
  readonly editing: Option.Option<number>;
  readonly draft: string;
  readonly selected: Option.Option<number>;
  readonly panel: Option.Option<number>;
  readonly commits: number;
  readonly keys: number;
  readonly last: LastAction;
}

/** The baseline: nothing edited, selected or open. */
export const initial = (rows: ReadonlyArray<GridRow>): EditorState => ({
  rows,
  editing: Option.none(),
  draft: "",
  selected: Option.none(),
  panel: Option.none(),
  commits: 0,
  keys: 0,
  last: "start",
});

const nameOf = (
  rows: ReadonlyArray<GridRow>,
  id: number,
): Option.Option<string> =>
  Option.map(
    Arr.findFirst(rows, (row) => row.id === id),
    (row) => row.name,
  );

/**
 * Opens `id` for editing with its committed name as the draft.
 *
 * `reason` names the path that opened it (`edit` for the cell, `rename` for the
 * row menu), so the readout can tell a click from a menu action.
 */
export const beginEdit = (
  state: EditorState,
  id: number,
  reason: LastAction = "edit",
): EditorState =>
  Option.match(nameOf(state.rows, id), {
    onNone: () => state,
    onSome: (name) => ({
      ...state,
      editing: Option.some(id),
      draft: name,
      last: reason,
    }),
  });

/** Records a draft edit; a no-op when nothing is being edited. */
export const editDraft = (state: EditorState, value: string): EditorState =>
  Option.isNone(state.editing) || state.draft === value
    ? state
    : { ...state, draft: value, last: "draft" };

/** Writes the draft to its row, clears the edit and counts the commit. */
const finish = (state: EditorState, last: LastAction): EditorState =>
  Option.match(state.editing, {
    onNone: () => state,
    onSome: (id) => ({
      ...state,
      rows: Arr.map(state.rows, (row) =>
        row.id === id ? { ...row, name: state.draft } : row,
      ),
      editing: Option.none(),
      draft: "",
      commits: state.commits + 1,
      last,
    }),
  });

/** Enter: keep the draft. */
export const commit = (state: EditorState): EditorState =>
  finish(state, "commit");

/** Escape: discard the draft and leave the committed value alone. */
export const cancel = (state: EditorState): EditorState =>
  Option.isNone(state.editing)
    ? state
    : { ...state, editing: Option.none(), draft: "", last: "cancel" };

/**
 * Commits when the editing row left the visible window.
 *
 * A focused row keeps native focus when the list scrolls past it (plan `158`),
 * so without this rule the user keeps typing into a field they cannot see.
 */
export const endEditingOutside = (
  state: EditorState,
  visible: ReadonlyArray<number>,
): EditorState =>
  Option.match(state.editing, {
    onNone: () => state,
    onSome: (id) =>
      Arr.contains(visible, id) ? state : finish(state, "leave"),
  });

/** Selects a row; the grid's arrow keys move from it. */
export const select = (state: EditorState, id: number): EditorState =>
  Option.contains(state.selected, id)
    ? state
    : { ...state, selected: Option.some(id), last: "select" };

/**
 * A press on a row: the first selects it, a second opens its editor.
 *
 * 0.10.0 delivers no double click, so "press the selected row again" is the
 * in-window way to start an edit without a separate affordance in every row.
 */
export const activate = (state: EditorState, id: number): EditorState =>
  Option.contains(state.selected, id)
    ? beginEdit(state, id)
    : select(state, id);

/** Moves the selection by `step` in `rows`; an edge keeps the current row. */
export const moveSelection = (
  state: EditorState,
  rows: ReadonlyArray<GridRow>,
  step: number,
): EditorState => {
  const index = Option.flatMap(state.selected, (id) =>
    Arr.findFirstIndex(rows, (row) => row.id === id),
  );
  const target = Option.match(index, {
    onNone: () => Arr.head(rows),
    onSome: (value) => Arr.get(rows, value + step),
  });
  return Option.match(target, {
    onNone: () => state,
    onSome: (row) =>
      Option.contains(state.selected, row.id)
        ? state
        : { ...state, selected: Option.some(row.id), last: "select" },
  });
};

/** Opens the row menu for `id`. */
export const openPanel = (state: EditorState, id: number): EditorState => ({
  ...state,
  panel: Option.some(id),
  last: "panel",
});

/** Closes the row menu, recording why (`escape`, `outside`, `scroll`, `delete`). */
export const closePanel = (
  state: EditorState,
  reason: LastAction,
): EditorState =>
  Option.isNone(state.panel)
    ? state
    : { ...state, panel: Option.none(), last: reason };

/** Removes one row and clears any state that named it. */
export const deleteRow = (state: EditorState, id: number): EditorState => {
  const rows = Arr.filter(state.rows, (row) => row.id !== id);
  if (rows.length === state.rows.length) return state;
  const editing = Option.contains(state.editing, id)
    ? Option.none<number>()
    : state.editing;
  return {
    ...state,
    rows,
    editing,
    draft: Option.isNone(editing) ? "" : state.draft,
    selected: Option.contains(state.selected, id)
      ? Option.none<number>()
      : state.selected,
    panel: Option.contains(state.panel, id)
      ? Option.none<number>()
      : state.panel,
    last: "delete",
  };
};

/** One key reached the grid container — the bubbling proof, counted. */
export const noteKey = (state: EditorState): EditorState => ({
  ...state,
  keys: state.keys + 1,
});

/**
 * A row-set change (sort) ends an open edit and closes the menu.
 *
 * The draft is committed: the user asked for a new order, not for their typed
 * text to be thrown away, and the row keeps its id across the reorder.
 */
export const sorting = (state: EditorState): EditorState => ({
  ...finish(state, "sort"),
  panel: Option.none(),
  last: "sort",
});

/**
 * The rows a 320 px viewport shows for `anchor`, without overdraw.
 *
 * `anchoredWindow` (plan `338`) adds a row of overdraw on each side; that is
 * right for painting and wrong for "is the editing row visible", which decides
 * whether an edit ends.
 */
export const visibleIds = (
  rows: ReadonlyArray<GridRow>,
  anchor: Anchor,
  viewport: number,
  rowHeight: number,
): ReadonlyArray<number> => {
  if (rows.length === 0 || rowHeight <= 0) return [];
  const first = Math.max(0, Math.floor(anchor.index));
  const count = Math.ceil((viewport + anchor.offset) / rowHeight);
  return Arr.getSomes(
    Arr.map(Arr.range(first, first + count - 1), (index) =>
      Option.map(Arr.get(rows, index), (row) => row.id),
    ),
  );
};

const optionId = (value: Option.Option<number>): string =>
  Option.match(value, {
    onNone: () => "none",
    onSome: (id) => `${id}`,
  });

/**
 * `editing=none draft=- commits=0 rows=60 sel=none panel=none keys=0 last=start`
 *
 * Every field is one token: row names are hyphenated, so a typed draft never
 * introduces a space the readout parser would split.
 */
export const describe = (state: EditorState): string =>
  Arr.join(
    [
      `editing=${optionId(state.editing)}`,
      `draft=${state.draft === "" ? "-" : state.draft}`,
      `commits=${state.commits}`,
      `rows=${state.rows.length}`,
      `sel=${optionId(state.selected)}`,
      `panel=${optionId(state.panel)}`,
      `keys=${state.keys}`,
      `last=${state.last}`,
    ],
    " ",
  );
