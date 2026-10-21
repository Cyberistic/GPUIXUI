import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { packageSources } from "@/lib/package-docs";
import { uniqueSearchPages } from "@/lib/search-index";
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
  getPages: () =>
    uniqueSearchPages(
      source.getPages(),
      packageSources.map((packageSource) => packageSource.getPages()),
    ),
};

const server = createFromSource(searchable, { language: "english" });

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
});
