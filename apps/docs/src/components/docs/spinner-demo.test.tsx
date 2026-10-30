import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The spinner drawing, held to the marks it paints.
 *
 * Bug guarded: the demo's ring was rewritten to a box of absolutely placed
 * ticks, and the style sheet kept only the reduced-motion mention of
 * `.gx-spin-tick` — no size, no fill. The page rendered two labels around
 * nothing until a reader refreshed, and the component's whole anatomy was
 * invisible. These cases hold the three classes to rules and the in-button
 * rings to the accents that read on their fills.
 */

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("../../styles/demos.css");
const source = read("./spinner-demo.tsx");

/** The declarations of the first `selector { … }` block. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the spinner drawing", () => {
  it("paints a ring box and a tick", () => {
    expect(block(".gx-spin-ring")).toContain("position: relative");
    expect(block(".gx-spin-tick")).toContain("position: absolute");
    expect(block(".gx-spin-tick")).toContain(
      "background-color: var(--primary)",
    );
  });

  it("tints the accented rings with their own role", () => {
    expect(
      block('.gx-spin-ring[data-accent="destructive"] .gx-spin-tick'),
    ).toContain("var(--destructive)");
    expect(block('.gx-spin-ring[data-accent="muted"] .gx-spin-tick')).toContain(
      "var(--muted-foreground)",
    );
  });

  it("reads a ring on a filled button in that button's own ink", () => {
    // A `muted` ring on a primary button is grey on blue; the accents that read
    // on a fill are the `on-*` roles the primitive names.
    expect(source).toContain('accent="on-primary"');
    expect(source).toContain('accent="on-secondary"');
    expect(source).toContain('accent="on-destructive"');
    expect(source).not.toMatch(/gx-btn-primary[\\s\\S]{0,80}accent="muted"/);
  });
});
