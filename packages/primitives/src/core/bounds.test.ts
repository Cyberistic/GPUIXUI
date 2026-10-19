/**
 * `scrollIntoViewDelta` — the measured replacement for `scrollIntoView`.
 *
 * **The bug this file guards (plan `599`).** The renderer's `scrollIntoView`
 * scrolls to the child *before* the target: measured on the pinned release
 * build, `scrollIntoView(row 26)` left row 26's top at the 792 px bottom edge of
 * its list (`794 … 822`) and put row 25 flush with the bottom (`764 … 792`).
 * A `Select` therefore had to move the list by the item's measured overflow
 * instead of asking the renderer which child to reveal.
 *
 * The rule is total: an item inside the viewport asks for no movement, an item
 * below asks for its overflow, an item above asks for the distance back, and a
 * row taller than the viewport keeps its bottom visible because no offset can
 * contain it.
 */

import { describe, expect, it } from "vitest";
import { scrollIntoViewDelta } from "./bounds.js";

/** A 100 px-tall viewport at the top of the window. */
const viewport = { x: 0, y: 0, width: 200, height: 100 };

describe("scrollIntoViewDelta", () => {
  it("scrolls down by the overflow of an item below the viewport", () => {
    expect(
      scrollIntoViewDelta({ x: 0, y: 92, width: 100, height: 28 }, viewport),
    ).toBe(20);
  });

  it("scrolls up by the distance to an item above the viewport", () => {
    expect(
      scrollIntoViewDelta({ x: 0, y: -30, width: 100, height: 20 }, viewport),
    ).toBe(-30);
  });

  it("asks for nothing when the item is already inside", () => {
    expect(
      scrollIntoViewDelta({ x: 0, y: 40, width: 100, height: 28 }, viewport),
    ).toBe(0);
  });

  it("keeps the bottom of an item taller than the viewport visible", () => {
    // The top cannot fit either way, so the bottom branch wins rather than
    // oscillating between "scroll down" and "scroll up".
    expect(
      scrollIntoViewDelta({ x: 0, y: 90, width: 100, height: 120 }, viewport),
    ).toBe(110);
  });
});
