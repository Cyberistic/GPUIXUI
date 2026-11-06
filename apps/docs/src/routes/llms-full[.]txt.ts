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

interface ListedPage {
  readonly url: string;
  readonly path: string;
  readonly data: {
    readonly title: string;
    readonly description?: string | undefined;
  };
}

type Origin = "site" | PackageOrigin;

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

const sitePages = (): Promise<ReadonlyArray<LlmsFullPage>> =>
  Promise.all(source.getPages().map((page) => toPage("site", page)));

const packagedPages = (): Promise<ReadonlyArray<LlmsFullPage>> =>
  Promise.all(
    packageCollections.flatMap((collection, index) =>
      (packageSources[index]?.getPages() ?? []).map((page) =>
        toPage(collection.origin, page),
      ),
    ),
  );

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
