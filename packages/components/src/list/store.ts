/**
 * The per-row selection state a {@link ListItem} subscribes to.
 *
 * A list re-renders when its selection moves. With one context value carrying
 * the selection, every row re-rendered with it; this store lets a row subscribe
 * to its own slice, so only the rows whose state changed paint.
 *
 * The snapshot is cached per value and reused while that row's state is
 * unchanged — React compares the snapshot by identity, so a fresh object on
 * every write would re-render every subscriber.
 */

import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";

/** What one row draws. */
export interface RowState {
  readonly active: boolean;
  readonly selected: boolean;
  readonly tabbable: boolean;
}

/** The one snapshot every row with no state shares. */
const idle: RowState = { active: false, selected: false, tabbable: false };

/** The selection a list writes on every change. */
export interface ListSelection {
  readonly active: Option.Option<string>;
  readonly selected: ReadonlyArray<string>;
  readonly tabbable: Option.Option<string>;
}

/** A row's slice of the selection, readable and subscribable. */
export interface RowStore {
  /** Register a listener; returns the unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void;
  /** The snapshot for `value`; the same object while that row is unchanged. */
  readonly read: (value: string) => RowState;
  /** Publish a new selection to every subscriber. */
  readonly write: (selection: ListSelection) => void;
}

const sameSnapshot = (left: RowState, right: RowState): boolean =>
  left.active === right.active &&
  left.selected === right.selected &&
  left.tabbable === right.tabbable;

/** A store for one list. */
export const makeRowStore = (): RowStore => {
  let selection: ListSelection = {
    active: Option.none(),
    selected: Arr.empty(),
    tabbable: Option.none(),
  };
  // Only rows off the idle snapshot need an entry, so the map holds at most
  // the active row, the tab stop and the selected rows.
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
