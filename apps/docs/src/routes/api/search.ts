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
