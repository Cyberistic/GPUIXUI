/**
 * The image-zoom preview, as it renders.
 *
 * The bug this guards: the style sheet's preflight caps every image at its
 * container's width (`max-width: 100%`), so the hover rule that asked for 160%
 * grew the picture's **height** alone — measured on the live page, 358.75 ×
 * 312.16 inside the 360 × 200 frame. The picture squashed instead of
 * magnifying, which is not the lens the page claims. The magnifier's own rule is
 * the component's: both axes grow by the same factor, so the picture keeps the
 * frame's shape and stays centred on it.
 */

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageZoomDemo } from "./image-zoom-demo";

const markup = renderToStaticMarkup(<ImageZoomDemo />);

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

/** A percentage declaration as a number, failing on anything else. */
const percent = (selector: string, property: string): number => {
  const declared = value(selector, property);
  if (!declared.endsWith("%")) {
    throw new Error(`${selector} ${property} is not a percentage: ${declared}`);
  }
  return Number.parseFloat(declared);
};

describe("the image-zoom preview", () => {
  it("draws the picture inside the frame it magnifies in", () => {
    expect(markup).toContain('class="gx-imagezoom"');
    expect(markup).toContain(
      'alt="A chart of the harbour with four approaches"',
    );
  });

  it("lifts the cap that let the picture grow in one direction only", () => {
    // `max-width: none` is the whole fix: preflight's `max-width: 100%` wins
    // over the hover rule's `width`, so a magnified picture was stretched.
    expect(value(".gx-imagezoom img", "max-width")).toBe("none");
  });

  it("magnifies both axes by the same factor", () => {
    expect(percent(".gx-imagezoom:hover img", "width")).toBe(160);
    expect(percent(".gx-imagezoom:hover img", "height")).toBe(160);
  });

  it("centres the magnified picture on the frame", () => {
    // The overflow is 60% of the frame, so half of it hangs out on each side:
    // an off-centre pan would crop the picture unevenly.
    const grow = percent(".gx-imagezoom:hover img", "width") - 100;
    expect(percent(".gx-imagezoom:hover img", "left")).toBe(-grow / 2);
    expect(percent(".gx-imagezoom:hover img", "top")).toBe(-grow / 2);
  });
});
