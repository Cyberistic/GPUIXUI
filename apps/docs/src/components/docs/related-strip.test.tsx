import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelatedStrip } from "./related-strip";

/**
 * The strip is the only place a package page links its siblings, so it has to
 * print the family's links, name the family, and stay silent where there is no
 * sibling to offer rather than leaving an empty box at the bottom of the page.
 */

const render = (url: string, sections: ReadonlyArray<string> = []): string =>
  renderToStaticMarkup(<RelatedStrip sections={sections} url={url} />);

describe("the related strip", () => {
  it("prints the page's siblings, each linked to its page", () => {
    const markup = render("/docs/components/ripple-button");

    expect(markup).toContain("Related · Actions and their effects");
    expect(markup).toContain('href="/docs/components/liquid-button"');
    expect(markup).toContain(">Liquid button</a>");
    expect(markup).toContain('href="/docs/components/button"');
    expect(markup).not.toContain('href="/docs/components/ripple-button"');
  });

  it("keeps a package page linked to the curated page the site serves", () => {
    // The curated page keeps its URL, so it is what a reader follows; the
    // package page it shadows is never mounted.
    const markup = render("/docs/components/preview-card");

    expect(markup).toContain('href="/docs/components/dialog"');
    expect(markup).toContain(">Dialog</a>");
  });

  it("stays silent where the page writes its own Related section", () => {
    // Thirty-one mounted package pages write the section themselves; printing
    // the generated family under theirs would offer two lists of siblings.
    expect(
      render("/docs/data-display/column-configuration", [
        "#usage",
        "#api",
        "#related",
      ]),
    ).toBe("");
    expect(
      render("/docs/data-display/column-configuration", ["#usage", "#api"]),
    ).toContain("Related · Table surfaces");
  });

  it("is mounted with the page's own heading anchors, so a written section is not repeated", () => {
    // The strip cannot see the Markdown; the frame hands it the table of
    // contents Fumadocs already built. Dropping the prop would print a second
    // Related list under the 31 pages that write one.
    const view = readFileSync(
      new URL("../../lib/docs-view.tsx", import.meta.url),
      "utf8",
    );

    expect(view).toContain("<RelatedStrip");
    expect(view).toContain("sections={toc.map((entry) => entry.url)}");
    expect(view).toContain("url={url}");
  });

  it("renders nothing for an argued solo or a page outside the component lanes", () => {
    expect(render("/docs/primitives/tooltip")).toBe("");
    expect(render("/docs/components/not-a-page")).toBe("");
    expect(render("/docs/theming")).toBe("");
  });
});
