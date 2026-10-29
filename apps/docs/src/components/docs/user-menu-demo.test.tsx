import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UserMenuDemo } from "./sidebar-demo";

/**
 * The account menu's drawing.
 *
 * Guarded bugs: the menu opened **upward from a footer with no room above it**,
 * so the preview's frame cut off everything except its last row; and the menu
 * was a flat list of labels — no identity block, no icons, no groups — so it
 * looked nothing like the `UserMenu` it documents.
 *
 * The frame case is the one a rendering cannot be checked on: it is the stage
 * the drawing sits in that has to be tall enough, so the contract is read from
 * the source and the stylesheet the drawing is painted by.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const demo = read("apps/docs/src/components/docs/sidebar-demo.tsx");
const css = read("apps/docs/src/styles/demos.css");
const icons = read("apps/docs/src/components/docs/block-icons.tsx");

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const markup = renderToStaticMarkup(<UserMenuDemo />);

describe("the account menu's anatomy", () => {
  it("names the identity twice: in the trigger and in the menu's head", () => {
    // The trigger and the menu both carry the disc, the name and the address;
    // the old drawing put a bare name string in the menu.
    expect((markup.match(/gx-user-identity/g) ?? []).length).toBe(2);
    expect((markup.match(/gx-user-disc/g) ?? []).length).toBe(2);
    expect((markup.match(/gx-user-mail/g) ?? []).length).toBe(2);
  });

  it("paints five rows in three groups, each with its glyph", () => {
    expect((markup.match(/gx-user-item/g) ?? []).length).toBe(5);
    expect((markup.match(/gx-block-glyph/g) ?? []).length).toBe(5);
    // `Upgrade to Pro` stands alone, the three account rows sit together, and
    // `Log out` stands alone below them.
    expect((markup.match(/gx-user-group/g) ?? []).length).toBe(3);
  });

  it("marks `Log out` destructive and leaves the other rows alone", () => {
    expect((markup.match(/data-tone="destructive"/g) ?? []).length).toBe(1);
    expect(markup).toContain("Log out");
    expect(markup).toContain("Upgrade to Pro");
  });

  it("draws the icons the component names, not text stand-ins", () => {
    for (const glyph of ["sparkles", "badgeCheck", "card", "bell", "logout"]) {
      expect(icons).toContain(`${glyph}:`);
    }
  });
});

describe("the frame the menu opens inside", () => {
  it("opens upward from the footer, as a footer menu does", () => {
    expect(rule(".gx-user-menu")).toContain("bottom: calc(100% + 6px)");
  });

  it("gives the surface the room it needs", () => {
    // The menu is ~276px tall and opens upward; a stage shorter than that
    // clips it, which is what the reader saw.
    expect(demo).toContain("minHeight: 300");
    expect(demo).toContain('justifyContent: "flex-end"');
  });

  it("names the roles the shipped sidebar paints", () => {
    // The sidebar roles belong to the docs app's own chrome, not to the
    // library's theme, so a preview that used them fell back to the site's
    // *light* palette and painted a white panel in a dark stage.
    expect(demo).not.toContain("var(--sidebar");
    expect(demo).toContain("var(--card)");
    expect(demo).toContain("var(--accent)");
  });

  it("wears the popover recipe, with the theme's elevation", () => {
    const menu = rule(".gx-user-menu");

    expect(menu).toContain("background: var(--popover)");
    expect(menu).toContain("border: 1px solid var(--border)");
    expect(menu).toContain("box-shadow: var(--elevation-lg)");
    expect(menu).toContain("width: 224px");
    // A row aligns its label past its icon, so the labels share one edge.
    expect(rule(".gx-user-item")).toContain("gap: 8px");
  });
});
