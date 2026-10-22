import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componentIndex } from "../../lib/component-index-data";
import { publicSymbolIndex } from "../../lib/public-symbols-data";
import { ApiReference } from "./api-reference";

/**
 * The reference page's symbol links.
 *
 * The page lists every name the packages publish, and the name alone does not
 * say where to read it: a reader who found `IconButton` had to guess that the
 * page sits at `/docs/primitives/icon-button`. Every link here is resolved
 * against the mounted pages, so a row can neither point at a page the site does
 * not serve nor lose the link when a page is renamed.
 */

const markup = renderToStaticMarkup(<ApiReference />);
const mounted = new Set(componentIndex.map((page) => page.url));
const linked = [...markup.matchAll(/href="(\/docs\/[^"]+)"/g)].map(
  (match) => match[1],
);

describe("the API reference's symbol links", () => {
  it("links a symbol to the page named after the file that declares it", () => {
    expect(markup).toContain('href="/docs/primitives/button"');
    // The row is the symbol's, not the entry point table's: the name, its
    // module and the page are one row.
    const start = markup.indexOf('href="/docs/primitives/button"');
    const row = markup.slice(start, markup.indexOf("</tr>", start));
    expect(row).toContain("Button");
    expect(row).toContain("packages/primitives/src/components/Button.tsx");
  });

  it("links only pages the site mounts, and a floor of them", () => {
    expect(linked.length).toBeGreaterThan(60);
    expect(
      linked.filter((url) => url === undefined || !mounted.has(url)),
    ).toEqual([]);
    expect(
      new Set(linked).size,
      "the links should reach many pages, not repeat one",
    ).toBeGreaterThan(40);
  });

  it("leaves a package with no docs collection unlinked", () => {
    // `@gpuixui/tokens` ships no `/docs/*` pages, so a link would be invented;
    // the module path beside the name is the honest provenance.
    const tokens = publicSymbolIndex.packages.find(
      (pkg) => pkg.name === "@gpuixui/tokens",
    );
    expect(tokens?.symbols.length).toBeGreaterThan(20);
    const start = markup.indexOf(">@gpuixui/tokens<");
    const section = markup.slice(start, markup.indexOf("</section>", start));
    expect(section).not.toContain('href="/docs/');
  });
});
