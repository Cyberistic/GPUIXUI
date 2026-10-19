import { createFileRoute } from "@tanstack/react-router";
import { renderLlmsFull } from "@/lib/llms";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await renderLlmsFull(), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
