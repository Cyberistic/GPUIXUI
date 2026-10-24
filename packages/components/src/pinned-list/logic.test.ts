/**
 * The pinned header's arithmetic, without a renderer.
 *
 * The bugs these guard: a header that jumps to the top before its section gets
 * there; one that scrolls away instead of holding; one that outlives its section
 * and paints over the next; a section that paints a header before it has been
 * measured (so every header stacks at the top of the first frame); a `NaN`
 * header height or offset reaching the runtime as a style value; and content
 * tops folded from painted `y`s, which already carry the shift they would feed
 * back into; and a section list a store handed back as `null`, which threw
 * before the first header painted.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  headerHeightOf,
  pinnedHeaderHeight,
  pinnedHeaders,
  sectionBands,
  sectionsOf,
} from "./logic.js";

/** Two 200px sections with a 32px header each. */
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
    // The next section is still 132px below the viewport top.
    expect(frames[1]).toMatchObject({ top: 132, pinned: false });
  });

  it("is pushed out of the viewport by the section's last row", () => {
    // At -220 the first section's bottom is 12px from the top, so its header is
    // already 20px above the viewport and only its bottom edge shows.
    expect(pinnedHeaders(heights, -220, 32)[0]).toMatchObject({
      top: -20,
      visible: true,
    });
    // At -232 the section has ended: the header has nowhere left to paint.
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
    // A NaN header would reach the runtime as null and drop the row.
    expect(pinnedHeaderHeight).toBe(32);
    expect(headerHeightOf(Option.none())).toBe(32);
    expect(headerHeightOf(Option.some(Number.NaN))).toBe(32);
    expect(headerHeightOf(Option.some(0))).toBe(32);
    expect(headerHeightOf(Option.some(41.6))).toBe(42);
    // A bounce past the start is the start, not a negative scroll.
    expect(pinnedHeaders(heights, Number.NaN, 32)[0]?.top).toBe(0);
    expect(pinnedHeaders(heights, 40, 32)[0]?.top).toBe(0);
  });

  it("reads a stored section list as sections, and nothing for anything else", () => {
    // A sectioned list is composed in code as often as it is restored with a
    // saved layout, and JSON writes `null` for a list a record never carried:
    // `Arr.map` over it threw `self is not iterable` from the first render.
    const today = { title: "Today" } as const;
    const yesterday = { title: "Yesterday" } as const;
    expect(sectionsOf([today, yesterday])).toEqual([today, yesterday]);
    expect(sectionsOf(null)).toEqual([]);
    expect(sectionsOf(undefined)).toEqual([]);
    expect(sectionsOf([])).toEqual([]);
  });

  it("drops an entry that names no section, keeping the ones beside it", () => {
    // A deleted record leaves `null` inside the list, and an entry whose title
    // is not text has no key for its measured height and no words for its
    // header: the row threw on that title while its neighbours painted.
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
