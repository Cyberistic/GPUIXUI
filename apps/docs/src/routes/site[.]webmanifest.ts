import { createFileRoute } from "@tanstack/react-router";
import { renderManifest } from "@/lib/site-manifest";

export const Route = createFileRoute("/site.webmanifest")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderManifest(), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
          },
        }),
    },
  },
});
