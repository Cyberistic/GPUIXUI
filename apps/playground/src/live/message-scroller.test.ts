/**
 * Guards the geometry the `message-scroller-lifecycle` probe asserts against.
 *
 * The probe's two claims — a pinned scroller follows an appended page, and an
 * unpinned one leaves the reader's offset alone — only mean something if the
 * fixture overflows by more than the at-end band and a page moves the tail by
 * more than that band. A starting transcript that fits, or a page of one 1px
 * row, would keep the probe green while it stopped measuring a yank.
 */
import { describe, expect, it } from "vitest";
import {
  TRANSCRIPT_PAGE_ROWS,
  TRANSCRIPT_ROW_HEIGHT,
  TRANSCRIPT_START_ROWS,
  TRANSCRIPT_THRESHOLD,
  TRANSCRIPT_VIEWPORT_HEIGHT,
  contentHeight,
  pageShift,
  scrollRange,
} from "./message-scroller.js";

describe("the message-scroller-lifecycle fixture", () => {
  it("starts with content that overflows past the at-end band", () => {
    expect(contentHeight(TRANSCRIPT_START_ROWS)).toBeGreaterThan(
      TRANSCRIPT_VIEWPORT_HEIGHT,
    );
    expect(scrollRange(TRANSCRIPT_START_ROWS)).toBeGreaterThan(
      TRANSCRIPT_THRESHOLD,
    );
  });

  it("moves the reachable end by exactly one page per append", () => {
    expect(pageShift()).toBe(TRANSCRIPT_PAGE_ROWS * TRANSCRIPT_ROW_HEIGHT);
    expect(
      scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS) -
        scrollRange(TRANSCRIPT_START_ROWS),
    ).toBe(pageShift());
  });

  it("leaves a reader at the top above the band after a page arrives", () => {
    // The reader's offset is 0; the tail is `scrollRange` below the viewport's
    // bottom, and one page must still exceed the band — the unpinned check.
    expect(
      scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
    ).toBeGreaterThan(TRANSCRIPT_THRESHOLD);
    expect(pageShift()).toBeGreaterThan(TRANSCRIPT_THRESHOLD);
  });
});
