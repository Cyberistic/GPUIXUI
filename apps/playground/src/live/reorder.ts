import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface RowHandle<A> {
  readonly id: number;
  readonly row: A;
}

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

export const moveRow = <A>(
  order: ReadonlyArray<A>,
  from: number,
  to: number,
): ReadonlyArray<A> =>
  pipe(
    Arr.get(order, from),
    Option.flatMap((value) => Arr.insertAt(Arr.remove(order, from), to, value)),
    Option.getOrElse(() => order),
  );
