import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { absoluteUrl } from "@/lib/site";
import { source } from "@/lib/source";
import { renderRobots, renderSitemap, sitemapEntries } from "./sitemap";

/**
 * Guards the generated sitemap and robots file (plan 418). The failures it
 * catches are a page missing from the sitemap (a search engine never sees it), a
 * duplicate entry, a relative `<loc>`, and a robots file that does not point at
 * the sitemap.
 */
const pages = source.getPages();
const entries = sitemapEntries(pages);
const xml = renderSitemap(pages);

describe("sitemap", () => {
  it("lists the landing page, the docs root and every content page once", () => {
    expect(Arr.take(entries, 2)).toEqual(["/", "/docs"]);
    Arr.forEach(pages, (page) => {
      expect(Arr.filter(entries, (path) => path === page.url)).toHaveLength(1);
    });
    expect(Arr.dedupe(entries)).toHaveLength(entries.length);
  });

  it("emits one absolute <loc> per entry", () => {
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    expect(locations).toEqual(Arr.map(entries, absoluteUrl));
    Arr.forEach(locations, (location) => {
      expect(location).toMatch(/^https:\/\//);
    });
  });

  it("is a well-formed sitemap document", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("points robots.txt at the sitemap", () => {
    expect(renderRobots()).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
    expect(renderRobots()).toContain("User-agent: *");
    expect(renderRobots()).toContain("Allow: /");
  });
});
