import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demos } from "./demos";

/**
 * The card previews, as they render.
 *
 * The gallery used to be three cards of one width, each floating beside an
 * uppercase label with no shared edge, and the footer had no bottom padding, so
 * the last row sat on the clipped corner. These cases hold the drawing to the
 * comparison it now claims: one grid, equal columns, a caption per treatment,
 * and a footer that clears the edge.
 */

const demo = demos["card-variants"];

if (demo === undefined) throw new Error("card-variants is not registered");

const markup = renderToStaticMarkup(<>{demo.render()}</>);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the card treatments preview", () => {
  it("draws one card per treatment, each with a real caption", () => {
    expect(markup.match(/class="gx-card gx-card-/g)?.length).toBe(3);
    expect(markup.match(/<figcaption class="gx-card-caption">/g)?.length).toBe(
      3,
    );
    const captions = ["Outline", "Elevated", "Plain"].filter(
      (name) => !markup.includes(`<b>${name}</b>`),
    );
    expect(captions).toEqual([]);
    // The old eyebrow read as another heading; a caption names what the card is.
    expect(markup).not.toContain('class="gx-demo-label">outline');
  });

  it("gives the three cards one column width and a shared baseline", () => {
    expect(block(".gx-card-grid")).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))",
    );
    expect(block(".gx-card-grid")).toContain("align-items: start");
    expect(block(".gx-card")).toContain("width: 100%");
    expect(block(".gx-card-column")).toContain("min-width: 0");
  });

  it("pads the footer's bottom edge instead of clipping the last row", () => {
    const footer = block(".gx-card-footer");

    expect(footer).toContain("padding: 12px");
    expect(footer).not.toContain("12px 12px 0");
  });
});
