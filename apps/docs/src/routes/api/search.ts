import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { packageSections } from "@/lib/collection-routes";
import { packageSources, sectionPages } from "@/lib/package-docs";
import { uniqueSearchPages } from "@/lib/search-index";
import { searchPageTree } from "@/lib/search-tree";
import { source } from "@/lib/source";

/**
 * One index over every collection, so search finds the pages the packages ship
 * as well as the pages this site writes.
 *
 * A curated site page wins its URL: indexing both would give the index two
 * documents with one id.
 */
/**
 * The sidebar's tree, completed and without its separators, so every result's
 * breadcrumb names the section the page lives in — including the package pages,
 * which the site's own tree does not carry.
 *
 * Built once: Fumadocs caches a tree's breadcrumbs by identity, and a fresh tree
 * per call would rebuild the whole walk for every page it indexes.
 */
const searchTree = searchPageTree(
  source.getPageTree(),
  packageSections.map((section) => ({
    name: section.name,
    pages: sectionPages(section.origins),
  })),
);

const searchable = {
  ...source,
  getPages: () =>
    uniqueSearchPages(
      source.getPages(),
      packageSources.map((packageSource) => packageSource.getPages()),
    ),
  getPageTree: () => searchTree,
};

const server = createFromSource(searchable, { language: "english" });

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
});
