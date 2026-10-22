/**
 * The row a key event acts on.
 *
 * A focus event does deliver the row a reader arrives on (re-measured on 0.11.0),
 * but the recorded row is not the truth a key should move from: it can be stale
 * after a controlled selection or a filter, and a key that arrives at the list
 * itself names no row at all. The element that sent the key is the precise
 * origin; the recorded row is the fallback for a key that has no row of its own.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";

/** The part of a row this rule reads. */
export interface OriginRow {
  /** The row's host element id, as the runtime reports it. */
  readonly nativeId: number;
  readonly value: string;
}

/**
 * The row a key event acts on: the sending row, then `active`, then `None`.
 *
 * `elementId` is the host element the runtime delivered the key from; it is a
 * row only when it matches one, so a key from the list root falls through.
 */
export const keyOrigin = (
  rows: ReadonlyArray<OriginRow>,
  active: Option.Option<string>,
  elementId: Option.Option<number>,
): Option.Option<string> =>
  pipe(
    elementId,
    Option.flatMap((id) =>
      Option.map(
        Arr.findFirst(rows, (row) => row.nativeId === id),
        (row) => row.value,
      ),
    ),
    Option.orElse(() => active),
  );
