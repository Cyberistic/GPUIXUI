import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { packageSources } from "@/lib/package-docs";
import { source } from "@/lib/source";

/**
 * One index over every collection, so search finds the pages the packages ship
 * as well as the pages this site writes.
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
      ...packageSources.flatMap((packageSource) =>
        packageSource.getPages().filter((page) => !taken.has(page.url)),
      ),
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
