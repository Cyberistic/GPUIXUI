import { createFileRoute } from "@tanstack/react-router";
import { collectionIndexUrls } from "@/lib/collection-index";
import { packageSources } from "@/lib/package-docs";
import { sitemapContentType, sitemapPaths, sitemapXml } from "@/lib/sitemap";
import { source } from "@/lib/source";

const sitemap = (): string =>
  sitemapXml(
    sitemapPaths(
      [...source.getPages().map((page) => page.url), ...collectionIndexUrls()],
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
