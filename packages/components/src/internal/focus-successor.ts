/**
 * Where focus goes when the element holding it is about to disappear.
 *
 * A menu row can open a modal from `onSelect`, and the row unmounts with its menu
 * in the same commit — before the modal captures its opener. The closing overlay
 * marks its trigger as the row's successor, and `useModalFocus` substitutes it.
 * The mark lives one task, so a stale one can never retarget a later modal (the
 * rule `event-claim.ts` uses for its claim, plan 587).
 */

import * as Option from "effect/Option";

interface FocusSuccessor {
  readonly from: number;
  readonly to: number;
}

let successor: Option.Option<FocusSuccessor> = Option.none();

/** Mark `to` as where focus returns once `from` disappears. */
export const markFocusSuccessor = (from: number, to: number): void => {
  const marked: FocusSuccessor = { from, to };
  successor = Option.some(marked);
  setTimeout(() => {
    successor = Option.filter(successor, (current) => current !== marked);
  }, 0);
};

/** The successor marked for `from`, while the mark is still in its task. */
export const focusSuccessor = (from: number): Option.Option<number> =>
  Option.map(
    Option.filter(successor, (current) => current.from === from),
    (current) => current.to,
  );
