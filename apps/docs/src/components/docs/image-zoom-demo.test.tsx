import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageZoomDemo } from "./image-zoom-demo";

const markup = renderToStaticMarkup(<ImageZoomDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const value = (selector: string, property: string): string =>
  new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`)
    .exec(block(selector))?.[1]
    ?.trim() ?? "";

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
    expect(value(".gx-imagezoom img", "max-width")).toBe("none");
  });

  it("magnifies both axes by the same factor", () => {
    expect(percent(".gx-imagezoom:hover img", "width")).toBe(160);
    expect(percent(".gx-imagezoom:hover img", "height")).toBe(160);
  });

  it("centres the magnified picture on the frame", () => {
    const grow = percent(".gx-imagezoom:hover img", "width") - 100;
    expect(percent(".gx-imagezoom:hover img", "left")).toBe(-grow / 2);
    expect(percent(".gx-imagezoom:hover img", "top")).toBe(-grow / 2);
  });
});
