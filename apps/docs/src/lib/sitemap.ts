import { absoluteUrl } from "./site";

/**
 * `sitemap.xml`, built from the collections that serve the pages.
 *
 * The site had no sitemap, so a crawler had to find seventy pages by following
 * the sidebar. The list is derived, never written: a page added to any mounted
 * collection appears without a docs change, which is the same rule the search
 * index and the sidebar follow.
 */

/** One `<loc>` may not carry raw markup; a URL's `&` and quotes must be escaped. */
const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** The content type a sitemap must be served with. */
export const sitemapContentType = "application/xml; charset=utf-8";

/**
 * The union of the site's own pages and the package pages, as paths.
 *
 * A curated page shadows the package page that shares its URL, so the result is
 * a set: a second `<loc>` for one page is a duplicate the protocol forbids. The
 * landing page is added here because it is a route, not a collection document.
 */
export const sitemapPaths = (
  site: ReadonlyArray<string>,
  packaged: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  [...new Set(["/", ...site, ...packaged])].toSorted();

/** The sitemap document for these paths, with absolute URLs. */
export const sitemapXml = (
  paths: ReadonlyArray<string>,
  origin?: string,
): string => {
  const urls = sitemapPaths([], paths).flatMap((path) => {
    const href =
      origin === undefined ? absoluteUrl(path) : new URL(path, origin).href;
    return [`  <url><loc>${escapeXml(href)}</loc></url>`];
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};
