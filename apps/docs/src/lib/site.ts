/**
 * Where the site is deployed.
 *
 * A canonical URL, an Open Graph tag and a sitemap entry must all name the same
 * host, and a relative URL is invalid in all three. The origin lives here once;
 * `site.test.ts` holds it to the deploy stack, which is the only other place the
 * domain is written.
 */
export const siteOrigin = "https://gpuixui.sudokw.com";

/** The absolute URL a reader, a crawler or a share card should use. */
export const absoluteUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path : `/${path}`, siteOrigin).href;
