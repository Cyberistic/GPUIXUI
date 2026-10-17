import { absoluteUrl } from "./site";

/** The minimal page shape the sitemap needs; Fumadocs pages satisfy it. */
export interface SitemapPage {
  readonly url: string;
}

/**
 * The site's canonical paths: the landing page, the docs root, then every
 * content page once. `filter`/`includes` are deliberate — this module is in the
 * browser bundle, so it must not import the Effect runtime.
 */
export const sitemapEntries = (
  pages: ReadonlyArray<SitemapPage>,
): ReadonlyArray<string> => {
  const entries: ReadonlyArray<string> = ["/", "/docs"];
  return pages.reduce<ReadonlyArray<string>>(
    (paths, page) => (paths.includes(page.url) ? paths : [...paths, page.url]),
    entries,
  );
};

/** A sitemap 0.9 document with absolute `<loc>` values. */
export const renderSitemap = (pages: ReadonlyArray<SitemapPage>): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries(pages).map(
      (path) => `  <url><loc>${absoluteUrl(path)}</loc></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");

/** `robots.txt`: a public docs site, pointing at the sitemap. */
export const renderRobots = (): string =>
  [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
