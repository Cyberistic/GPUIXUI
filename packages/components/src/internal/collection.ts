/**
 * The ordered-item registry behind List (single selection), Tabs and every
 * menu: which item is next when a key moves, and which items a click cannot
 * reach. It exists so index arithmetic over a mixed enabled/disabled list is
 * written and tested once instead of in five components.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

/** One registered row: a host element id and whether it accepts input. */
export interface CollectionItem {
  readonly id: number;
  readonly disabled: boolean;
}

/** A declaration-ordered registry of rows. */
export interface Collection {
  /** Add or replace a row by id. Returns the unregister function. */
  readonly register: (item: CollectionItem) => () => void;
  /** The rows, in the order they registered. */
  readonly items: () => ReadonlyArray<CollectionItem>;
}

/** Add `item`, replacing any row with the same id so order never drifts. */
export const insert = (
  items: ReadonlyArray<CollectionItem>,
  item: CollectionItem,
): ReadonlyArray<CollectionItem> =>
  Arr.some(items, (existing) => existing.id === item.id)
    ? Arr.map(items, (existing) => (existing.id === item.id ? item : existing))
    : Arr.append(items, item);

/** Drop the row with `id`. */
export const remove = (
  items: ReadonlyArray<CollectionItem>,
  id: number,
): ReadonlyArray<CollectionItem> =>
  Arr.filter(items, (existing) => existing.id !== id);

/** The indexes of every row that accepts input, ascending. */
export const enabledIndexes = (
  items: ReadonlyArray<CollectionItem>,
): ReadonlyArray<number> =>
  Arr.map(
    Arr.filter(
      Arr.map(items, (item, index) => ({ index, disabled: item.disabled })),
      (entry) => !entry.disabled,
    ),
    (entry) => entry.index,
  );

const nth = (
  indexes: ReadonlyArray<number>,
  position: number,
): Option.Option<number> => Option.fromNullishOr(indexes[position]);

/** The first enabled index, or `None` when every row is disabled. */
export const firstEnabled = (
  items: ReadonlyArray<CollectionItem>,
): Option.Option<number> => nth(enabledIndexes(items), 0);

/** The last enabled index, or `None` when every row is disabled. */
export const lastEnabled = (
  items: ReadonlyArray<CollectionItem>,
): Option.Option<number> =>
  pipe(nth(enabledIndexes(items), Arr.length(enabledIndexes(items)) - 1));

/** The position of a row id in the collection, or `None`. */
export const indexOfId = (
  items: ReadonlyArray<CollectionItem>,
  id: number,
): Option.Option<number> => Arr.findFirstIndex(items, (item) => item.id === id);

/**
 * The enabled index one step from `current`, skipping disabled rows and
 * wrapping at both ends. `current` is a collection index, not a position among
 * the enabled rows. `None` only when every row is disabled.
 *
 * From a disabled or unknown `current`, the move continues in `delta`'s
 * direction and wraps, which is what an arrow key over a list with a disabled
 * row under it should do.
 */
export const nextEnabled = (
  items: ReadonlyArray<CollectionItem>,
  current: Option.Option<number>,
  delta: 1 | -1,
): Option.Option<number> => {
  const pool = enabledIndexes(items);
  const size = Arr.length(pool);
  if (size === 0) return Option.none();

  const step = (position: number) =>
    nth(pool, (position + delta + size) % size);

  return pipe(
    current,
    Option.match({
      onNone: () => (delta > 0 ? nth(pool, 0) : nth(pool, size - 1)),
      onSome: (index) =>
        pipe(
          Arr.findFirstIndex(pool, (candidate) => candidate === index),
          Option.match({
            onSome: step,
            onNone: () =>
              delta > 0
                ? pipe(
                    Arr.findFirst(pool, (candidate) => candidate > index),
                    Option.orElse(() => nth(pool, 0)),
                  )
                : pipe(
                    Arr.findLast(pool, (candidate) => candidate < index),
                    Option.orElse(() => nth(pool, size - 1)),
                  ),
          }),
        ),
    }),
  );
};

/** A mutable registry for a React tree: rows register in layout order. */
export const createCollection = (): Collection => {
  let entries: ReadonlyArray<CollectionItem> = [];
  return {
    register: (item) => {
      entries = insert(entries, item);
      return () => {
        entries = remove(entries, item.id);
      };
    },
    items: () => entries,
  };
};
