/**
 * The focus successor's one rule: an element that is about to disappear names the
 * element a modal should return to instead.
 *
 * The bug these guard (plan 826): a dialog opened from a menu row captured the
 * row as its opener, the row unmounted with its menu, and closing the dialog left
 * the keyboard on nothing. A stale mark must not retarget a later modal.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { focusSuccessor, markFocusSuccessor } from "./focus-successor.js";

/** Cross a real task: the mark's own lifetime is `setTimeout(…, 0)`. */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("focus successor", () => {
  it("returns the marked element for the element that is disappearing", () => {
    markFocusSuccessor(4, 9);
    expect(focusSuccessor(4)).toEqual(Option.some(9));
  });

  it("reports nothing for an element that was not marked", () => {
    markFocusSuccessor(4, 9);
    expect(focusSuccessor(5)).toEqual(Option.none());
  });

  it("forgets a mark once its task ends", async () => {
    markFocusSuccessor(4, 9);
    await settle();
    expect(focusSuccessor(4)).toEqual(Option.none());
  });
});
