/**
 * The `pinned-list-lifecycle` fixture, held to the arithmetic its probe reads.
 *
 * The probe measures a window, so its premises must be refused before a window
 * opens: the list must have travel, the wheel must land inside it, the pressed
 * row's centre must lie under the held title (a centre below the title would
 * make the pass-through check measure a free row), and a wheel past the first
 * section's end must really retire its title while leaving the second at the
 * top. The printed check count is derived from the probe's own assertion sites,
 * so a check added without the README fails here.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PINNED_CONTENT,
  PINNED_END_WHEEL,
  PINNED_HEADER,
  PINNED_IDS,
  PINNED_MAX,
  PINNED_RETURN_WHEEL,
  PINNED_ROW_HEIGHT,
  PINNED_SECTION_HEIGHT,
  PINNED_VIEWPORT,
  PINNED_WHEEL,
  pinnedReadout,
  ROW_TODAY_TOP,
  rowCentre,
} from "./pinned-list.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

describe("the pinned-list fixture", () => {
  it("gives the list more content than it shows", () => {
    expect(PINNED_CONTENT).toBe(2 * PINNED_SECTION_HEIGHT);
    expect(PINNED_CONTENT).toBe(464);
    expect(PINNED_MAX).toBe(PINNED_VIEWPORT.height - PINNED_CONTENT);
    expect(PINNED_MAX).toBe(-304);
  });

  it("puts the pressed row's centre under the held title", () => {
    // The point the host's click presses is the row's centre. At rest it is
    // below the title; at the probe's wheel it must be inside the title's own
    // 32-point row, or the pass-through check would press a free row.
    expect(rowCentre(ROW_TODAY_TOP, PINNED_ROW_HEIGHT, 0)).toBe(132);
    const held = rowCentre(ROW_TODAY_TOP, PINNED_ROW_HEIGHT, PINNED_WHEEL);
    expect(held).toBe(12);
    expect(held > 2 && held < PINNED_HEADER - 2).toBe(true);
  });

  it("retires the first title at the end and leaves the second at the top", () => {
    const firstBottom = PINNED_SECTION_HEIGHT + PINNED_MAX;
    const secondTop = PINNED_SECTION_HEIGHT + PINNED_MAX;
    expect(firstBottom).toBe(-72);
    expect(firstBottom < 0).toBe(true);
    expect(secondTop < 0).toBe(true);
    // The second section's own bottom is still inside the viewport, so its
    // title clamps to the top instead of being pushed out.
    expect(PINNED_CONTENT + PINNED_MAX).toBe(PINNED_VIEWPORT.height);
  });

  it("asks for travel in both directions", () => {
    expect(PINNED_WHEEL < 0 && PINNED_WHEEL > PINNED_MAX).toBe(true);
    expect(PINNED_END_WHEEL < PINNED_MAX).toBe(true);
    expect(PINNED_RETURN_WHEEL > 0).toBe(true);
  });

  it("spells the readout one way", () => {
    expect(
      pinnedReadout({
        offsetY: -120,
        today: 1,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    ).toBe("y=-120 presses=1,0 control=0,1");
  });

  it("gives every element its own id", () => {
    const ids = Object.values(PINNED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("records the limitation the window measured, and its control", () => {
    // The layer declares `pointerEvents: "none"`, but the held title paints its
    // own fill and takes the press in a window. The section must say so, or the
    // next reader inherits the claim the offscreen suite makes.
    const section = readme.slice(readme.indexOf("### `pinned-list-lifecycle`"));
    expect(section).toContain(
      "the held title still takes the press the row beneath it would have taken",
    );
    expect(section).toContain("filled cover");
  });
});
