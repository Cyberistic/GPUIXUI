import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Three drawing defects the owner named, held together because they are all
 * "a preview that does not show what it claims".
 *
 * - A menu row wore a 2px accent bar on its left edge. A highlighted row is its
 *   wash; the bar sat beside the chevron or the check that already says what
 *   the row is, and read as a second, unrelated mark.
 * - The dialog and confirmation had the drawer's veil and filter but nothing
 *   behind them to blur, so their backdrop read flat while the drawer's read.
 * - The input group's leading glyph was a text character at 14px in the page's
 *   own family: it read as punctuation rather than a search icon.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const css = read("apps/docs/src/styles/demos.css");
const demos = read("apps/docs/src/components/docs/demos.tsx");
const inputGroup = read("apps/docs/src/components/docs/input-group-demo.tsx");
const menuItem = read("packages/components/src/menu/item.tsx");

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("a menu row's emphasis", () => {
  it("is its wash, with no bar on the row's edge", () => {
    expect(rule(".gx-menu-row")).not.toContain("border-left");
    expect(css).not.toContain("border-left-color");
    // The component that the drawing mirrors paints it the same way: no bar,
    // and no `mark` flag left behind for one.
    expect(menuItem).not.toContain("borderLeftWidth");
    expect(menuItem).not.toContain("readonly mark?: boolean");
  });
});

describe("an overlay's veil", () => {
  it("has a page behind it, so the blur has something to sample", () => {
    // Both scenes draw the page the surface covers. Without it the filter ran
    // over the empty scene and the three overlays looked different.
    expect(demos).toContain('className="gx-dialog-behind"');
    expect(rule(".gx-dialog-behind")).toContain("background: var(--card)");
    // The drawer already had its own app bar and content behind the veil.
    expect(
      (demos.match(/gx-dialog-behind/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps one veil recipe for every family", () => {
    expect(rule(".gx-overlay-veil")).toContain("backdrop-filter: blur(6px)");
  });
});

describe("a field's leading glyph", () => {
  it("is the icon set's, at the size a field uses", () => {
    expect(inputGroup).toContain('<BlockIcon name="search" size={16} />');
    expect(inputGroup).not.toContain("⌕");
    expect(rule(".gx-ig-addon .gx-block-glyph")).toContain("width: 16px");
  });
});
