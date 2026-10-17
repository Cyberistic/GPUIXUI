import { createFileRoute } from "@tanstack/react-router";
import { source } from "@/lib/source";
import { renderSitemap } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderSitemap(source.getPages()), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        }),
    },
  },
});
