import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  headerHeightOf,
  pinnedHeaderHeight,
  pinnedHeaders,
  sectionBands,
  sectionsOf,
} from "./logic.js";

const heights = [232, 232];

describe("sectionBands", () => {
  it("folds the measured heights into content-space tops", () => {
    expect(sectionBands([100, 40, 8])).toEqual([
      { top: 0, height: 100 },
      { top: 100, height: 40 },
      { top: 140, height: 8 },
    ]);
  });

  it("treats an unmeasured or broken height as nothing yet", () => {
    expect(sectionBands([Number.NaN, -20, 50])).toEqual([
      { top: 0, height: 0 },
      { top: 0, height: 0 },
      { top: 0, height: 50 },
    ]);
  });
});

describe("pinnedHeaders", () => {
  it("paints each header at its section's place before the list scrolls", () => {
    expect(pinnedHeaders(heights, 0, 32)).toMatchObject([
      { index: 0, top: 0, pinned: false, visible: true },
      { index: 1, top: 232, pinned: false, visible: true },
    ]);
  });

  it("travels a header with its section and holds it at the top", () => {
    const frames = pinnedHeaders(heights, -100, 32);
    expect(frames[0]).toMatchObject({ top: 0, pinned: true, visible: true });

    expect(frames[1]).toMatchObject({ top: 132, pinned: false });
  });

  it("is pushed out of the viewport by the section's last row", () => {
    expect(pinnedHeaders(heights, -220, 32)[0]).toMatchObject({
      top: -20,
      visible: true,
    });

    expect(pinnedHeaders(heights, -232, 32)[0]).toMatchObject({
      top: -32,
      visible: false,
    });
  });

  it("hands the top to the next section when one ends", () => {
    expect(pinnedHeaders(heights, -240, 32)).toMatchObject([
      { visible: false },
      { top: 0, pinned: true, visible: true },
    ]);
  });

  it("paints no header for a section that has not been measured", () => {
    expect(pinnedHeaders([0, 232], 0, 32)[0]?.visible).toBe(false);
  });

  it("falls back for a height or offset it cannot paint", () => {
    expect(pinnedHeaderHeight).toBe(32);
    expect(headerHeightOf(Option.none())).toBe(32);
    expect(headerHeightOf(Option.some(Number.NaN))).toBe(32);
    expect(headerHeightOf(Option.some(0))).toBe(32);
    expect(headerHeightOf(Option.some(41.6))).toBe(42);

    expect(pinnedHeaders(heights, Number.NaN, 32)[0]?.top).toBe(0);
    expect(pinnedHeaders(heights, 40, 32)[0]?.top).toBe(0);
  });

  it("reads a stored section list as sections, and nothing for anything else", () => {
    const today = { title: "Today" } as const;
    const yesterday = { title: "Yesterday" } as const;
    expect(sectionsOf([today, yesterday])).toEqual([today, yesterday]);
    expect(sectionsOf(null)).toEqual([]);
    expect(sectionsOf(undefined)).toEqual([]);
    expect(sectionsOf([])).toEqual([]);
  });

  it("drops an entry that names no section, keeping the ones beside it", () => {
    const today = { title: "Today" } as const;
    const yesterday = { title: "Yesterday" } as const;
    expect(
      sectionsOf([
        // @ts-expect-error — a deleted record a store left in the list.
        null,
        today,
        // @ts-expect-error — a title a store wrote as something else.
        { title: 42 },
        { title: "   " },
        yesterday,
      ]),
    ).toEqual([today, yesterday]);
  });
});
