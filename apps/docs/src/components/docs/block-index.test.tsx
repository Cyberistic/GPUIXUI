import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockIndex } from "./block-index";
import { blockList } from "./blocks";

describe("the Blocks index", () => {
  const markup = renderToStaticMarkup(<BlockIndex />);

  it("links a card by its title, never by a box around the preview", () => {
    expect(markup).toContain('<div class="gx-block-card-link">');
    expect(markup).toContain(
      '<h3 class="gx-block-card-title"><a href="/blocks/sign-in">Sign in</a></h3>',
    );
    expect(markup).not.toContain('<a class="gx-block-card-link"');
  });

  it("links every registered block, once, in registry order", () => {
    const hrefs = [...markup.matchAll(/<a href="\/blocks\/([a-z0-9-]+)"/g)].map(
      (match) => match[1],
    );

    expect(hrefs).toEqual(blockList.map((block) => block.slug));
  });

  it("paints a checked-in image per block, and no live scene", () => {
    const images = [
      ...markup.matchAll(
        /<img alt="" class="gx-block-card-thumb"[^>]*src="([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    expect(images).toEqual(
      blockList.map((block) => `/blocks/${block.slug}.webp`),
    );
    expect(markup).not.toContain("gx-demo");
  });
});
