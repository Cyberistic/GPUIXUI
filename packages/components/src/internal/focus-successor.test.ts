/**
 * The focus successor's two rules: an element that is about to disappear names
 * the element a modal should return to instead, and the modal that captured it
 * takes that mark once.
 *
 * The bug these guard (plan 827): a command action opened a `Dialog` while it
 * closed the palette in the same commit, so the dialog captured the palette's own
 * search field as its opener and Escape left the keyboard on nothing. The palette
 * marked that field against its own opener — and the dialog restored seconds
 * later, so the mark must outlive a task. A stale mark must still never retarget a
 * later modal, and a burst of closes must not grow the store.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFocusSuccessors,
  markFocusSuccessor,
  takeFocusSuccessor,
} from "./focus-successor.js";

/** Cross a real task: a one-task lifetime would have dropped the mark here. */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("focus successor", () => {
  beforeEach(clearFocusSuccessors);
  it("returns the marked element for the element that is disappearing", () => {
    markFocusSuccessor(4, 9);
    expect(takeFocusSuccessor(4)).toEqual(Option.some(9));
  });

  it("forgets a mark once it has been read", () => {
    markFocusSuccessor(4, 9);
    expect(takeFocusSuccessor(4)).toEqual(Option.some(9));
    expect(takeFocusSuccessor(4)).toEqual(Option.none());
  });

  it("reports nothing for an element that was not marked", () => {
    markFocusSuccessor(4, 9);
    expect(takeFocusSuccessor(5)).toEqual(Option.none());
  });

  it("keeps a mark across the tasks before the modal restores", async () => {
    markFocusSuccessor(4, 9);
    await settle();
    await settle();
    expect(takeFocusSuccessor(4)).toEqual(Option.some(9));
  });

  it("keeps the newest marks and forgets the oldest", () => {
    Arr.forEach([1, 2, 3, 4, 5, 6, 7, 8, 9], (id) =>
      markFocusSuccessor(id, id),
    );
    expect(takeFocusSuccessor(1)).toEqual(Option.none());
    expect(takeFocusSuccessor(9)).toEqual(Option.some(9));
  });

  it("keeps the newest target when the same element is marked twice", () => {
    markFocusSuccessor(4, 9);
    markFocusSuccessor(4, 12);
    expect(takeFocusSuccessor(4)).toEqual(Option.some(12));
  });

  it("forgets every mark when a new renderer starts", () => {
    // Host ids restart with a renderer, so a mark from one scene must not be
    // readable by a modal in the next (plan 830).
    markFocusSuccessor(4, 9);
    clearFocusSuccessors();
    expect(takeFocusSuccessor(4)).toEqual(Option.none());
  });
});
