import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUBMENU_GAP, submenuPlacement } from "./context-menu-preview";

/**
 * The second level must open beside its parent, not over it.
 *
 * Guarded bug: the context menu's scene was 520px wide, so a 208px submenu
 * hanging off a 208px parent had no room on the right. The flip rule then put it
 * on the left — where, at the pointer's own position, it covered the menu it
 * belongs to (`Share ›` painted `Copy link` and `Email` across `Open`, `Rename`
 * and `Copy path`).
 *
 * The scene is wide enough for a second level now, and the rule keeps its
 * promise for either side: a menu that opens to the right sits at the parent's
 * edge plus the gap, and one that has to flip stays clear of the parent.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

/** The parent menu's width, from the drawing's own recipe. */
const PARENT = 208;
const SUBMENU = { width: 208, height: 60 };
const ROW_HEIGHT = 24;

describe("a second level", () => {
  it("opens to the right of its parent when the frame has room", () => {
    // The scene's own frame, and a menu opened on the file list as the demo
    // does: the row sits inside the scene, not at its left edge.
    const frame = { width: 760, height: 320 };
    const parent = { x: 20, y: 84, width: PARENT, height: 156 };
    const row = { x: 25, y: 88, width: 196, height: ROW_HEIGHT };

    const placed = submenuPlacement({ parent, row, submenu: SUBMENU, frame });

    // Beside the parent, not over it: the submenu's left edge is the parent's
    // right edge plus the gap.
    expect(placed.x).toBe(PARENT + SUBMENU_GAP);
    expect(placed.y).toBe(row.y - parent.y);
    // And the whole surface is inside the frame.
    expect(parent.x + placed.x + SUBMENU.width).toBeLessThanOrEqual(
      frame.width,
    );
  });

  it("never lands on top of its parent when it flips", () => {
    // A narrow frame forces the flip; the flipped surface must be clear of the
    // parent's own box, which is the defect the reader saw.
    const frame = { width: 520, height: 320 };
    const parent = { x: 312, y: 84, width: PARENT, height: 156 };
    const row = { x: 317, y: 88, width: 196, height: ROW_HEIGHT };

    const placed = submenuPlacement({ parent, row, submenu: SUBMENU, frame });
    const left = parent.x + placed.x;
    const right = left + SUBMENU.width;

    expect(right).toBeLessThanOrEqual(parent.x);
    expect(left).toBeGreaterThanOrEqual(0);
  });

  it("has a scene wide enough to hold one", () => {
    // The rule can only keep its promise when the frame the drawing gives it
    // has the room: `parent + gap + submenu` must fit inside the scene.
    const scene = rule(".gx-context-scene");
    const width = Number(/max-width: (\d+)px;/.exec(scene)?.[1]);

    expect(width).toBeGreaterThan(0);
    // The parent menu opens at the pointer, which on the demo's file list sits
    // about 176px into the scene — measured. So the child needs
    // 176 + 208 + 4 + 208 = 596 before the flip rule fires at all.
    const PARENT_INSET = 176;
    expect(width).toBeGreaterThanOrEqual(
      PARENT_INSET + PARENT + SUBMENU_GAP + SUBMENU.width,
    );
    // It still has to fit the stage the docs give a preview.
    expect(width).toBeLessThanOrEqual(834);
  });
});
