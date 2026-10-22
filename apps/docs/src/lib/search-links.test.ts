import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchLinks } from "./search-links";

/**
 * The search dialog's pre-query links are pages this site serves.
 *
 * Fumadocs validates nothing about a `links` entry, and it renders no list at
 * all until a query runs: a retired URL leaves the first panel of `⌘K` pointing
 * at a 404, and an unmounted list returns that panel to the blank box the links
 * exist to fill. Neither shows up in a build.
 */

const app = new URL("../../", import.meta.url);

/** The file that serves a docs URL: `/docs/x` → `x.mdx` or `x/index.mdx`. */
const serves = (href: string): boolean => {
  const slug = href.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  return (
    existsSync(new URL(`content/docs/${slug}.mdx`, app)) ||
    existsSync(new URL(`content/docs/${slug || "."}/index.mdx`, app))
  );
};

describe("the search dialog's quick links", () => {
  it("offers the entry points a reader arrives for", () => {
    // A floor, so a list that emptied out cannot pass.
    expect(searchLinks.length).toBeGreaterThanOrEqual(5);
    expect(
      searchLinks.every(
        ([name, href]) => name.trim().length > 0 && href.startsWith("/docs"),
      ),
    ).toBe(true);
  });

  it("resolves every link to the page that serves it", () => {
    const dead = searchLinks.filter(([, href]) => !serves(href));

    expect(dead.map(([, href]) => href)).toEqual([]);
  });

  it("names no destination twice", () => {
    const hrefs = searchLinks.map(([, href]) => href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("is mounted by the root provider, not a list nothing passes", () => {
    const root = readFileSync(new URL("src/routes/__root.tsx", app), "utf8");

    expect(root).toContain('from "@/lib/search-links"');
    expect(root).toContain("links: searchLinks");
  });
});
