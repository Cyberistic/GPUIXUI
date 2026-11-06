import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

const css = read("apps/docs/src/styles/demos.css");
const demos = read("apps/docs/src/components/docs/demos.tsx");
const inputGroup = read("apps/docs/src/components/docs/input-group-demo.tsx");
const menuItem = read("packages/components/src/menu/item.tsx");

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("a menu row's emphasis", () => {
  it("is its wash, with no bar on the row's edge", () => {
    expect(rule(".gx-menu-row")).not.toContain("border-left");
    expect(css).not.toContain("border-left-color");

    expect(menuItem).not.toContain("borderLeftWidth");
    expect(menuItem).not.toContain("readonly mark?: boolean");
  });
});

describe("an overlay's veil", () => {
  it("has a page behind it, so the blur has something to sample", () => {
    expect(demos).toContain('className="gx-dialog-behind"');
    expect(rule(".gx-dialog-behind")).toContain("background: var(--card)");

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
