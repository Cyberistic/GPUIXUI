/**
 * The MessageScroller rules.
 *
 * The bug these guard: content arriving while the reader is scrolled up yanks
 * them to the bottom. The state machine must leave them alone and count what
 * arrived, and it must not count while they are pinned. Every assertion below
 * fails if the pin guard or the threshold comparison is removed. The last bug
 * they guard is the opposite: a measurement the scroller cannot read (`NaN`)
 * fails every comparison, so a reader resting at the bottom was read as away
 * from it and the follow stopped.
 */

import { describe, expect, it } from "vitest";
import {
  addItems,
  initialMessageScrollerState,
  observeScroll,
  requestLatest,
  type MessageScrollerState,
} from "./logic.js";

const unpinned: MessageScrollerState = { pinned: false, unread: 0 };

describe("observeScroll", () => {
  it("stays pinned within the threshold", () => {
    expect(
      observeScroll(initialMessageScrollerState, {
        distanceFromEnd: 10,
        threshold: 24,
      }),
    ).toBe(initialMessageScrollerState);
  });

  it("unpins beyond the threshold and keeps a manual count", () => {
    const state = observeScroll(
      { pinned: true, unread: 0 },
      { distanceFromEnd: 120, threshold: 24 },
    );

    expect(state).toEqual({ pinned: false, unread: 0 });
  });

  it("clears unread when the reader returns to the end", () => {
    expect(
      observeScroll(
        { pinned: false, unread: 3 },
        { distanceFromEnd: 0, threshold: 24 },
      ),
    ).toEqual({ pinned: true, unread: 0 });
  });

  it("does not clear a count while still away from the end", () => {
    expect(
      observeScroll(
        { pinned: false, unread: 3 },
        { distanceFromEnd: 120, threshold: 24 },
      ),
    ).toEqual({ pinned: false, unread: 3 });
  });

  it("treats an overscrolled tail as pinned", () => {
    expect(
      observeScroll(
        { pinned: false, unread: 1 },
        { distanceFromEnd: -8, threshold: 24 },
      ),
    ).toEqual({ pinned: true, unread: 0 });
  });

  it("ignores an observation it cannot read", () => {
    const atEnd: MessageScrollerState = { pinned: true, unread: 0 };
    const away: MessageScrollerState = { pinned: false, unread: 3 };

    expect(
      observeScroll(atEnd, { distanceFromEnd: 0, threshold: Number.NaN }),
    ).toBe(atEnd);
    expect(
      observeScroll(atEnd, { distanceFromEnd: Number.NaN, threshold: 24 }),
    ).toBe(atEnd);
    expect(
      observeScroll(away, { distanceFromEnd: Number.NaN, threshold: 24 }),
    ).toBe(away);
  });
});

describe("addItems", () => {
  it("counts arrivals while unpinned", () => {
    expect(addItems(unpinned, 2)).toEqual({ pinned: false, unread: 2 });
    expect(addItems({ pinned: false, unread: 2 }, 1)).toEqual({
      pinned: false,
      unread: 3,
    });
  });

  it("ignores arrivals while pinned", () => {
    const state: MessageScrollerState = { pinned: true, unread: 0 };
    expect(addItems(state, 4)).toBe(state);
  });

  it("ignores empty and negative counts", () => {
    expect(addItems(unpinned, 0)).toBe(unpinned);
    expect(addItems(unpinned, -2)).toBe(unpinned);
  });

  it("ignores a count it cannot read", () => {
    // The affordance paints `unread` as "N new messages", so an unreadable
    // arrival would paint the word `NaN` where a count belongs.
    expect(addItems(unpinned, Number.NaN)).toBe(unpinned);
  });
});

describe("requestLatest", () => {
  it("pins and clears the count", () => {
    expect(requestLatest({ pinned: false, unread: 3 })).toEqual({
      pinned: true,
      unread: 0,
    });
  });

  it("returns the same state when already latest", () => {
    const state: MessageScrollerState = { pinned: true, unread: 0 };
    expect(requestLatest(state)).toBe(state);
  });

  it("clears a stale count while pinned", () => {
    expect(requestLatest({ pinned: true, unread: 2 })).toEqual({
      pinned: true,
      unread: 0,
    });
  });
});
