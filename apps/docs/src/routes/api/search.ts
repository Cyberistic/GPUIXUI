import { createFileRoute } from "@tanstack/react-router";
import { Option } from "effect";
import { createFromSource } from "fumadocs-core/search/server";
import { packageSections } from "@/lib/collection-routes";
import { packageSources, sectionPages } from "@/lib/package-docs";
import {
  decodeSearchResults,
  dedupeSearchResults,
  encodeSearchResults,
} from "@/lib/search-results";
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

/**
 * Answer with one row per address.
 *
 * A body this endpoint does not recognise is passed through whole: the dialog
 * can render a shape the site does not edit, and dropping every result because
 * a decoder refused one field would hide the index instead of deduplicating it.
 */
const withDedupedResults = async (response: Response): Promise<Response> => {
  const decoded = decodeSearchResults(await response.clone().text());
  const body = Option.flatMap(decoded, (rows) =>
    encodeSearchResults(dedupeSearchResults(rows)),
  );
  return Option.match(body, {
    onNone: () => response,
    onSome: (text) => {
      const headers = new Headers({ "content-type": "application/json" });
      const cache = response.headers.get("cache-control");
      if (cache !== null) headers.set("cache-control", cache);
      return new Response(text, { headers, status: response.status });
    },
  });
};

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => withDedupedResults(await server.GET(request)),
    },
  },
});
