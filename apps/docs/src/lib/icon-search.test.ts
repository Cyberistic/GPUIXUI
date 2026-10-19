import { describe, expect, it } from "vitest";
import { iconCatalogue } from "./icon-catalogue.generated";
import { iconSearchEntry, promotedIconNames } from "./icon-search";
import { search } from "./search";

/**
 * Guards plan 507's search half. The bug: the icon names are rendered React
 * from a generated catalogue, so the MDX page index never saw them —
 * `chevrons-up-down` and `star-filled` returned zero results, and
 * `external-link` reached only prose about links.
 *
 * The second rule is what keeps the first from breaking the site: a plain word
 * that happens to name an icon (`search`, `copy`, `filter`, `list`, `star`,
 * `user`, `x`) must not be promoted, or the page that owns the word loses the
 * top result. Only hyphenated names are distinctive enough to outrank prose.
 */

const names = iconCatalogue.map((icon) => icon.name);

// The first `search()` builds the Fumadocs index for every page; on a cold,
// loaded host that takes tens of seconds (plan 468), so the file gets a budget.
describe("icon search", { timeout: 120_000 }, () => {
  it("promotes exactly the hyphenated names", () => {
    expect(iconSearchEntry.names).toEqual(
      names.filter((name) => name.includes("-")),
    );
    expect(promotedIconNames).toEqual(iconSearchEntry.names);
    expect(promotedIconNames).toContain("chevrons-up-down");
    expect(promotedIconNames).not.toContain("search");
    expect(promotedIconNames).not.toContain("copy");
  });

  it("lists every icon name in the generated document", () => {
    const content = iconSearchEntry.index.content ?? "";
    expect(names.filter((name) => !content.includes(name))).toEqual([]);
  });

  it("takes a hyphenated icon name to the Icons page first", async () => {
    const queries = ["chevrons-up-down", "star-filled", "external-link"];
    const urls = await Promise.all(
      queries.map(async (query) => (await search(query))[0]?.url),
    );
    expect(urls).toEqual([
      "/docs/components/icon",
      "/docs/components/icon",
      "/docs/components/icon",
    ]);
  });

  it("takes a hyphens-as-spaces icon name to the Icons page first", async () => {
    const [chevrons, star] = await Promise.all([
      search("chevrons up down", 5),
      search("star filled", 5),
    ]);
    expect(chevrons[0]?.url).toBe("/docs/components/icon");
    expect(star[0]?.url).toBe("/docs/components/icon");
  });

  it("keeps the page that owns a plain word", async () => {
    expect((await search("input"))[0]?.url).toBe("/docs/components/text-input");
    expect((await search("label"))[0]?.url).toBe("/docs/components/label");
    expect((await search("icon"))[0]?.url).toBe("/docs/components/icon");
    expect((await search("search"))[0]?.url).toBe(
      "/docs/components/search-input",
    );
    const plainWordFirsts = await Promise.all(
      ["copy", "star", "list"].map(
        async (query) => (await search(query))[0]?.url,
      ),
    );
    expect(plainWordFirsts).not.toContain("/docs/components/icon");
  });

  it("does not invent an icon name", async () => {
    expect(await search("zzziconprobe")).toEqual([]);
  });
});
