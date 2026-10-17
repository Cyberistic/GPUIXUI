import { createFileRoute } from "@tanstack/react-router";
import { parseSearchLimit, search } from "@/lib/search";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return Response.json(
          await search(
            url.searchParams.get("query") ?? "",
            parseSearchLimit(url.searchParams.get("limit")),
          ),
        );
      },
    },
  },
});
