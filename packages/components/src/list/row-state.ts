/**
 * The per-row paint state for `List`.
 *
 * A row subscribes to its own bit mask instead of reading one shared context, so
 * a roving-focus move re-renders the row that lost the ring and the row that
 * gained it — not every row in the list (plan 339). `replace` compares the new
 * map with the old one and notifies only when something a row paints changed.
 *
 * No React and no GPUix: this is the same pure-core shape as `core/runtime.ts`.
 */

import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";

/** The row carries the list's roving focus ring. */
export const ACTIVE = 1;

/** The row reports a selection. */
export const SELECTED = 2;

/** The row owns the list's tab stop. */
export const TABBABLE = 4;

/** One row's paint state, keyed by its value. */
export interface RowMasks {
  /** The mask for `value`; `0` when the row is not registered. */
  readonly get: (value: string) => number;
  /** Register a listener; returns its unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace every row's mask, notifying once when any mask changed. */
  readonly replace: (
    next: ReadonlyArray<readonly [value: string, mask: number]>,
  ) => void;
}

/** Create the store one `List` owns for its lifetime. */
export const createRowMasks = (): RowMasks => {
  let masks: HashMap.HashMap<string, number> = HashMap.empty();
  const listeners = MutableHashMap.empty<number, () => void>();
  let nextListener = 0;

  const unchanged = (next: ReadonlyArray<readonly [string, number]>): boolean =>
    HashMap.size(masks) === Arr.length(next) &&
    Arr.every(
      next,
      ([value, mask]) =>
        Option.getOrElse(HashMap.get(masks, value), () => -1) === mask,
    );

  return {
    get: (value) => Option.getOrElse(HashMap.get(masks, value), () => 0),
    subscribe: (listener) => {
      const id = nextListener;
      nextListener += 1;
      MutableHashMap.set(listeners, id, listener);
      return () => {
        MutableHashMap.remove(listeners, id);
      };
    },
    replace: (next) => {
      if (unchanged(next)) return;
      masks = HashMap.fromIterable(next);
      MutableHashMap.forEach(listeners, (listener) => listener());
    },
  };
};
