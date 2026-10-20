import { createFileRoute } from "@tanstack/react-router";
import { docsLlms } from "@/lib/llms";
import { decodeMarkdownUrl } from "@/lib/page-markdown";
import { source } from "@/lib/source";

/**
 * One page as Markdown, for a reader copying it or an agent fetching it: the
 * same `llms()` render `/llms-full.txt` uses, addressed per page (plan 596).
 * The page control in `src/routes/docs/$.tsx` links here.
 */
export const Route = createFileRoute("/docs/{$}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = decodeMarkdownUrl(params._splat?.split("/") ?? []);
        const page = source.getPage(slugs);
        if (!page) {
          return new Response("Not found\n", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        return new Response(await docsLlms.page(page), {
          headers: { "content-type": "text/markdown; charset=utf-8" },
        });
      },
    },
  },
});
