/**
 * Guards the premises of the typeface probe (plan `771`).
 *
 * The bug being guarded: the platform type styles were proven only by the
 * authored style report, so a runtime that shaped every run with the default
 * face would pass every check. These tests pin the four relations the frame
 * asserts (proportional default, uniform mono, a real cross-face difference and
 * a silent fallback) and the fixture guard. Each can fail: drop the text filter
 * or reverse the order, ignore the margin, or point the missing fixture at a
 * real family.
 */
import { describe, expect, it } from "vitest";
import { Smoke } from "@gpuixui/testing";
import {
  MISSING_FAMILY,
  NARROW_RUN,
  PHRASE_RUN,
  WIDE_RUN,
  differs,
  missingFamilyIsForeign,
  proportional,
  runWidths,
  same,
  uniform,
} from "./font-metrics.js";

const wash = (text: string, width: number): Smoke.HighlightMatch =>
  Smoke.HighlightMatch.make({
    elementId: 1,
    sub: 0,
    text,
    start: 0,
    end: text.length,
    active: false,
    rects: [Smoke.HighlightRect.make({ x: 0, y: 0, width, height: 20 })],
  });

const emptyWash = (text: string): Smoke.HighlightMatch =>
  Smoke.HighlightMatch.make({
    elementId: 2,
    sub: 0,
    text,
    start: 0,
    end: text.length,
    active: false,
    rects: [],
  });

describe("runWidths", () => {
  it("keeps only the named run, in paint order", () => {
    const highlights = [
      wash(NARROW_RUN, 32),
      wash(WIDE_RUN, 120),
      wash(NARROW_RUN, 77),
    ];
    expect(runWidths(highlights, NARROW_RUN)).toEqual([32, 77]);
    expect(runWidths(highlights, WIDE_RUN)).toEqual([120]);
    expect(runWidths(highlights, PHRASE_RUN)).toEqual([]);
  });

  it("drops a match with no rects instead of producing NaN", () => {
    const widths = runWidths(
      [emptyWash(NARROW_RUN), wash(NARROW_RUN, 32)],
      NARROW_RUN,
    );
    expect(widths).toEqual([32]);
    expect(widths.some((width) => Number.isNaN(width))).toBe(false);
  });
});

describe("uniform", () => {
  it("holds at the tolerance boundary and fails one pixel past it", () => {
    expect(uniform([48, 49, 48.5], 1)).toBe(true);
    expect(uniform([48, 49.2], 1)).toBe(false);
  });

  it("is false for an empty run", () => {
    expect(uniform([], 1)).toBe(false);
  });
});

describe("proportional", () => {
  it("requires the margin, not merely a wider run", () => {
    expect(proportional(32, 120, 16)).toBe(true);
    expect(proportional(48, 48, 16)).toBe(false);
    expect(proportional(48, 60, 16)).toBe(false);
  });
});

describe("differs and same", () => {
  it("agree on a clear gap and disagree at their own boundary", () => {
    expect(differs(100, 115, 4)).toBe(true);
    expect(differs(100, 102, 4)).toBe(false);
    expect(same(100, 102, 2)).toBe(true);
    expect(same(100, 103, 2)).toBe(false);
  });
});

describe("missingFamilyIsForeign", () => {
  it("accepts the fixture and refuses a real platform family", () => {
    expect(missingFamilyIsForeign("Menlo")).toBe(true);
    expect(missingFamilyIsForeign(MISSING_FAMILY)).toBe(false);
  });
});
