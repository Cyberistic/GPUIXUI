import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UserMenuDemo } from "./sidebar-demo";
import {
  ANCHOR_WIDTH,
  MENU_WIDTH,
  SIDE_OFFSET,
  STAGE_INSET,
  STAGE_MENU_LEFT,
  STAGE_WIDTH,
  TRIGGER_RIGHT,
} from "./user-menu-preview";

/**
 * The user menu drawing has to paint the person and open from the right.
 *
 * The bugs these guard: the account drawing painted an initials disc with the
 * letter "B" on both the trigger and the menu header, while the same person's
 * avatar elsewhere is a picture — `Avatar` paints `src` whenever it has one —
 * and the menu was anchored at the trigger's left edge (`left: 0`), so it
 * opened rightward where `user-menu.tsx` opens with `align="end"`.
 *
 * `node:fs` is a test-time read of a checked-in file.
 */

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const menu = read("../../../../../packages/components/src/user-menu.tsx");

/** The declarations of the first `selector { … }` block. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

/** The number of times `needle` appears in `text`. */
const count = (text: string, needle: string): number =>
  text.split(needle).length - 1;

const scene = renderToStaticMarkup(<UserMenuDemo />);

describe("the user menu drawing", () => {
  it("paints the user's picture wherever the component would", () => {
    // The component takes `avatar` and paints it as the disc; without one it
    // paints the initials. This user has one, so no disc letter may show.
    expect(menu).toContain("const avatar = (");
    expect(menu).toContain("src={user.avatar}");
    expect(scene).toContain('class="gx-avatar-photo"');
    expect(count(scene, 'class="gx-avatar-photo"')).toBe(2);
    expect(scene).toContain('<img alt=""');
    expect(scene).not.toContain(">B</span>");
  });

  it("shows the same identity in the trigger and in the menu header", () => {
    expect(count(scene, ">Benji van der Brand</span>")).toBe(2);
    expect(count(scene, ">benji@example.com</span>")).toBe(2);
    expect(scene).toContain("Benji van der Brand account menu");
    expect(scene).toContain('aria-expanded="true"');
  });

  it("opens beside the footer row, on its right", () => {
    // A sidebar footer's account menu belongs beside the row, over the page
    // rather than over the panel it lives in: the row's right edge plus the
    // component's `sideOffset` is the menu's left edge. `align="end"` still
    // governs the vertical relation, so the two share a bottom.
    expect(menu).toContain('align = "end"');
    expect(menu).toContain("sideOffset={4}");
    expect(scene).toContain('data-align="end"');
    expect(scene).toContain('data-side="right"');
    expect(block('.gx-user-menu-content[data-side="right"]')).toContain(
      "left: calc(100% + 4px)",
    );
    expect(block('.gx-user-menu-content[data-side="right"]')).toContain(
      "bottom: 0",
    );
    // The trigger fills the anchor box, so its right edge is the menu's origin.
    expect(block(".gx-user-trigger")).toContain("width: 100%");
    expect(MENU_WIDTH).toBe(Number(/const MENU_WIDTH = (\d+)/.exec(menu)?.[1]));
    expect(SIDE_OFFSET).toBe(4);
  });

  it("keeps the anchored menu inside the stage it belongs to", () => {
    // The row is the footer's first child, so the menu that opens beside it
    // lands inside the stage. Its right edge is the check that matters: past
    // the stage's inset the menu is clipped, which is how this drawing once
    // shipped an invisible menu.
    expect(block(".gx-user-stage")).toContain("width: min(520px, 100%)");
    expect(block(".gx-user-stage")).toContain("overflow: hidden");
    expect(block(".gx-user-footer")).toContain("justify-content: flex-start");
    expect(block(".gx-user-footer")).toContain("padding: 8px");
    expect(block(".gx-user-footer .gx-user-menu")).toContain("width: 240px");

    expect(STAGE_WIDTH).toBe(520);
    expect(STAGE_INSET).toBe(8);
    expect(ANCHOR_WIDTH).toBe(240);
    expect(TRIGGER_RIGHT).toBe(STAGE_INSET + ANCHOR_WIDTH);
    // The relation the anchor states: the row's right edge plus the offset.
    expect(STAGE_MENU_LEFT).toBe(TRIGGER_RIGHT + SIDE_OFFSET);
    expect(STAGE_MENU_LEFT + MENU_WIDTH).toBeLessThanOrEqual(
      STAGE_WIDTH - STAGE_INSET,
    );
  });

  it("keeps the account anatomy the component documents", () => {
    for (const row of [
      "Upgrade to Pro",
      "Account",
      "Billing",
      "Notifications",
      "Log out",
    ]) {
      expect(scene).toContain(`>${row}</span>`);
    }
    expect(count(scene, 'class="gx-user-separator"')).toBe(3);
    expect(scene).toContain('data-destructive=""');
    // Every row carries its mark, as the component's `leading` does.
    expect(count(scene, 'class="gx-user-item"')).toBe(5);
    expect(count(scene, "<svg")).toBe(6);
  });
});
