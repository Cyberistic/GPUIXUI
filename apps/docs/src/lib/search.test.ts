import { describe, expect, it } from "vitest";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

/**
 * Guards the search backend (plan 410 §10): a real query must return the real
 * page, and a query no page matches must return nothing. The failures it
 * catches are an index built over the wrong content and an adapter that
 * returns every page regardless of the query.
 */
const search = createFromSource(source);

describe("search", () => {
  it("returns the matching page for a title query", async () => {
    const results = await search.search("Installation", { limit: 5 });
    expect(results.map((result) => result.url)).toContain("/docs/installation");
  });

  it("returns nothing for a query no page matches", async () => {
    const results = await search.search("zzzznosuchtermzzzz");
    expect(results).toEqual([]);
  });
});
