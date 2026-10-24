import { themes } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BlockIndex } from "./block-index";
import { blockList } from "./blocks";

/**
 * The Blocks index cards.
 *
 * The sign-in page is the first block whose preview carries links of its own
 * (the navbar, the reset card and the footer), and the index used to wrap the
 * whole card in one `<a>`. That nested an anchor inside an anchor — invalid
 * HTML, and a hydration error in the browser — so the card is a plain box and
 * its title is the link. A card that goes back to wrapping the preview fails
 * here rather than in the console.
 */

vi.mock("./platform-toggle", () => ({
  usePlatform: () => ({
    platform: "darwin",
    look: "native",
    mode: "dark",
    theme: themes.dark,
    setPlatform: () => undefined,
    setLook: () => undefined,
    setMode: () => undefined,
  }),
}));

describe("the Blocks index", () => {
  const markup = renderToStaticMarkup(<BlockIndex />);

  it("links a card by its title, never by a box around the preview", () => {
    expect(markup).toContain('<div class="gx-block-card-link">');
    expect(markup).toContain(
      '<h3 class="gx-block-card-title"><a href="/docs/blocks/sign-in">Sign in</a></h3>',
    );
    expect(markup).not.toContain('<a class="gx-block-card-link"');
  });

  it("links every registered block, once, in registry order", () => {
    const hrefs = [
      ...markup.matchAll(/<a href="\/docs\/blocks\/([a-z-]+)"/g),
    ].map((match) => match[1]);

    expect(hrefs).toEqual(blockList.map((block) => block.slug));
  });
});
