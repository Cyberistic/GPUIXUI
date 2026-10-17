import { describe, expect, it } from "vitest";
import type { SortedResult } from "fumadocs-core/search";
import {
  componentSearchUrl,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  parseSearchLimit,
  search,
} from "./search";

/**
 * Guards plan 419: the component registry is searchable from any page.
 *
 * The bug being guarded: the Fumadocs index is built from MDX, so component
 * records — rendered React, not prose — were invisible to ⌘K. Typing a
 * component name returned nothing. These tests fail if the registry index is
 * dropped from the merge, if a planned result links to a page that does not
 * exist, if registry hits outrank the docs, or if the response becomes
 * unbounded.
 */
const contentOf = (result: SortedResult): string =>
  "content" in result ? result.content : "";

describe("search", () => {
  it("returns the matching page for a title query", async () => {
    const results = await search("Installation", 5);
    expect(results.map((result) => result.url)).toContain("/docs/installation");
  });

  it("finds a component with no page from any page's search", async () => {
    const results = await search("dialog");
    const dialogs = results.find((result) =>
      contentOf(result).startsWith("Dialogs"),
    );
    expect(dialogs?.url).toBe("/docs/components?q=Dialogs");
  });

  it("ranks real pages ahead of the registry appendix", async () => {
    const results = await search("installation", 5);
    expect(results[0]?.url).toBe("/docs/installation");
  });

  it("appends planned components after the pages, pointing at the filtered index", async () => {
    const results = await search("dialog", 20);
    const planned = results.find(
      (result) => contentOf(result) === "Dialogs (planned)",
    );
    expect(planned?.url).toBe("/docs/components?q=Dialogs");
    expect(results.at(-1)?.url).toContain("/docs/components?q=");
  });

  it("returns nothing for a query no page or component matches", async () => {
    expect(await search("zzzznosuchtermzzzz")).toEqual([]);
  });

  it("caps the merged response at the limit", async () => {
    const results = await search("select", 3);
    expect(results).toHaveLength(3);
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
