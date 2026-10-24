import { createFileRoute } from "@tanstack/react-router";
import { collectionIndexOf } from "@/lib/collection-index";
import {
  packageCollections,
  type PackageOrigin,
} from "@/lib/collection-routes";
import { llmsContentType } from "@/lib/llms";
import { llmsFullTxt, type LlmsFullPage } from "@/lib/llms-full";
import { docsByOrigin, packageSources } from "@/lib/package-docs";
import { absoluteUrl } from "@/lib/site";
import { docs, source } from "@/lib/source";

/**
 * `/llms-full.txt`, every page as Markdown in one response.
 *
 * The route is thin on purpose, like `/llms.txt`: the document's shape lives in
 * `src/lib/llms-full.ts`, where it is tested without the MDX build, and this
 * file only hands it the pages. The site's collection comes first, so a curated
 * page wins the URL it shares with a package page; then every mounted package
 * collection; then the section indexes a route generates for a package that
 * writes no landing page, so the document serves the addresses `/llms.txt`
 * lists.
 *
 * Each page's text is the collection's own processed Markdown, read from the
 * entry the collection keeps for the page's path — the same string the "Copy
 * page" action hands a reader (`page-markdown.ts`), so the full document cannot
 * describe a version of a page the site does not serve. The sidebar loaders
 * hand over a page's frontmatter, not the entry that owns its text, so the body
 * is read from the collection rather than from the listed page.
 */

interface ListedPage {
  readonly url: string;
  readonly path: string;
  readonly data: {
    readonly title: string;
    readonly description?: string | undefined;
  };
}

type Origin = "site" | PackageOrigin;

/** The page's own Markdown, or nothing when the collection does not hold it. */
const markupOf = async (origin: Origin, path: string): Promise<string> => {
  const entry =
    origin === "site" ? docs.getPage(path) : docsByOrigin[origin].getPage(path);
  return entry === undefined ? "" : entry.getText("processed");
};

const toPage = async (
  origin: Origin,
  page: ListedPage,
): Promise<LlmsFullPage> => ({
  url: page.url,
  title: page.data.title,
  description: page.data.description,
  markdown: await markupOf(origin, page.path),
});

/** The site's own pages: a curated page is served at the URL it claims. */
const sitePages = (): Promise<ReadonlyArray<LlmsFullPage>> =>
  Promise.all(source.getPages().map((page) => toPage("site", page)));

/** Every mounted package collection's pages, in the sidebar's order. */
const packagedPages = (): Promise<ReadonlyArray<LlmsFullPage>> =>
  Promise.all(
    packageCollections.flatMap((collection, index) =>
      (packageSources[index]?.getPages() ?? []).map((page) =>
        toPage(collection.origin, page),
      ),
    ),
  );

/**
 * The indexes a collection route generates, as a page of links.
 *
 * The packages without a landing page have no Markdown of their own, so the
 * document writes the one thing the route serves: the rows it lists.
 */
const generatedIndexes = (): ReadonlyArray<LlmsFullPage> =>
  packageCollections.flatMap((collection, index) => {
    if (collection.index === undefined) return [];

    const view = collectionIndexOf(
      collection,
      (packageSources[index]?.getPages() ?? []).map((page) => ({
        title: page.data.title,
        description: page.data.description,
        url: page.url,
      })),
    );
    if (view === undefined) return [];

    return [
      {
        url: view.url,
        title: view.title,
        description: view.description,
        markdown: view.pages
          .map(
            (entry) =>
              `- [${entry.title}](${absoluteUrl(entry.url)})${
                entry.description === "" ? "" : `: ${entry.description}`
              }`,
          )
          .join("\n"),
      },
    ];
  });

const document = async (): Promise<string> =>
  llmsFullTxt(await sitePages(), [
    ...(await packagedPages()),
    ...generatedIndexes(),
  ]);

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await document(), {
          headers: { "content-type": llmsContentType },
        }),
    },
  },
});
