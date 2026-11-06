import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUBMENU_GAP, submenuPlacement } from "./context-menu-preview";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const PARENT = 208;
const SUBMENU = { width: 208, height: 60 };
const ROW_HEIGHT = 24;

describe("a second level", () => {
  it("opens to the right of its parent when the frame has room", () => {
    const frame = { width: 760, height: 320 };
    const parent = { x: 20, y: 84, width: PARENT, height: 156 };
    const row = { x: 25, y: 88, width: 196, height: ROW_HEIGHT };

    const placed = submenuPlacement({ parent, row, submenu: SUBMENU, frame });

    expect(placed.x).toBe(PARENT + SUBMENU_GAP);
    expect(placed.y).toBe(row.y - parent.y);

    expect(parent.x + placed.x + SUBMENU.width).toBeLessThanOrEqual(
      frame.width,
    );
  });

  it("never lands on top of its parent when it flips", () => {
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
    const scene = rule(".gx-context-scene");
    const width = Number(/max-width: (\d+)px;/.exec(scene)?.[1]);

    expect(width).toBeGreaterThan(0);

    const PARENT_INSET = 176;
    expect(width).toBeGreaterThanOrEqual(
      PARENT_INSET + PARENT + SUBMENU_GAP + SUBMENU.width,
    );

    expect(width).toBeLessThanOrEqual(834);
  });
});
