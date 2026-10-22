/**
 * Row selection, as pure data keyed by record.
 *
 * The rules are the ones `modifier-select-lifecycle` measured in a window: a
 * plain press replaces the set and becomes the anchor, a chorded press toggles
 * one record and moves the anchor, and a range press extends from the anchor
 * and **keeps** it. A press names a record, never an index, so a sort or a
 * filter cannot move the selection onto a different row — and a filtered set
 * that hides a chosen record clears it rather than keeping it invisibly
 * (`table-filter-lifecycle`).
 *
 * Nothing here imports React: the hook is a thin `useState` over these
 * reducers, and an application can drive the same rules from Effect.
 */

import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";

/** How a press changes the set. */
export type PressMode = "replace" | "toggle" | "range";

/** The runtime's modifier flags, as a click reports them. */
export interface PressModifiers {
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly cmd?: boolean;
}

/** The state a selection column and a row read. */
export interface SelectionState {
  /** Chosen records, by key. */
  readonly selected: HashSet.HashSet<string>;
  /** The record a range extends from, when there is one. */
  readonly anchor: Option.Option<string>;
}

/** Nothing chosen, and no anchor. */
export const emptySelection: SelectionState = {
  selected: HashSet.empty(),
  anchor: Option.none(),
};

/**
 * The mode a press means.
 *
 * `shift` wins over the toggle chord: Shift+Cmd extends a range, which is the
 * order the window's probe reported.
 */
export const pressMode = (modifiers: PressModifiers = {}): PressMode =>
  modifiers.shift === true
    ? "range"
    : modifiers.cmd === true || modifiers.ctrl === true
      ? "toggle"
      : "replace";

/** Whether a record is chosen. */
export const isSelected = (state: SelectionState, key: string): boolean =>
  HashSet.has(state.selected, key);

/** How many records are chosen. */
export const selectionSize = (state: SelectionState): number =>
  HashSet.size(state.selected);

/** The index of a key in the visible order. */
const indexIn = (
  order: ReadonlyArray<string>,
  key: string,
): Option.Option<number> =>
  Arr.findFirstIndex(order, (candidate) => candidate === key);

/**
 * Apply a press.
 *
 * `order` is the visible order the range is measured in — the filtered and
 * sorted keys, not the source array — because Shift extends over what the
 * reader can see.
 */
export const pressSelection = (
  state: SelectionState,
  key: string,
  mode: PressMode,
  order: ReadonlyArray<string>,
): SelectionState => {
  if (mode === "toggle") {
    const selected = HashSet.has(state.selected, key)
      ? HashSet.remove(state.selected, key)
      : HashSet.add(state.selected, key);
    return { selected, anchor: Option.some(key) };
  }
  if (mode === "range") {
    const from = Option.flatMap(state.anchor, (anchor) =>
      indexIn(order, anchor),
    );
    const to = indexIn(order, key);
    if (Option.isNone(from) || Option.isNone(to)) {
      return { selected: HashSet.make(key), anchor: Option.some(key) };
    }
    const start = Math.min(from.value, to.value);
    const count = Math.abs(from.value - to.value) + 1;
    const spanned = Arr.take(Arr.drop(order, start), count);
    return {
      selected: Arr.reduce(spanned, state.selected, (selected, key) =>
        HashSet.add(selected, key),
      ),
      // A range keeps the anchor: extending again must still start where the
      // reader's first plain press landed.
      anchor: state.anchor,
    };
  }
  return { selected: HashSet.make(key), anchor: Option.some(key) };
};

/** Choose every record in the visible order. */
export const selectAll = (
  _state: SelectionState,
  order: ReadonlyArray<string>,
): SelectionState => ({
  selected: HashSet.fromIterable(order),
  anchor: Option.none(),
});

/** Clear the set and the anchor. */
export const clearSelection = (_state: SelectionState): SelectionState =>
  emptySelection;

/**
 * Keep only the chosen records the visible set still holds.
 *
 * This is the rule a filter owes: a selection the narrower set hides is
 * cleared, while one the set still holds — including a clear — survives. An
 * anchor that left the set is dropped, so a later range cannot span rows the
 * reader cannot see.
 */
export const retainSelection = (
  state: SelectionState,
  visible: ReadonlyArray<string>,
): SelectionState => {
  const shown = HashSet.fromIterable(visible);
  return {
    selected: HashSet.filter(state.selected, (key) => HashSet.has(shown, key)),
    anchor: Option.filter(state.anchor, (key) => HashSet.has(shown, key)),
  };
};

/** The record the reader is standing on: the anchor while it is chosen. */
export const currentKey = (state: SelectionState): Option.Option<string> =>
  Option.filter(state.anchor, (key) => HashSet.has(state.selected, key));

/**
 * The key one step away in a visible order, clamped at both ends.
 *
 * Exported because a table's arrow key needs the same step the selection takes:
 * move the set and move native focus to the same row. `current` absent starts at
 * the first row regardless of direction, which is what a first ArrowDown on a
 * table with nothing chosen should do.
 */
export const neighbourKey = (
  order: ReadonlyArray<string>,
  current: Option.Option<string>,
  delta: number,
): Option.Option<string> =>
  Option.match(
    Option.flatMap(current, (key) => indexIn(order, key)),
    {
      onNone: () => Option.fromNullishOr(order[0]),
      onSome: (index) =>
        Option.fromNullishOr(
          order[Math.max(0, Math.min(order.length - 1, index + delta))],
        ),
    },
  );

/**
 * Move the chosen record one step in the visible order.
 *
 * The move clamps at both ends rather than wrapping: a table's arrow key walks
 * the rows, and jumping from the last row to the first is not a step. A move
 * replaces the set and moves the anchor, like a plain press.
 */
export const moveSelection = (
  state: SelectionState,
  order: ReadonlyArray<string>,
  delta: number,
): SelectionState =>
  Option.match(neighbourKey(order, currentKey(state), delta), {
    onNone: () => state,
    onSome: (key) => ({
      selected: HashSet.make(key),
      anchor: Option.some(key),
    }),
  });
