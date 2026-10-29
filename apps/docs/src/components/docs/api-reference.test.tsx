import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componentIndex } from "../../lib/component-index-data";
import { publicApi } from "../../lib/public-api-data";
import { publicSymbolIndex } from "../../lib/public-symbols-data";
import { filterSymbols } from "../../lib/public-symbols";
import { ApiReferenceView } from "./api-reference";

/**
 * The reference page's symbol links and its filter.
 *
 * The page lists every name the packages publish, and the name alone does not
 * say where to read it: a reader who found `IconButton` had to guess that the
 * page sits at `/primitives/icon-button`. Every link here is resolved
 * against the mounted pages, so a row can neither point at a page the site does
 * not serve nor lose the link when a page is renamed.
 *
 * Bug guarded by the filter cases: the symbol filter was React state alone, so a
 * reader who narrowed three thousand rows to one name could not link that view —
 * a reload or a shared URL painted the whole table again, while the component
 * index and the icon gallery already carried `?q=`.
 */

const noop = (): void => undefined;

const markup = renderToStaticMarkup(
  <ApiReferenceView onQueryChange={noop} query="" />,
);
const mounted = new Set(componentIndex.map((page) => page.url));
const linked = [...markup.matchAll(/href="(\/[^"]+)"/g)].map(
  (match) => match[1],
);

describe("the API reference's symbol links", () => {
  it("links a symbol to the page named after the file that declares it", () => {
    expect(markup).toContain('href="/primitives/button"');
    // The row is the symbol's, not the entry point table's: the name, its
    // module and the page are one row.
    const start = markup.indexOf('href="/primitives/button"');
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
    // `@gpuixui/tokens` ships no `/*` pages, so a link would be invented;
    // the module path beside the name is the honest provenance.
    const tokens = publicSymbolIndex.packages.find(
      (pkg) => pkg.name === "@gpuixui/tokens",
    );
    expect(tokens?.symbols.length).toBeGreaterThan(20);
    const start = markup.indexOf(">@gpuixui/tokens<");
    const section = markup.slice(start, markup.indexOf("</section>", start));
    expect(section).not.toContain('href="/');
  });
});

describe("the API reference's filter", () => {
  const entryCount = publicApi.reduce(
    (total, pkg) => total + pkg.entries.length,
    0,
  );
  const count = (html: string, needle: string): number =>
    html.split(needle).length - 1;
  /** Body rows of both tables: every `<tr>` that is not a table's header. */
  const rows = (html: string): number =>
    count(html, "<tr") - count(html, "<thead");
  const symbolRows = (query: string): number =>
    filterSymbols(publicSymbolIndex.packages, query).reduce(
      (total, pkg) => total + pkg.symbols.length,
      0,
    );

  it("prints every symbol and the count before a query narrows it", () => {
    expect(markup).toContain(`${publicSymbolIndex.count} symbols · every name`);
    expect(rows(markup)).toBe(entryCount + publicSymbolIndex.count);
  });

  it("paints exactly the rows a linked filter keeps", () => {
    // The expected rows are the pure filter's own answer, and the row count
    // covers both tables, so a view that renders one extra name fails even when
    // the count line agrees with the query.
    const query = "createTheme";
    const kept = symbolRows(query);
    const filtered = renderToStaticMarkup(
      <ApiReferenceView onQueryChange={noop} query={query} />,
    );

    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(publicSymbolIndex.count);
    expect(filtered).toContain(
      `${kept} of ${publicSymbolIndex.count} symbols match “${query}”`,
    );
    expect(rows(filtered)).toBe(entryCount + kept);
  });

  it("says so when no symbol matches, instead of painting an empty table", () => {
    const empty = renderToStaticMarkup(
      <ApiReferenceView onQueryChange={noop} query="zzzzNoSuchSymbol" />,
    );

    expect(symbolRows("zzzzNoSuchSymbol")).toBe(0);
    expect(empty).toContain("No symbol matches “zzzzNoSuchSymbol”");
    expect(empty).toContain(`${publicSymbolIndex.count} symbols`);
  });

  it("reads the filter off the page URL instead of state a link cannot carry", () => {
    // The mount is what the MDX page renders; the view is the markup. A filter
    // that never touches `location.search` is the defect these cases hold shut.
    const mount = readFileSync(
      new URL("./api-reference.tsx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const page = readFileSync(
      new URL("../../../content/docs/reference.mdx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(mount).toContain("useIndexQuery()");
    expect(mount).toContain("onQueryChange={chooseQuery}");
    expect(page).toContain("`?q=createTheme`");
    expect(page).toContain("<ApiReference />");
    expect(page).not.toContain("<ApiReferenceView");
  });
});
