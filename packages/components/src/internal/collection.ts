import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

export interface CollectionItem {
  readonly id: number;
  readonly disabled: boolean;
}

export interface Collection {
  readonly register: (item: CollectionItem) => () => void;

  readonly items: () => ReadonlyArray<CollectionItem>;
}

export interface ValueItem extends CollectionItem {
  readonly value: string;
}

export const upsertValue = <Item extends ValueItem>(
  items: ReadonlyArray<Item>,
  item: Item,
): ReadonlyArray<Item> =>
  Arr.some(items, (existing) => existing.value === item.value)
    ? Arr.map(items, (existing) =>
        existing.value === item.value ? item : existing,
      )
    : Arr.append(items, item);

export const insert = (
  items: ReadonlyArray<CollectionItem>,
  item: CollectionItem,
): ReadonlyArray<CollectionItem> =>
  Arr.some(items, (existing) => existing.id === item.id)
    ? Arr.map(items, (existing) => (existing.id === item.id ? item : existing))
    : Arr.append(items, item);

export const remove = (
  items: ReadonlyArray<CollectionItem>,
  id: number,
): ReadonlyArray<CollectionItem> =>
  Arr.filter(items, (existing) => existing.id !== id);

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

export const firstEnabled = (
  items: ReadonlyArray<CollectionItem>,
): Option.Option<number> => nth(enabledIndexes(items), 0);

export const lastEnabled = (
  items: ReadonlyArray<CollectionItem>,
): Option.Option<number> =>
  pipe(nth(enabledIndexes(items), Arr.length(enabledIndexes(items)) - 1));

export const indexOfId = (
  items: ReadonlyArray<CollectionItem>,
  id: number,
): Option.Option<number> => Arr.findFirstIndex(items, (item) => item.id === id);

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
