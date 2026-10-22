/**
 * The row a key event acts on.
 *
 * Three readings, most precise first:
 *
 * - the element the runtime delivered the key from (a renderer that names the
 *   sending row);
 * - the element the runtime reports as focused — a *window* builds a key
 *   payload per handler, so the list's own handler names the list (the rule
 *   `internal/dismiss-layer.ts` records for a press), and a pointer press moves
 *   focus without running the row's `onFocus` (measured on 0.11.0), so the
 *   record can name the previous row;
 * - the row the list recorded, for a key that arrives with no focus of its own
 *   (the list itself focused, or a renderer that reports neither).
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

/** The row with native id `id`, when one matches. */
const rowOf = (
  rows: ReadonlyArray<OriginRow>,
  id: number,
): Option.Option<string> =>
  Option.map(
    Arr.findFirst(rows, (row) => row.nativeId === id),
    (row) => row.value,
  );

/**
 * The row a key event acts on: the sending row, then the focused row, then
 * `active`, then `None`.
 *
 * `elementId` is the host element the runtime delivered the key from and
 * `focusedId` the element it reports as focused; either is a row only when it
 * matches one, so a key from the list root falls through to the record.
 */
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
