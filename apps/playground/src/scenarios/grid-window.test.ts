/**
 * Guards the window maths a wide grid depends on.
 *
 * The bugs these catch: a window that starts at a negative index (so the grid
 * asks for a row that does not exist), a near-end window that runs past the
 * last column (so the header and the body disagree about the final columns),
 * and a keyboard reveal that either refuses to move to an off-window cell or
 * scrolls past the end of the content.
 */
import { describe, expect, it } from "@effect/vitest";
import {
  clampScroll,
  EMPTY_RANGE,
  revealOffset,
  visibleWindow,
} from "./grid-window.js";

const TOTAL = 2160;
const VIEWPORT = 460;
const COLUMN = 90;
const COLUMNS = 24;

describe("visibleWindow", () => {
  it("starts at the first column and overdraws one past the viewport", () => {
    expect(visibleWindow(0, VIEWPORT, COLUMN, COLUMNS)).toEqual({
      first: 0,
      last: 6,
    });
  });

  it("follows a pan and keeps one column of overdraw on each side", () => {
    expect(visibleWindow(-360, VIEWPORT, COLUMN, COLUMNS)).toEqual({
      first: 3,
      last: 10,
    });
  });

  it("clamps the last window to the final column", () => {
    expect(visibleWindow(-1700, VIEWPORT, COLUMN, COLUMNS)).toEqual({
      first: 17,
      last: 23,
    });
  });

  it("returns every index when the content is narrower than the viewport", () => {
    expect(visibleWindow(0, 1000, COLUMN, 3)).toEqual({ first: 0, last: 2 });
  });

  it("returns the empty range for no items", () => {
    expect(visibleWindow(0, VIEWPORT, COLUMN, 0)).toEqual(EMPTY_RANGE);
  });
});

describe("clampScroll", () => {
  it("never returns a positive offset, even when asked to", () => {
    expect(clampScroll(120, TOTAL, VIEWPORT)).toBe(0);
  });

  it("stops at the last viewport of content", () => {
    expect(clampScroll(-5000, TOTAL, VIEWPORT)).toBe(VIEWPORT - TOTAL);
  });

  it("returns zero when the content fits", () => {
    expect(clampScroll(-40, 300, VIEWPORT)).toBe(0);
  });
});

describe("revealOffset", () => {
  it("keeps the current offset when the cell is already fully visible", () => {
    expect(revealOffset(-90, 2, COLUMN, VIEWPORT, TOTAL)).toBe(-90);
  });

  it("pans right by exactly the missing distance for an off-window cell", () => {
    // Column 7 spans 630..720; the viewport ends at 460.
    expect(revealOffset(0, 7, COLUMN, VIEWPORT, TOTAL)).toBe(460 - 720);
  });

  it("pans left to the cell's start for a cell behind the viewport", () => {
    expect(revealOffset(-400, 1, COLUMN, VIEWPORT, TOTAL)).toBe(-90);
  });

  it("stops at the content end for the last cell", () => {
    expect(revealOffset(0, 23, COLUMN, VIEWPORT, TOTAL)).toBe(-1700);
  });

  it("stops at the start for the first cell", () => {
    expect(revealOffset(-400, 0, COLUMN, VIEWPORT, TOTAL)).toBe(0);
  });
});
