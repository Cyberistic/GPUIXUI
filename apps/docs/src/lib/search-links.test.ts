import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchLinks } from "./search-links";

const app = new URL("../../", import.meta.url);

const serves = (href: string): boolean => {
  const slug = href.replace(/^\//, "").replace(/\/$/, "");
  return (
    existsSync(new URL(`content/docs/${slug}.mdx`, app)) ||
    existsSync(new URL(`content/docs/${slug || "."}/index.mdx`, app))
  );
};

describe("the search dialog's quick links", () => {
  it("offers the entry points a reader arrives for", () => {
    expect(searchLinks.length).toBeGreaterThanOrEqual(5);
    expect(
      searchLinks.every(
        ([name, href]) => name.trim().length > 0 && href.startsWith("/"),
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
