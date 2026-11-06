import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { curatedPrimitiveTwins, servedUrls } from "./curated-twins";
import { sitePageUrls } from "./prerender-pages";
import { absoluteUrl, siteOrigin } from "./site";
import {
  siteRoutes,
  sitemapContentType,
  sitemapPaths,
  sitemapXml,
} from "./sitemap";

const root = new URL("../../../../", import.meta.url);

const packagedPages = (): string[] =>
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).map(
      (name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`,
    ),
  );

describe("the sitemap", () => {
  it("lists one absolute URL per page, sorted", () => {
    const xml = sitemapXml(["/getting-started", "/", "/"]);
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

    expect(locations).toEqual([
      `${siteOrigin}/`,
      `${siteOrigin}/getting-started`,
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(sitemapContentType).toContain("xml");
  });

  it("keeps the landing page and drops a shadowed package page", () => {
    const paths = sitemapPaths(
      ["/", "/components/dialog"],
      ["/components/dialog", "/components/accordion"],
    );

    expect(paths).toEqual([
      "/",
      "/components/accordion",
      "/components/dialog",
      "/live",
    ]);
    expect(paths.filter((path) => path === "/components/dialog")).toEqual([
      "/components/dialog",
    ]);
  });

  it("lists both of the site's routes, which no collection carries", () => {
    const paths = sitemapPaths(["/"], []);

    expect([...siteRoutes]).toEqual(["/", "/live"]);
    expect(paths).toEqual(["/", "/live"]);

    const xml = sitemapXml(["/getting-started", "/", "/"]);
    expect(
      [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
    ).toEqual([`${siteOrigin}/`, `${siteOrigin}/getting-started`]);
  });

  it("escapes a URL a parser would otherwise reject", () => {
    expect(sitemapXml(["/a&b"])).toContain("<loc>");
    expect(sitemapXml(["/a&b"])).not.toContain("a&b");
    expect(sitemapXml(["/a&b"])).toContain("a&amp;b");
  });

  it("lists every page the site serves, and no page a curated page replaces", () => {
    const site = sitePageUrls(root);
    const packaged = packagedPages();
    const served = servedUrls(packaged);
    const paths = sitemapPaths(site, packaged);

    expect(site.length).toBeGreaterThan(0);
    expect(packaged.length).toBeGreaterThan(0);
    expect(served.length).toBe(packaged.length - curatedPrimitiveTwins.length);
    expect(paths).toEqual(expect.arrayContaining([...site]));
    expect(paths).toEqual(expect.arrayContaining(served));
    expect(
      curatedPrimitiveTwins.filter((twin) => paths.includes(twin.retired)),
    ).toEqual([]);
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      paths.filter(
        (path) =>
          !sitemapXml([path]).includes(`<loc>${absoluteUrl(path)}</loc>`),
      ),
    ).toEqual([]);
  });

  it("reads every collection, and robots.txt points at the route", () => {
    const route = readFileSync(
      new URL("apps/docs/src/routes/sitemap[.]xml.ts", root),
      "utf8",
    );
    const robots = readFileSync(
      new URL("apps/docs/public/robots.txt", root),
      "utf8",
    );

    expect(route).toContain("source.getPages()");
    expect(route).toContain("packageSources");
    expect(existsSync(new URL("apps/docs/public/robots.txt", root))).toBe(true);
    expect(robots).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });
});
