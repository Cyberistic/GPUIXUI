/**
 * The measured reveal rule (plan 535).
 *
 * The bug these guard: with 30 combobox options and 24 `ArrowDown` presses the
 * highlighted row sat 429 px below the list's viewport, and a window-space
 * check scrolled again on every press because GPUix reports a scroll
 * container's painted box already translated by its offset. The rule works in
 * the list's content space, so a scroll never changes the check it just fixed.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { revealOffset, type RevealBounds } from "./scroll.js";

const box = (y: number, height: number): RevealBounds => ({ y, height });

describe("revealOffset", () => {
  it("scrolls down just far enough for a row below the viewport", () => {
    const next = revealOffset(
      Option.some(box(755, 28)),
      Option.some(box(111, 240)),
      Option.some(0),
    );

    expect(Option.getOrNull(next)).toBe(-432);
  });

  it("does not scroll again once the row is inside", () => {
    const next = revealOffset(
      Option.some(box(323, 28)),
      Option.some(box(-321, 240)),
      Option.some(-432),
    );

    expect(Option.isNone(next)).toBe(true);
  });

  it("scrolls back up for a row above the viewport", () => {
    const next = revealOffset(
      Option.some(box(60, 28)),
      Option.some(box(-100, 240)),
      Option.some(-200),
    );

    expect(Option.getOrNull(next)).toBe(-160);
  });

  it("leaves an already visible row alone", () => {
    const next = revealOffset(
      Option.some(box(200, 28)),
      Option.some(box(100, 240)),
      Option.some(-40),
    );

    expect(Option.isNone(next)).toBe(true);
  });

  it("never scrolls above the top", () => {
    const next = revealOffset(
      Option.some(box(-10, 28)),
      Option.some(box(0, 240)),
      Option.some(-20),
    );

    expect(Option.getOrNull(next)).toBe(0);
  });

  it("does nothing when a measurement is missing", () => {
    const next = revealOffset(
      Option.some(box(755, 28)),
      Option.none(),
      Option.some(0),
    );

    expect(Option.isNone(next)).toBe(true);
  });
});
