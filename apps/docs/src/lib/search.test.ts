import { describe, expect, it } from "vitest";
import type { SortedResult } from "fumadocs-core/search";
import {
  componentSearchUrl,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  mergeResults,
  parseSearchLimit,
  search,
} from "./search";

/**
 * Guards plans 419 and 431: the component registry is searchable from any page,
 * and a component's exact name reaches its own page.
 *
 * Bugs being guarded: (1) the Fumadocs index is built from MDX, so component
 * records — rendered React, not prose — were invisible to ⌘K; (2) the registry
 * was appended after a full page-result list, so `button` could return ten
 * prose hits and never `/docs/components/button`; (3) an empty query returned
 * arbitrary prose instead of `[]`; (4) a delivered component was listed twice,
 * once from its page and once from its registry record. These tests fail if the
 * registry index is dropped, if a title match is not promoted, if the empty
 * guard is removed, if page results are not deduplicated, or if the response
 * becomes unbounded.
 */
const contentOf = (result: SortedResult): string =>
  "content" in result ? result.content : "";

describe("search", () => {
  it("returns the matching page for a title query", async () => {
    const results = await search("Installation", 5);
    expect(results.map((result) => result.url)).toContain("/docs/installation");
  });

  it("finds a component with no page from any page's search", async () => {
    const results = await search("drawer");
    const drawer = results.find((result) =>
      contentOf(result).startsWith("Drawer"),
    );
    expect(drawer?.url).toBe("/docs/components?q=Drawer");
  });

  it("ranks real pages ahead of the registry appendix", async () => {
    const results = await search("installation", 5);
    expect(results[0]?.url).toBe("/docs/installation");
  });

  it("appends planned components after the pages, pointing at the filtered index", async () => {
    const results = await search("drawer", 20);
    const planned = results.find(
      (result) => contentOf(result) === "Drawer (planned)",
    );
    expect(planned?.url).toBe("/docs/components?q=Drawer");
    expect(results.at(-1)?.url).toContain("/docs/components?q=");
  });

  it("returns nothing for a query no page or component matches", async () => {
    expect(await search("zzzznosuchtermzzzz")).toEqual([]);
  });

  it("returns nothing for an empty or blank query", async () => {
    expect(await search("")).toEqual([]);
    expect(await search("   ")).toEqual([]);
  });

  it("puts a component's own page first for its exact name", async () => {
    const results = await search("button");
    expect(results[0]?.url).toBe("/docs/components/button");
  });

  it("caps the merged response at the limit", async () => {
    const results = await search("select", 3);
    expect(results).toHaveLength(3);
  });
});

const pageResult = (url: string): SortedResult => ({
  id: url,
  url,
  type: "page",
  content: url,
});

const textResult = (id: string, url: string): SortedResult => ({
  id,
  url,
  type: "text",
  content: `text at ${url}`,
});

describe("mergeResults", () => {
  it("moves a component title match ahead of prose", () => {
    const merged = mergeResults(
      [
        textResult("architecture-1", "/docs/architecture"),
        textResult("architecture-2", "/docs/architecture#scope"),
      ],
      [
        pageResult("/docs/components/button-group"),
        pageResult("/docs/components/button"),
      ],
      "button",
    );
    expect(merged[0]?.url).toBe("/docs/components/button");
  });

  it("matches a word in a component title, not only its prefix", () => {
    const merged = mergeResults(
      [pageResult("/docs/installation")],
      [pageResult("/docs/components/text-input")],
      "input",
    );
    expect(merged[0]?.url).toBe("/docs/components/text-input");
  });

  it("leaves prose first when no component title matches", () => {
    const merged = mergeResults(
      [pageResult("/docs/installation")],
      [pageResult("/docs/components/button")],
      "installation",
    );
    expect(merged[0]?.url).toBe("/docs/installation");
  });

  it("lists a page once, page hit or registry hit", () => {
    const merged = mergeResults(
      [pageResult("/docs/components/toast")],
      [pageResult("/docs/components/toast")],
      "toast",
    );
    expect(merged).toHaveLength(1);
  });
});

describe("componentSearchUrl", () => {
  it("sends a planned component to the filtered index", () => {
    expect(
      componentSearchUrl({
        slug: "dialog",
        status: "planned",
        title: "Dialogs",
      }),
    ).toBe("/docs/components?q=Dialogs");
  });

  it("sends a finished component to its own page", () => {
    expect(
      componentSearchUrl({ slug: "button", status: "done", title: "Buttons" }),
    ).toBe("/docs/components/button");
  });
});

describe("parseSearchLimit", () => {
  it("falls back to the default for a missing or unparseable value", () => {
    expect(parseSearchLimit(null)).toBe(DEFAULT_SEARCH_LIMIT);
    expect(parseSearchLimit("many")).toBe(DEFAULT_SEARCH_LIMIT);
  });

  it("clamps the value into the supported range", () => {
    expect(parseSearchLimit("0")).toBe(1);
    expect(parseSearchLimit(String(MAX_SEARCH_LIMIT + 10))).toBe(
      MAX_SEARCH_LIMIT,
    );
  });
});
