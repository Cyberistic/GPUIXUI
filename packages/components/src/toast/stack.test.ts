/**
 * The stack's geometry.
 *
 * The bug these guard: a stack that painted every card full and interactive —
 * the old hover "fan" lifted older cards by 8px but left them the same size,
 * so the reader could not tell which card the corner belonged to. The collapsed
 * stack is now the newest card plus two peeking slices; the fourth card waits
 * with no height, and expanding gives every card its measured height and a
 * shared gap. The tests read the numbers the viewport animates, not a render.
 *
 * A peeking card carries no opacity step: its slot clips the card's own surface,
 * so a push changes a card's size and never its paint. Dimming the slices was
 * what made every push flash — the whole stack re-faded at once.
 */

import { describe, expect, it } from "vitest";
import { stackGap, toastSlotOf, toastSlots } from "./stack.js";

const heights = [72, 82, 92] as const;

describe("a collapsed stack", () => {
  it("paints the newest card full and the two older cards as peeking slices", () => {
    const [oldest, middle, newest] = toastSlots(heights, false);

    expect(newest).toEqual({
      rank: 0,
      height: 92,
      inset: 0,
      interactive: true,
    });
    expect(middle).toEqual({
      rank: 1,
      height: 12,
      inset: 8,
      interactive: false,
    });
    expect(oldest).toEqual({
      rank: 2,
      height: 12,
      inset: 16,
      interactive: false,
    });
  });

  it("keeps a fourth card out of the stack until it unfolds", () => {
    const slots = toastSlots([60, 70, 80, 90], false);
    const hidden = slots[0];

    expect(hidden?.rank).toBe(3);
    expect(hidden?.height).toBe(0);
    expect(hidden?.interactive).toBe(false);
  });

  it("reads a missing or unusable measurement as no height", () => {
    const slots = toastSlots([Number.NaN, -4, 80], false);

    expect(slots[0]?.height).toBe(12);
    expect(slots[1]?.height).toBe(12);
    expect(slots[2]?.height).toBe(80);
  });

  it("does not paint a gap while collapsed", () => {
    expect(stackGap(false)).toBe(0);
  });
});

describe("an expanded stack", () => {
  it("gives every card its measured height, no inset and its controls", () => {
    const slots = toastSlots(heights, true);

    expect(slots).toEqual([
      { rank: 2, height: 72, inset: 0, interactive: true },
      { rank: 1, height: 82, inset: 0, interactive: true },
      { rank: 0, height: 92, inset: 0, interactive: true },
    ]);
  });

  it("unfolds a card beyond the visible three too", () => {
    const slots = toastSlots([60, 70, 80, 90], true);

    expect(slots[0]).toEqual({
      rank: 3,
      height: 60,
      inset: 0,
      interactive: true,
    });
  });

  it("paints the one shared gap between cards", () => {
    expect(stackGap(true)).toBe(12);
    expect(stackGap(false)).toBe(0);
  });
});

describe("one card's slot", () => {
  it("is the same box whether the rank comes from the list or from a card", () => {
    // A leaving card is not ranked with the cards behind it, so the viewport
    // asks for its slot by rank rather than by position in the queue.
    expect(toastSlotOf(1, 82, false)).toEqual({
      rank: 1,
      height: 12,
      inset: 8,
      interactive: false,
    });
  });

  it("collapses a card past the visible three, then gives its height back", () => {
    expect(toastSlotOf(4, 64, false)).toEqual({
      rank: 4,
      height: 0,
      inset: 0,
      interactive: false,
    });
    expect(toastSlotOf(4, 64, true)).toEqual({
      rank: 4,
      height: 64,
      inset: 0,
      interactive: true,
    });
  });
});
