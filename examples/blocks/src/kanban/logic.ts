/**
 * The board's rules: which column a point is over, and a card's move.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { columns, type Column, type Task } from "./data.js";

export interface Bounds {
  readonly x: number;
  readonly width: number;
}

/** The column whose measured bounds hold `x`. */
export const columnAt = (
  bounds: Partial<Record<Column, Bounds>>,
  x: number,
): Option.Option<Column> =>
  Arr.findFirst(columns, (column) =>
    Option.match(Option.fromNullishOr(bounds[column]), {
      onNone: () => false,
      onSome: (b) => x >= b.x && x < b.x + b.width,
    }),
  );

/** `tasks` with `id` moved from `from` to the end of `to`. */
export const moveTask = (
  tasks: Readonly<Record<Column, ReadonlyArray<Task>>>,
  id: string,
  from: Column,
  to: Column,
): Readonly<Record<Column, ReadonlyArray<Task>>> =>
  from === to
    ? tasks
    : Option.match(
        Arr.findFirst(tasks[from], (task) => task.id === id),
        {
          onNone: () => tasks,
          onSome: (task) => ({
            ...tasks,
            [from]: Arr.filter(tasks[from], (t) => t.id !== id),
            [to]: Arr.append(tasks[to], task),
          }),
        },
      );
