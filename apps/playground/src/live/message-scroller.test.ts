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
    expect(
      scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
    ).toBeGreaterThan(TRANSCRIPT_THRESHOLD);
    expect(pageShift()).toBeGreaterThan(TRANSCRIPT_THRESHOLD);
  });
});
