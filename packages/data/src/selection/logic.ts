import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";

export type PressMode = "replace" | "toggle" | "range";

export interface PressModifiers {
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly cmd?: boolean;
}

export interface SelectionState {
  readonly selected: HashSet.HashSet<string>;

  readonly anchor: Option.Option<string>;
}

export const emptySelection: SelectionState = {
  selected: HashSet.empty(),
  anchor: Option.none(),
};

export const pressMode = (modifiers: PressModifiers = {}): PressMode =>
  modifiers.shift === true
    ? "range"
    : modifiers.cmd === true || modifiers.ctrl === true
      ? "toggle"
      : "replace";

export const isSelected = (state: SelectionState, key: string): boolean =>
  HashSet.has(state.selected, key);

export const selectionSize = (state: SelectionState): number =>
  HashSet.size(state.selected);

export const allSelected = (
  state: SelectionState,
  visible: ReadonlyArray<string>,
): boolean =>
  visible.length > 0 &&
  Arr.every(visible, (key) => HashSet.has(state.selected, key));

export const someSelected = (
  state: SelectionState,
  visible: ReadonlyArray<string>,
): boolean =>
  !allSelected(state, visible) &&
  Arr.some(visible, (key) => HashSet.has(state.selected, key));

const indexIn = (
  order: ReadonlyArray<string>,
  key: string,
): Option.Option<number> =>
  Arr.findFirstIndex(order, (candidate) => candidate === key);

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

      anchor: state.anchor,
    };
  }
  return { selected: HashSet.make(key), anchor: Option.some(key) };
};

export const selectAll = (
  _state: SelectionState,
  order: ReadonlyArray<string>,
): SelectionState => ({
  selected: HashSet.fromIterable(order),
  anchor: Option.none(),
});

export const clearSelection = (_state: SelectionState): SelectionState =>
  emptySelection;

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

export const currentKey = (state: SelectionState): Option.Option<string> =>
  Option.filter(state.anchor, (key) => HashSet.has(state.selected, key));

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
