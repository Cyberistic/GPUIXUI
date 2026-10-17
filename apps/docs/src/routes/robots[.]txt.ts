import { createFileRoute } from "@tanstack/react-router";
import { renderRobots } from "@/lib/sitemap";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderRobots(), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
