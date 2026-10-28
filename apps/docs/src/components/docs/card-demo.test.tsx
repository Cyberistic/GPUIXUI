import { readFileSync } from "node:fs";
import { CARD_FOOTER, classesToStyle } from "@gpuixui/tw";
import { themes } from "@gpuixui/tokens";
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
 *
 * The footer's actions were plain spans in a 190px column, so both labels broke
 * across two lines and the row read as text rather than as the card's actions.
 * They are the library's `sm` ghost buttons now, and the column floor is wide
 * enough to hold the pair — an action that wraps is not the recipe's row.
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

const FOOTER = classesToStyle(CARD_FOOTER, themes.dark).style;

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
    // The floor is the footer's, not a preferred density: three equal columns
    // that cannot hold two small actions would wrap them again.
    expect(block(".gx-card-grid")).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))",
    );
    expect(block(".gx-card-grid")).toContain("align-items: start");
    expect(block(".gx-card")).toContain("width: 100%");
    expect(block(".gx-card-column")).toContain("min-width: 0");
  });

  it("pads the footer's bottom edge instead of clipping the last row", () => {
    const footer = block(".gx-card-footer");

    expect(footer).toContain(`padding: ${FOOTER.paddingTop}px`);
    expect(footer).not.toContain("12px 12px 0");
  });

  it("draws each footer action as the recipe's small ghost button", () => {
    // Three cards, two actions each. A span here is the bug: nothing about a
    // span takes focus, presses or announces itself as the card's action.
    const actions = markup.match(
      /<button class="gx-btn gx-btn-ghost gx-btn-sm" type="button">/g,
    );

    expect(actions?.length).toBe(6);
    expect(markup).not.toContain("<span>Manage billing</span>");
    expect(markup).not.toContain("<span>Cancel plan</span>");
  });

  it("right-aligns the actions with the recipe's gap", () => {
    const footer = block(".gx-card-footer");

    expect(footer).toContain(`gap: ${FOOTER.gap}px`);
    expect(footer).toContain(`justify-content: ${FOOTER.justifyContent}`);
  });
});
