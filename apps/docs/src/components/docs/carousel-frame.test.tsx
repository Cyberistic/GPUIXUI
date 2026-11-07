import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CarouselWorkflow } from "./carousel-demo";

const markup = renderToStaticMarkup(<CarouselWorkflow />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the carousel preview", () => {
  it("keeps every slide mounted, with one on stage", () => {
    expect(markup.match(/class="gx-carousel-slide"/g)?.length).toBe(4);
    expect(markup.match(/data-active=""/g)?.length).toBe(1);

    expect(markup).not.toMatch(/gx-carousel-slide[^>]*hidden/);

    expect(markup.match(/inert=""/g)?.length).toBe(3);
  });

  it("takes its height from the tallest slide, not the active one", () => {
    expect(block(".gx-carousel-viewport")).toContain("display: grid");
    expect(block(".gx-carousel-viewport")).toContain("align-content: start");
    expect(block(".gx-carousel-slide")).toContain("grid-area: 1 / 1");
    expect(block(".gx-carousel-slide")).toContain("visibility: hidden");
    expect(block(".gx-carousel-slide[data-active]")).toContain(
      "visibility: visible",
    );
  });

  it("pins the controls below the frame so stepping cannot move them", () => {
    expect(block(".gx-carousel-footer")).toContain("margin-top: auto");
    expect(block(".gx-carousel-card")).not.toContain("min-height: 150px");
  });
});
