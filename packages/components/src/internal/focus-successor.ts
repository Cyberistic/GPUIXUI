/**
 * Where focus goes when the element holding it is about to disappear.
 *
 * A row, or a whole palette, can open a modal and close in the same commit: the
 * modal captures a control of the closing surface as its opener, and the surface
 * knows where its own focus should have gone. Each cleanup marks the element it
 * is leaving behind against the target it focuses (`useModalFocus`), and the
 * modal that captured the mark prefers it at capture and at restore (plan 827).
 *
 * A mark is keyed by the native id of an element that has vanished, and a modal
 * can only capture an element that exists, so a mark can only apply to the modal
 * that captured it before it vanished. It is consumed by the read and the store
 * keeps the newest few, so it never retargets a later modal and never grows.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

interface FocusSuccessor {
  readonly from: number;
  readonly to: number;
}

/** How many unread marks are kept: enough for a burst of closing overlays. */
const LIMIT = 8;

let successors: ReadonlyArray<FocusSuccessor> = [];

/** Mark `to` as where focus goes once `from` disappears. */
export const markFocusSuccessor = (from: number, to: number): void => {
  successors = Arr.take(
    Arr.prepend(
      Arr.filter(successors, (current) => current.from !== from),
      { from, to },
    ),
    LIMIT,
  );
};

/** The successor marked for `from`; the mark is consumed by the read. */
export const takeFocusSuccessor = (from: number): Option.Option<number> => {
  const marked = Arr.findFirst(successors, (current) => current.from === from);
  successors = Arr.filter(successors, (current) => current.from !== from);
  return Option.map(marked, (current) => current.to);
};
