import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { componentSource } from "@/lib/component-docs";
import { source } from "@/lib/source";

/**
 * One index over both collections, so component search finds the pages the
 * package ships as well as the pages this site writes.
 *
 * A curated site page wins its URL: indexing both would give the index two
 * documents with one id.
 */
const searchable = {
  ...source,
  getPages: () => {
    const site = source.getPages();
    const taken = new Set(site.map((page) => page.url));
    return [
      ...site,
      ...componentSource.getPages().filter((page) => !taken.has(page.url)),
    ];
  },
};

const server = createFromSource(searchable, { language: "english" });

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
});
