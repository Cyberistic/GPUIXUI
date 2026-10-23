import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";

/**
 * The index a mounted collection serves at its own route.
 *
 * A package writes the page for each component it ships, and the site mounts
 * the directory as-is. Three packages also write their section's landing page;
 * the other six do not, so `/docs/media` and its siblings answered **404**
 * while every page under them answered — a reader who trimmed the address, or
 * followed a breadcrumb, reached a dead end in a section the sidebar lists.
 * The page is generated from the collection the route already mounts, so a new
 * package page appears in it in the same commit and a package cannot ship a
 * page the index omits.
 */

/** One row of a generated index: a page the collection mounts. */
export interface CollectionIndexPage {
  readonly title: string;
  readonly description: string;
  readonly url: string;
}

/** The generated index of one collection. */
export interface CollectionIndexView {
  /** The collection's own route, e.g. `/docs/media`. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** The package the pages belong to, printed above the table. */
  readonly packageName: string;
  readonly pages: ReadonlyArray<CollectionIndexPage>;
}

/** One page as the mounted collection serves it. */
export interface IndexedPage {
  readonly title: string;
  readonly description?: string;
  readonly url: string;
}

/**
 * The index for a collection, or `undefined` when the route has no generated one.
 *
 * A collection whose package writes an `index.mdx` has a page at the route, so
 * the site serves that instead; a collection that mounts no page has nothing to
 * list. Both answer `undefined` rather than an empty page.
 */
export const collectionIndexOf = (
  collection: PackageCollection,
  pages: ReadonlyArray<IndexedPage>,
): CollectionIndexView | undefined => {
  const index = collection.index;
  if (index === undefined || pages.length === 0) return undefined;

  return {
    url: collection.route,
    title: index.title,
    description: index.description,
    packageName: collection.packageName,
    pages: pages.map((page) => ({
      title: page.title,
      description: page.description ?? "",
      url: page.url,
    })),
  };
};

/** The collections whose route answers with a generated index. */
export const indexedCollections: ReadonlyArray<PackageCollection> =
  packageCollections.filter((collection) => collection.index !== undefined);

/** The URLs a generated index answers, in the registry's order. */
export const collectionIndexUrls = (): ReadonlyArray<string> =>
  indexedCollections.map((collection) => collection.route);

/** The generated indexes as pages, for the sitemap and `/llms.txt`. */
export const collectionIndexPages = (): ReadonlyArray<IndexedPage> =>
  indexedCollections.flatMap((collection) =>
    collection.index === undefined
      ? []
      : [
          {
            title: collection.index.title,
            description: collection.index.description,
            url: collection.route,
          },
        ],
  );
