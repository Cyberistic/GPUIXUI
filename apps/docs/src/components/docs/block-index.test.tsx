import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
 *
 * A tile is now an image of the block's own page, not the scene itself: the
 * index mounted a dozen live compositions, so a reader paid for every block's
 * state and window listeners and one platform switch repainted them all. The
 * captures are checked in (`public/blocks/<slug>.webp`, written by
 * `scripts/block-thumbnails.ts`); a block added without one fails here.
 */

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
      ...markup.matchAll(/<a href="\/docs\/blocks\/([a-z0-9-]+)"/g),
    ].map((match) => match[1]);

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

    const unmatched = blockList
      .map((block) => {
        const file = readFileSync(
          new URL(`../../../public/blocks/${block.slug}.webp`, import.meta.url),
        );
        // A capture, not a placeholder: a WebP frame of a few kilobytes.
        const header =
          file.subarray(0, 4).toString("latin1") +
          file.subarray(8, 12).toString("latin1");
        return header === "RIFFWEBP" && file.byteLength > 4096
          ? []
          : [`${block.slug}.webp (${header}, ${file.byteLength} bytes)`];
      })
      .flat();
    expect(unmatched).toEqual([]);
  });
});
