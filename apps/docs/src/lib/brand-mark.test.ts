/**
 * The site mark is the Gon mark the favicon set carries. The bug this guards:
 * the vector logo was redrawn as a purple square (73132e369) while every raster
 * favicon kept Gon, so the tab, the nav and the social image disagreed; and the
 * nav drew the mark as a one-colour mask, losing the face.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/** Gon's hair and skin, as the raster favicons paint them. */
const HAIR = "#0A1D0F";
const SKIN = "#FBCAA1";

describe("the brand mark", () => {
  it("is the same two-colour mark in the logo and the favicon", () => {
    const logo = read("../../public/logo.svg");
    expect(read("../../public/favicon.svg")).toBe(logo);
    expect(logo).toContain(`fill="${HAIR}"`);
    expect(logo).toContain(`fill="${SKIN}"`);
  });

  it("is drawn in its own colours wherever the site shows it", () => {
    const rule = (css: string, selector: string) =>
      css.slice(css.indexOf(`${selector} {`), css.indexOf("}", css.indexOf(`${selector} {`)));
    const marks = [
      rule(read("../styles/app.css"), ".gx-mark"),
      rule(read("../styles/landing.css"), ".landing-mark"),
      rule(read("../styles/blocks.css"), ".gx-dash-logo-mark"),
    ];
    for (const mark of marks) {
      expect(mark).toContain('url("/logo.svg")');
      expect(mark).not.toContain("mask");
    }
  });
});
