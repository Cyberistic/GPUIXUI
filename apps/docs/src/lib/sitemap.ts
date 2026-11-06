import { servedUrls } from "./curated-twins";
import { absoluteUrl } from "./site";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const sitemapContentType = "application/xml; charset=utf-8";

export const siteRoutes = ["/", "/live"] as const;

const onePerUrl = (paths: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(paths)].toSorted();

export const sitemapPaths = (
  site: ReadonlyArray<string>,
  packaged: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  onePerUrl([...siteRoutes, ...site, ...servedUrls(packaged)]);

export const sitemapXml = (
  paths: ReadonlyArray<string>,
  origin?: string,
): string => {
  const urls = onePerUrl(paths).flatMap((path) => {
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
