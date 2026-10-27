/**
 * The rolling-text preview, as it renders.
 *
 * The bug this guards: the clip was sized `1.3em` from the page's 15px type
 * while the value paints at 26px, so the line box was 19.5px tall and cut the
 * top and bottom off every value the page showed — a reader saw a cropped
 * "Idle". The rule is the component's own: the clip is **one line of the value
 * it holds**, so the height is derived from the value's line height here rather
 * than trusted as a literal.
 */

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RollingTextDemo } from "./rolling-text-demo";

const markup = renderToStaticMarkup(<RollingTextDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

/** One declaration's value, or `""` when the block does not carry it. */
const value = (selector: string, property: string): string =>
  new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`)
    .exec(block(selector))?.[1]
    ?.trim() ?? "";

describe("the rolling-text preview", () => {
  it("renders the value and the control that changes it", () => {
    expect(markup).toContain('class="gx-rolling-line"');
    expect(markup).toContain('class="gx-rolling-value"');
    expect(markup).toContain(">Idle<");
    expect(markup).toContain("Next state");
  });

  it("clips one line of the value, not one line of the page", () => {
    // Measured on the live page before the fix: the clip was 19.49px tall and
    // the value 28px, so the glyphs were cut at both edges.
    const line = value(".gx-rolling-value", "line-height");
    expect(line).toBe("28px");
    expect(value(".gx-rolling-line", "height")).toBe(line);
  });

  it("holds a line box tall enough for the type it sets", () => {
    const size = Number.parseFloat(value(".gx-rolling-value", "font-size"));
    const height = Number.parseFloat(value(".gx-rolling-line", "height"));
    expect(size).toBe(26);
    expect(height).toBeGreaterThanOrEqual(size);
  });
});
