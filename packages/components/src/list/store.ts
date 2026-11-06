import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";

export interface RowState {
  readonly active: boolean;
  readonly selected: boolean;
  readonly tabbable: boolean;
}

const idle: RowState = { active: false, selected: false, tabbable: false };

export interface ListSelection {
  readonly active: Option.Option<string>;
  readonly selected: ReadonlyArray<string>;
  readonly tabbable: Option.Option<string>;
}

export interface RowStore {
  readonly subscribe: (listener: () => void) => () => void;

  readonly read: (value: string) => RowState;

  readonly write: (selection: ListSelection) => void;
}

const sameSnapshot = (left: RowState, right: RowState): boolean =>
  left.active === right.active &&
  left.selected === right.selected &&
  left.tabbable === right.tabbable;

export const makeRowStore = (): RowStore => {
  let selection: ListSelection = {
    active: Option.none(),
    selected: Arr.empty(),
    tabbable: Option.none(),
  };

  let snapshots = HashMap.empty<string, RowState>();
  let listeners = HashSet.empty<() => void>();

  const read = (value: string): RowState => {
    const next: RowState = {
      active: Option.exists(
        selection.active,
        (candidate) => candidate === value,
      ),
      selected: Arr.contains(value)(selection.selected),
      tabbable: Option.exists(
        selection.tabbable,
        (candidate) => candidate === value,
      ),
    };
    const previous = Option.getOrElse(
      HashMap.get(snapshots, value),
      () => idle,
    );
    const snapshot = sameSnapshot(previous, next) ? previous : next;
    snapshots =
      snapshot === idle
        ? HashMap.remove(snapshots, value)
        : HashMap.set(snapshots, value, snapshot);
    return snapshot;
  };

  return {
    subscribe: (listener) => {
      listeners = HashSet.add(listeners, listener);
      return () => {
        listeners = HashSet.remove(listeners, listener);
      };
    },
    read,
    write: (next) => {
      selection = next;
      Arr.forEach(Arr.fromIterable(listeners), (listener) => listener());
    },
  };
};
