import { createFileRoute } from "@tanstack/react-router";
import { packageSources } from "@/lib/package-docs";
import { sitemapContentType, sitemapPaths, sitemapXml } from "@/lib/sitemap";
import { source } from "@/lib/source";

/**
 * `/sitemap.xml`, generated on request from the collections that serve the
 * pages. A curated page shadows the package page with the same URL, and
 * `sitemapPaths` keeps one entry per URL.
 */
const sitemap = (): string =>
  sitemapXml(
    sitemapPaths(
      source.getPages().map((page) => page.url),
      packageSources.flatMap((packaged) =>
        packaged.getPages().map((page) => page.url),
      ),
    ),
  );

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemap(), {
          headers: { "content-type": sitemapContentType },
        }),
    },
  },
});
