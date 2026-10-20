import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { indexedSurfaces, searchLimits, searchRanks } from "@/lib/search-docs";
import { search } from "@/lib/search";
import { SearchReference } from "./search-reference";

/**
 * Guards plan 610's reader-facing half: the Site search page renders the rank
 * constants, the route limits and every generated document from
 * `search-docs.ts`, and the vocabulary that names the site feature reaches it
 * without stealing the Search input component's plain word. Measured before the
 * page: `cmd k` reached a gesture-vocabulary paragraph, `search index` reached
 * Search input, and `api/search` reached the component-pages guide.
 */

const page = readFileSync(
  new URL("../../content/docs/site-search.mdx", import.meta.url),
  "utf8",
);
const contentRoot = new URL("../../content/docs/", import.meta.url);

describe("SearchReference", () => {
  const markup = renderToStaticMarkup(<SearchReference />);

  it("renders every rank constant with its live value", () => {
    searchRanks.forEach((rank) => {
      expect(markup).toContain(rank.constant);
      expect(markup).toContain(rank.means);
    });
    expect(markup).toContain(String(searchLimits.default));
    expect(markup).toContain(String(searchLimits.max));
  });

  it("renders every generated document with its URL", () => {
    indexedSurfaces.forEach((surface) => {
      expect(markup).toContain(surface.title);
      expect(markup).toContain(surface.url);
    });
  });

  it("has no empty cell in the document table", () => {
    expect(markup).not.toContain("<td></td>");
    expect(markup).not.toContain('<th scope="row"></th>');
  });
});

describe("site-search.mdx", () => {
  it("renders the generated reference", () => {
    expect(page).toContain("<SearchReference />");
  });

  it("names both subjects its frontmatter has to own", () => {
    expect(page).toContain("title: Site search");
    expect(page).toContain("generated search index");
    expect(page).toContain("ranking");
  });

  it("includes the route and the entry contract it tells a reader to copy", () => {
    expect(page).toContain("src/routes/api/search.ts");
    expect(page).toContain("src/lib/generated-search.ts");
    expect(page).toContain("/api/search?query=button&limit=3");
  });

  it("is the only page that renders the reference", () => {
    const pages = readdirSync(contentRoot, { recursive: true })
      .map(String)
      .filter((name) => name.endsWith(".mdx"));
    const users = pages.filter((name) =>
      readFileSync(new URL(name, contentRoot), "utf8").includes(
        "<SearchReference />",
      ),
    );

    expect(users).toEqual(["site-search.mdx"]);
  });
});

describe("site search vocabulary", { timeout: 120_000 }, () => {
  const cases = [
    ["cmd k", "/docs/site-search"],
    ["cmd+k", "/docs/site-search"],
    ["search index", "/docs/site-search"],
    ["search ranking", "/docs/site-search"],
    ["api/search", "/docs/site-search"],
    ["site search", "/docs/site-search"],
  ] as const;

  const regressions = [
    ["search", "/docs/components/search-input"],
    ["search input", "/docs/components/search-input"],
    ["button", "/docs/components/button"],
    ["theming", "/docs/theming"],
    ["command palette", "/docs/patterns/command-palette"],
  ] as const;

  it("sends each site-search phrase to the page", async () => {
    const wrong = await Promise.all(
      cases.map(async ([query, url]) => {
        const results = await search(query, 3);
        return results[0]?.url === url
          ? []
          : [`${query} -> ${results[0]?.url}`];
      }),
    );

    expect(wrong.flat()).toEqual([]);
  });

  it("leaves the component and page owners untouched", async () => {
    const wrong = await Promise.all(
      regressions.map(async ([query, url]) => {
        const results = await search(query, 3);
        return results[0]?.url === url
          ? []
          : [`${query} -> ${results[0]?.url}`];
      }),
    );

    expect(wrong.flat()).toEqual([]);
  });
});
