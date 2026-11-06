import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

export interface OriginRow {
  readonly nativeId: number;
  readonly value: string;
}

const rowOf = (
  rows: ReadonlyArray<OriginRow>,
  id: number,
): Option.Option<string> =>
  Option.map(
    Arr.findFirst(rows, (row) => row.nativeId === id),
    (row) => row.value,
  );

export const keyOrigin = (
  rows: ReadonlyArray<OriginRow>,
  active: Option.Option<string>,
  elementId: Option.Option<number>,
  focusedId: Option.Option<number>,
): Option.Option<string> =>
  pipe(
    elementId,
    Option.flatMap((id) => rowOf(rows, id)),
    Option.orElse(() => Option.flatMap(focusedId, (id) => rowOf(rows, id))),
    Option.orElse(() => active),
  );
