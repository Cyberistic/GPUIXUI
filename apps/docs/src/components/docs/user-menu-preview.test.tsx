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

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const menu = read("../../../../../packages/components/src/user-menu.tsx");

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const count = (text: string, needle: string): number =>
  text.split(needle).length - 1;

const scene = renderToStaticMarkup(<UserMenuDemo />);

describe("the user menu drawing", () => {
  it("paints the user's picture wherever the component would", () => {
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

    expect(block(".gx-user-trigger")).toContain("width: 100%");
    expect(MENU_WIDTH).toBe(Number(/const MENU_WIDTH = (\d+)/.exec(menu)?.[1]));
    expect(SIDE_OFFSET).toBe(4);
  });

  it("keeps the anchored menu inside the stage it belongs to", () => {
    expect(block(".gx-user-stage")).toContain("width: min(520px, 100%)");
    expect(block(".gx-user-stage")).toContain("overflow: hidden");
    expect(block(".gx-user-footer")).toContain("justify-content: flex-start");
    expect(block(".gx-user-footer")).toContain("padding: 8px");
    expect(block(".gx-user-footer .gx-user-menu")).toContain("width: 240px");

    expect(STAGE_WIDTH).toBe(520);
    expect(STAGE_INSET).toBe(8);
    expect(ANCHOR_WIDTH).toBe(240);
    expect(TRIGGER_RIGHT).toBe(STAGE_INSET + ANCHOR_WIDTH);

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

    expect(count(scene, 'class="gx-user-item"')).toBe(5);
    expect(count(scene, "<svg")).toBe(6);
  });
});
