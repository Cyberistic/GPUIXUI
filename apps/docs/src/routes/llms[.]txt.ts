import { createFileRoute } from "@tanstack/react-router";
import { renderLlmsIndex } from "@/lib/llms";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await renderLlmsIndex(), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
