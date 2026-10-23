import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { absoluteUrl, siteOrigin } from "./site";
import {
  siteRoutes,
  sitemapContentType,
  sitemapPaths,
  sitemapXml,
} from "./sitemap";

/**
 * The sitemap and the file that points crawlers at it.
 *
 * The sitemap is generated from the collections at request time, so the unit
 * below fixes its shape and the guards close two silent failures: a duplicate
 * URL (a curated page and its shadowed package page both listed) and a
 * `robots.txt` naming a route that does not exist. The collections themselves
 * are held to disk by `package-docs.test.ts`, so the chain is
 * disk → collections → sitemap.
 */

const root = new URL("../../../../", import.meta.url);

/** Every `.mdx` under `content/docs`, as the URL the site serves. */
const sitePages = (dir: URL, slugs: ReadonlyArray<string> = []): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return sitePages(new URL(`${entry.name}/`, dir), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];
    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [`/docs${path.length === 0 ? "" : `/${path.join("/")}`}`];
  });

const packagedPages = (): string[] =>
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).map(
      (name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`,
    ),
  );

const docsDir = new URL("apps/docs/content/docs/", root);

describe("the sitemap", () => {
  it("lists one absolute URL per page, sorted", () => {
    const xml = sitemapXml(["/docs/installation", "/docs", "/"]);
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

    expect(locations).toEqual([
      `${siteOrigin}/`,
      `${siteOrigin}/docs`,
      `${siteOrigin}/docs/installation`,
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(sitemapContentType).toContain("xml");
  });

  it("keeps the landing page and drops a shadowed package page", () => {
    const paths = sitemapPaths(
      ["/docs", "/docs/components/dialog"],
      ["/docs/components/dialog", "/docs/components/accordion"],
    );

    expect(paths).toEqual([
      "/",
      "/docs",
      "/docs/components/accordion",
      "/docs/components/dialog",
      "/live",
    ]);
    expect(paths.filter((path) => path === "/docs/components/dialog")).toEqual([
      "/docs/components/dialog",
    ]);
  });

  it("lists both of the site's routes, which no collection carries", () => {
    // `/live` is the real GPUix surface and is linked from every component
    // page's preview note, but it is a route rather than a collection
    // document, so a sitemap derived from the collections alone omitted it and
    // a crawler had no path to the site's strongest preview.
    const paths = sitemapPaths(["/docs"], []);

    expect([...siteRoutes]).toEqual(["/", "/live"]);
    expect(paths).toEqual(["/", "/docs", "/live"]);

    // The document does not re-add the routes to a list it was handed: the
    // route composes `sitemapPaths`, and a second `<loc>` is a duplicate.
    const xml = sitemapXml(["/docs/installation", "/docs", "/"]);
    expect(
      [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
    ).toEqual([
      `${siteOrigin}/`,
      `${siteOrigin}/docs`,
      `${siteOrigin}/docs/installation`,
    ]);
  });

  it("escapes a URL a parser would otherwise reject", () => {
    expect(sitemapXml(["/docs/a&b"])).toContain("<loc>");
    expect(sitemapXml(["/docs/a&b"])).not.toContain("a&b");
    expect(sitemapXml(["/docs/a&b"])).toContain("a&amp;b");
  });

  it("could list every page the site and its packages ship", () => {
    const site = sitePages(docsDir);
    const packaged = packagedPages();
    const paths = sitemapPaths(site, packaged);

    expect(site.length).toBeGreaterThan(0);
    expect(packaged.length).toBeGreaterThan(0);
    expect(paths).toEqual(expect.arrayContaining(site));
    expect(paths).toEqual(expect.arrayContaining(packaged));
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
