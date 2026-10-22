/**
 * The arithmetic a pointer drag needs to reorder a list — pure, so a unit test
 * can hold it without a window.
 *
 * A row that wants the pointer after it leaves its box listens to both
 * `mouseDown` and `mouseMove`, which makes the runtime capture the pointer (the
 * `pointer-capture` probe measured it): every move and the release stay on the
 * dragged row, so **no other row hears the gesture** and the drop cannot be
 * resolved by the target's own handlers. The only channel left is the runtime's
 * hit test, `getElementsAt(x, y)`, matched against the native ids the rows
 * registered from their refs.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One native element a row owns: its own box, or a child it chooses to register. */
export interface RowHandle<A> {
  readonly id: number;
  readonly row: A;
}

/**
 * The row under a window point, from the ids the hit test reported.
 *
 * The list is topmost first and names a row's painted children too, so a
 * `<text>` label is usually the first id and its row sits beneath it: the search
 * takes the first id **that belongs to a row**, which is the row a reader sees
 * under the pointer. `None` means the pointer is over no row of this list, which
 * is a missed drop rather than a drop on the nearest one.
 */
export const rowAt = <A>(
  hits: ReadonlyArray<number>,
  handles: ReadonlyArray<RowHandle<A>>,
): Option.Option<A> =>
  pipe(
    Arr.findFirst(hits, (hit) =>
      Arr.some(handles, (handle) => handle.id === hit),
    ),
    Option.flatMap((hit) =>
      Arr.findFirst(handles, (handle) => handle.id === hit),
    ),
    Option.map((handle) => handle.row),
  );

/**
 * `order` with the row at `from` placed at `to`; an out-of-range index leaves
 * the order alone.
 *
 * `to` is an index in the order the reader sees, so the moved row takes the
 * slot the drop row held and the rows between them shift by one. The result is
 * always a new array, so a component can hold it in state.
 */
export const moveRow = <A>(
  order: ReadonlyArray<A>,
  from: number,
  to: number,
): ReadonlyArray<A> =>
  pipe(
    Arr.get(order, from),
    Option.flatMap((value) =>
      Arr.insertAt(Arr.remove(order, from), to, value),
    ),
    Option.getOrElse(() => order),
  );
