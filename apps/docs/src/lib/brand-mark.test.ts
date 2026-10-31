/**
 * The brand marks. The bugs this guards: the vector logo was redrawn as a
 * purple square (73132e369) while every raster favicon kept Gon, so the tab, the
 * nav and the social image disagreed; and a mark drawn in fixed colours that
 * could not follow the theme's ink.
 *
 * Two marks, one rule each: the favicon and the logo are the two-colour Gon the
 * raster set carries; the marks the interface draws are the one-colour outline
 * of it, painted in the surrounding text colour through a mask.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** Gon's hair and skin, as the raster favicons paint them. */
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
