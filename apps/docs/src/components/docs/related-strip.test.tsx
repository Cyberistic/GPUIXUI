import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelatedStrip } from "./related-strip";

const render = (url: string, sections: ReadonlyArray<string> = []): string =>
  renderToStaticMarkup(<RelatedStrip sections={sections} url={url} />);

describe("the related strip", () => {
  it("prints the page's siblings, each linked to its page", () => {
    const markup = render("/effects/ripple-button");

    expect(markup).toContain("Related · Actions and their effects");
    expect(markup).toContain('href="/effects/liquid-button"');
    expect(markup).toContain(">Liquid button</a>");
    expect(markup).toContain('href="/components/button"');
    expect(markup).not.toContain('href="/effects/ripple-button"');
  });

  it("keeps a package page linked to the curated page the site serves", () => {
    const markup = render("/components/preview-card");

    expect(markup).toContain('href="/components/dialog"');
    expect(markup).toContain(">Dialog</a>");
  });

  it("prints a curated page's siblings too, from the same family", () => {
    const markup = render("/components/dialog");

    expect(markup).toContain("Related · Overlays");
    expect(markup).toContain('href="/components/drawer"');
    expect(markup).toContain('href="/components/popover"');
    expect(markup).not.toContain('href="/components/dialog"');
  });

  it("stays silent where the page writes its own Related section", () => {
    expect(
      render("/data-display/column-configuration", [
        "#usage",
        "#api",
        "#related",
      ]),
    ).toBe("");
    expect(
      render("/data-display/column-configuration", ["#usage", "#api"]),
    ).toContain("Related · Table surfaces");
  });

  it("prints the media player's siblings, not an empty line", () => {
    const markup = render("/media/media-player");

    expect(markup).toContain("Related · Media surfaces");
    expect(markup).toContain('href="/media/crop-area"');
    expect(markup).not.toContain('href="/media/media-player"');
  });

  it("renders nothing for an argued solo or a page outside the component lanes", () => {
    expect(render("/primitives/tooltip")).toBe("");
    expect(render("/components/not-a-page")).toBe("");
    expect(render("/theming")).toBe("");
  });
});
