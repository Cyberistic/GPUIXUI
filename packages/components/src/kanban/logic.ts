// One flat placement list makes a cross-column move and a reorder one splice.
// A stored order is a start; omitted cards keep their column.
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface KanbanColumn {
  readonly id: string;

  readonly title: string;
}

export interface KanbanCard {
  readonly id: string;
  readonly column: string;
  readonly title: string;

  readonly description?: string;
}

export interface KanbanPlacement {
  readonly id: string;
  readonly column: string;
}

export type KanbanOrder = ReadonlyArray<KanbanPlacement>;

export interface KanbanMove {
  readonly id: string;
  readonly from: string;
  readonly to: string;

  readonly index: number;
}

export type KanbanDirection = "up" | "down" | "left" | "right";

export const directionOf = (
  key: string | undefined,
): Option.Option<KanbanDirection> =>
  Match.value(key).pipe(
    Match.when("up", () => Option.some<KanbanDirection>("up")),
    Match.when("down", () => Option.some<KanbanDirection>("down")),
    Match.when("left", () => Option.some<KanbanDirection>("left")),
    Match.when("right", () => Option.some<KanbanDirection>("right")),
    Match.orElse(() => Option.none<KanbanDirection>()),
  );

export interface KanbanColumnBox {
  readonly id: string;
  readonly left: number;
  readonly right: number;
}

const hasColumn = (columns: ReadonlyArray<KanbanColumn>, id: string): boolean =>
  Arr.some(columns, (column) => column.id === id);

const firstColumn = (
  columns: ReadonlyArray<KanbanColumn>,
): Option.Option<string> =>
  Option.map(Arr.head(columns), (column) => column.id);

export const resolveOrder = (
  cards: ReadonlyArray<KanbanCard>,
  columns: ReadonlyArray<KanbanColumn>,
  stored?: KanbanOrder,
): KanbanOrder => {
  const fallback = firstColumn(columns);
  const stated = Arr.reduce(
    Option.getOrElse(Option.fromNullishOr(stored), () =>
      Arr.empty<KanbanPlacement>(),
    ),
    Arr.empty<KanbanPlacement>(),
    (accepted, placement) =>
      Arr.some(accepted, (entry) => entry.id === placement.id) ||
      !hasColumn(columns, placement.column) ||
      !Arr.some(cards, (card) => card.id === placement.id)
        ? accepted
        : [...accepted, placement],
  );

  const unplaced = Arr.filter(
    cards,
    (card) => !Arr.some(stated, (placement) => placement.id === card.id),
  );

  return Arr.match(unplaced, {
    onEmpty: () => stated,
    onNonEmpty: (cards) =>
      Arr.reduce(cards, stated, (order, card) => {
        const column = hasColumn(columns, card.column)
          ? Option.some(card.column)
          : fallback;
        return Option.match(column, {
          onNone: () => order,
          onSome: (id) => [...order, { id: card.id, column: id }],
        });
      }),
  });
};

export const columnCards = (
  order: KanbanOrder,
  column: string,
): ReadonlyArray<string> =>
  Arr.flatMap(order, (placement) =>
    placement.column === column ? [placement.id] : [],
  );

export const placementIndex = (
  order: KanbanOrder,
  id: string,
): Option.Option<number> =>
  Arr.findFirstIndex(order, (entry) => entry.id === id);

export const moveCardInOrder = (
  order: KanbanOrder,
  id: string,
  to: string,
  index: number,
): KanbanOrder =>
  Option.match(
    Arr.findFirst(order, (placement) => placement.id === id),
    {
      onNone: () => order,
      onSome: () => {
        const rest = Arr.filter(order, (placement) => placement.id !== id);
        const target = Arr.filter(rest, (placement) => placement.column === to);
        const at = Math.max(0, Math.min(index, Arr.length(target)));
        const next: KanbanPlacement = { id, column: to };
        const insertBefore = (first: string): KanbanOrder =>
          Option.getOrElse(
            Arr.insertAt(
              rest,
              Option.getOrElse(
                Arr.findFirstIndex(rest, (placement) => placement.id === first),
                () => Arr.length(rest),
              ),
              next,
            ),
            () => rest,
          );

        return Option.match(Arr.get(target, at), {
          onNone: () =>
            Option.match(Arr.last(target), {
              onNone: () => [...rest, next],
              onSome: (last) => {
                const after = Option.getOrElse(
                  Arr.findFirstIndex(
                    rest,
                    (placement) => placement.id === last.id,
                  ),
                  () => Arr.length(rest) - 1,
                );
                return Option.getOrElse(
                  Arr.insertAt(rest, after + 1, next),
                  () => [...rest, next],
                );
              },
            }),
          onSome: (first) => insertBefore(first.id),
        });
      },
    },
  );

export const keyboardMove = (
  order: KanbanOrder,
  columns: ReadonlyArray<KanbanColumn>,
  id: string,
  direction: KanbanDirection,
): Option.Option<KanbanMove> =>
  Option.flatMap(
    Arr.findFirst(order, (placement) => placement.id === id),
    (placed) =>
      Option.flatMap(
        Arr.findFirstIndex(columns, (column) => column.id === placed.column),
        (columnIndex) => {
          const cards = columnCards(order, placed.column);
          const current = Option.getOrElse(
            Arr.findFirstIndex(cards, (card) => card === id),
            () => 0,
          );

          if (direction === "up" || direction === "down") {
            const target = current + (direction === "up" ? -1 : 1);
            return target < 0 || target >= Arr.length(cards)
              ? Option.none()
              : Option.some({
                  id,
                  from: placed.column,
                  to: placed.column,
                  index: target,
                });
          }

          return Option.map(
            Arr.get(columns, columnIndex + (direction === "right" ? 1 : -1)),
            (column) => ({
              id,
              from: placed.column,
              to: column.id,
              index: Math.min(
                current,
                Arr.length(columnCards(order, column.id)),
              ),
            }),
          );
        },
      ),
  );

export const dropIndexFromCentres = (
  centres: ReadonlyArray<number>,
  y: number,
): number => Arr.length(Arr.filter(centres, (centre) => y > centre));

export const columnAt = (
  x: number,
  boxes: ReadonlyArray<KanbanColumnBox>,
): Option.Option<string> =>
  Option.orElse(
    Option.map(
      Arr.findFirst(boxes, (box) => x >= box.left && x <= box.right),
      (box) => box.id,
    ),
    () =>
      Option.map(
        Arr.reduce(
          boxes,
          Option.none<{
            readonly box: KanbanColumnBox;
            readonly away: number;
          }>(),
          (nearest, box) => {
            const away = x < box.left ? box.left - x : x - box.right;
            return Option.match(nearest, {
              onNone: () => Option.some({ box, away }),
              onSome: (held) =>
                away < held.away ? Option.some({ box, away }) : nearest,
            });
          },
        ),
        (nearest) => nearest.box.id,
      ),
  );
