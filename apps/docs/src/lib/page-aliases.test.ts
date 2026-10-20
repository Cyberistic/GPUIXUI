import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { componentSymbols } from "@/component-meta/symbols";
import { aliasesFor } from "./component-aliases";
import { pageAliases, pageAliasRank } from "./page-aliases";
import { componentSearchUrl, search } from "./search";
import { source } from "./source";

/**
 * Guards the page-vocabulary table (plan 598). The bug being prevented is a
 * hand-authored page a reader names correctly but the site never ranks first:
 * `theme switch`, `system theme` and `color scheme` returned Switch, Toggle or
 * Color picker because a component title token and a live-scene instruction are
 * scored above a page summary phrase, and `demo`, `sample`, `how to use`,
 * `import` and `version` returned prose, another page, or the page's own
 * heading.
 *
 * These tests fail when the table outlives a page, claims a component page, is
 * keyed without terms, stores a term the ranker cannot compare, shares a term
 * between pages, shadows a page or component name (the misroute class), matches
 * a prefix instead of the whole query, or loses its wiring in `search()`.
 */
const normalize = (value: string): string => value.trim().toLowerCase();

const pageUrls = new Set(source.getPages().map((page) => page.url));

const componentUrls = new Set(
  components.map((component) => componentSearchUrl(component)),
);

const componentNames = new Set(
  components
    .flatMap((component) => [
      component.title,
      component.slug,
      ...componentSymbols(component),
      ...component.parts.map((part) => part.name),
      ...component.api,
      ...aliasesFor(component.slug),
    ])
    .map(normalize),
);

const pageTitles = new Set(
  source.getPages().map((page) => normalize(page.data.title)),
);

const terms = [...pageAliases].flatMap(([url, aliases]) =>
  aliases.map((term) => ({ url, term })),
);

describe("page aliases", () => {
  it("keys every alias to a page that exists", () => {
    const missing = [...pageAliases.keys()].filter((url) => !pageUrls.has(url));
    expect(missing).toEqual([]);
  });

  it("keys no component page", () => {
    const componentPages = [...pageAliases.keys()].filter((url) =>
      componentUrls.has(url),
    );
    expect(componentPages).toEqual([]);
  });

  it("gives every keyed page at least one term", () => {
    const empty = [...pageAliases]
      .filter(([, aliases]) => aliases.length === 0)
      .map(([url]) => url);
    expect(empty).toEqual([]);
  });

  it("stores every term lower-case, trimmed and non-empty", () => {
    const malformed = terms
      .filter(({ term }) => term !== normalize(term) || term.length === 0)
      .map(({ term }) => term);
    expect(malformed).toEqual([]);
  });

  it("uses a term for one page only", () => {
    const counts = new Map<string, number>();
    terms.forEach(({ term }) => counts.set(term, (counts.get(term) ?? 0) + 1));
    const shared = [...counts]
      .filter(([, count]) => count > 1)
      .map(([term]) => term);
    expect(shared).toEqual([]);
  });

  it("does not shadow a page title", () => {
    const shadowing = terms
      .filter(({ term }) => pageTitles.has(term))
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });

  it("does not shadow a component title, name or alias", () => {
    const shadowing = terms
      .filter(({ term }) => componentNames.has(term))
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });

  it("matches an alias only as the whole query", () => {
    expect(pageAliasRank("/docs/dark-mode", "theme switch")).toBe(0);
    expect(pageAliasRank("/docs/dark-mode", "  THEME SWITCH ")).toBe(0);
    expect(pageAliasRank("/docs/dark-mode", "theme")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "switch")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "theme sw")).toBeUndefined();
    expect(pageAliasRank("/docs/not-aliased", "theme switch")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "   ")).toBeUndefined();
  });
});

const owned = [
  ["theme switch", "/docs/dark-mode"],
  ["switch theme", "/docs/dark-mode"],
  ["theme toggle", "/docs/dark-mode"],
  ["toggle theme", "/docs/dark-mode"],
  ["theme switcher", "/docs/dark-mode"],
  ["system theme", "/docs/dark-mode"],
  ["color scheme", "/docs/dark-mode"],
  ["colour scheme", "/docs/dark-mode"],
  ["demo", "/docs/examples"],
  ["sample", "/docs/examples"],
  ["how to use", "/docs/getting-started"],
  ["import", "/docs/getting-started"],
  ["version", "/docs/installation"],
  ["hint", "/docs/components/inline-validation"],
  ["supporting text", "/docs/components/inline-validation"],
  ["react", "/docs/getting-started"],
  ["react provider", "/docs/getting-started"],
  ["provider", "/docs/getting-started"],
  ["providers", "/docs/getting-started"],
  ["mono", "/docs/typography"],
  ["mono font", "/docs/typography"],
  ["monospace", "/docs/typography"],
  ["select row", "/docs/data-display"],
  ["selectable rows", "/docs/data-display"],
  ["escape", "/docs/component-api"],
  ["escape key", "/docs/component-api"],
  ["disabled", "/docs/component-api"],
  ["disabled state", "/docs/component-api"],
  ["how to install", "/docs/installation"],
  ["motion", "/docs/theming"],
  ["animation", "/docs/theming"],
  ["easing", "/docs/theming"],
] as const;

const regressions = [
  ["theme", "/docs/theming"],
  ["switch", "/docs/components/switch"],
  ["toggle", "/docs/components/toggle"],
  ["color picker", "/docs/components/color-picker"],
  ["text", "/docs/components/text"],
  ["examples", "/docs/examples"],
  ["dark mode", "/docs/dark-mode"],
  ["installation", "/docs/installation"],
  ["select", "/docs/components/select"],
  ["keycap", "/docs/components/keycap"],
  ["empty state", "/docs/components/empty-state"],
  ["command menu", "/docs/components/command-menu"],
  ["typography", "/docs/typography"],
  ["disabled button", "/docs/components/button"],
  ["row selection", "/docs/roadmap"],
  ["card", "/docs/components/card"],
  ["accordion", "/docs/components/accordion"],
  ["theming", "/docs/theming"],
  ["duration", "/docs/components/countdown#composition"],
  ["transition", "/docs/theming#motion"],
] as const;

describe(
  "a measured reader phrase reaches its page",
  { timeout: 120_000 },
  () => {
    it.each(owned)("%s → %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });

    it.each(regressions)("%s keeps %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });
  },
);
