/**
 * The row a key event acts on.
 *
 * A window's `Tab` traversal focuses a row **without running its focus
 * handler** — the playground's `tabs-lifecycle` measured that on a trigger of
 * this shape, and the Tabs list needed the same rule. So the row the reader is
 * on is not necessarily the row a focus event recorded: a list that moved from
 * the recorded row would re-anchor its first arrow at the top and run Enter on
 * nothing. The element that sent the key is the truth; the recorded row is the
 * fallback for a key that arrives from the list itself.
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
