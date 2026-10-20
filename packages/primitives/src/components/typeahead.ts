/**
 * The React adapter for type-ahead: one prefix per control.
 *
 * The pure rule lives in `core/typeahead.ts`; this file owns only what needs a
 * component — a ref that survives renders, and one clock read per keystroke. The
 * clock is read through Effect's `Clock` at the event boundary, so the window is
 * measured from the same source of time as the rest of the library rather than
 * `Date.now` (the `Toast` provider's boundary rule).
 */

import { useCallback, useRef } from "react";
import { Clock, Effect } from "effect";
import * as Option from "effect/Option";
import {
  EMPTY_TYPEAHEAD,
  matchTypeahead,
  pressTypeahead,
  type TypeaheadBuffer,
  type TypeaheadItem,
  type TypeaheadMatch,
} from "../core/typeahead.js";

/** The monotonic clock in nanoseconds, at a React event boundary. */
const monotonicNanos = (): bigint => Effect.runSync(Clock.monotonicTimeNanos);

/**
 * Type-ahead for a list-like control.
 *
 * `from` is the current item's index, so a repeated letter advances to the next
 * match; `onMatch` receives the item and its index. A keystroke that matches
 * nothing clears the prefix, so an unmatched letter cannot poison the next one.
 */
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (match: TypeaheadMatch<Item>) => void,
): ((char: string) => void) => {
  // A ref, not state: nothing renders the buffer, and re-rendering on every
  // keystroke would be wasted work.
  const buffer = useRef<TypeaheadBuffer>(EMPTY_TYPEAHEAD);
  return useCallback(
    (char: string) => {
      const next = pressTypeahead(buffer.current, char, monotonicNanos());
      Option.match(matchTypeahead(items, from, next.text), {
        onNone: () => {
          buffer.current = EMPTY_TYPEAHEAD;
        },
        onSome: (match) => {
          buffer.current = next;
          onMatch(match);
        },
      });
    },
    [items, from, onMatch],
  );
};
