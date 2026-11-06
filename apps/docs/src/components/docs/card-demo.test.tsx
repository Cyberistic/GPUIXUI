import { readFileSync } from "node:fs";
import { CARD_FOOTER, classesToStyle } from "@gpuixui/tw";
import { themes } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demos } from "./demos";

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

    expect(markup).not.toContain('class="gx-demo-label">outline');
  });

  it("gives the three cards one column width and a shared baseline", () => {
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
