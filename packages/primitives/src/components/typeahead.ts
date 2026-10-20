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
  startsTypeahead,
  type TypeaheadBuffer,
  type TypeaheadItem,
  type TypeaheadMatch,
} from "../core/typeahead.js";

/** The monotonic clock in nanoseconds, at a React event boundary. */
const monotonicNanos = (): bigint => Effect.runSync(Clock.monotonicTimeNanos);

/**
 * Type-ahead for a list-like control.
 *
 * `from` is the control's keyboard cursor: the committed item's index for a
 * select (`Select`), the focused option for a roving group (`RadioGroup`). The
 * search starts after the last match, so a repeated letter advances to the next
 * match. `onMatch` receives the item and its index. A keystroke that matches
 * nothing clears the prefix, so an unmatched letter cannot poison the next one.
 *
 * The search starts after the **last match**, not after `from` (plan `732`). A
 * controlled parent may defer or reject a reported value, which would leave
 * `from` pointing at the same item and trap a repeated letter on one match —
 * the rule `RadioGroup`/`ToggleGroup`/`Rating` already follow for their keyboard
 * cursor (plan `359`). `from` moves the cursor only when the value itself moved
 * (an applied selection, a click, a reset).
 *
 * That carry-over belongs to one prefix: when the window passes, the next letter
 * begins a new prefix and the search starts at the current item again. Without
 * the reset the first key after a pause searched from where the last prefix
 * ended — measured, on a deferring parent it landed on the value already shown
 * and the key did nothing (plan `756`).
 */
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (match: TypeaheadMatch<Item>) => void,
): ((char: string) => void) => {
  // A ref, not state: nothing renders the buffer, and re-rendering on every
  // keystroke would be wasted work.
  const buffer = useRef<TypeaheadBuffer>(EMPTY_TYPEAHEAD);
  const cursor = useRef<Option.Option<number>>(Option.none());
  const origin = useRef<Option.Option<number>>(Option.none());
  return useCallback(
    (char: string) => {
      const now = monotonicNanos();
      const moved =
        Option.getOrUndefined(origin.current) !== Option.getOrUndefined(from);
      if (moved || startsTypeahead(buffer.current, now)) cursor.current = from;
      origin.current = from;
      const next = pressTypeahead(buffer.current, char, now);
      Option.match(
        matchTypeahead(
          items,
          Option.orElse(cursor.current, () => from),
          next.text,
        ),
        {
          onNone: () => {
            buffer.current = EMPTY_TYPEAHEAD;
            cursor.current = from;
          },
          onSome: (match) => {
            buffer.current = next;
            cursor.current = Option.some(match.index);
            onMatch(match);
          },
        },
      );
    },
    [items, from, onMatch],
  );
};
