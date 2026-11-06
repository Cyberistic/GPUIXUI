import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const HAIR = "#0A1D0F";
const SKIN = "#FBCAA1";

const rule = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
};

describe("the brand marks", () => {
  it("keeps the two-colour Gon as the logo and the favicon", () => {
    const logo = read("../../public/logo.svg");
    expect(read("../../public/favicon.svg")).toBe(logo);
    expect(logo).toContain(`fill="${HAIR}"`);
    expect(logo).toContain(`fill="${SKIN}"`);
  });

  it("draws the outline mark in one colour, the theme's own", () => {
    const outline = read("../../public/logo-outline.svg");
    expect(outline).toContain('stroke="currentColor"');
    expect(outline).toContain('fill="none"');
    for (const [file, selector] of [
      ["../styles/app.css", ".gx-mark"],
      ["../styles/landing.css", ".landing-mark"],
      ["../styles/blocks.css", ".gx-dash-logo-mark"],
    ] as const) {
      const mark = rule(read(file), selector);
      expect(mark).toContain('mask: url("/logo-outline.svg")');
      expect(mark).toContain("background: currentColor");
    }
  });
});
