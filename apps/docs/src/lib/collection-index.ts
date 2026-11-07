import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";

export interface CollectionIndexPage {
  readonly title: string;
  readonly description: string;
  readonly url: string;
}

export interface CollectionIndexView {
  readonly url: string;
  readonly title: string;
  readonly description: string;

  readonly packageName: string;
  readonly pages: ReadonlyArray<CollectionIndexPage>;
}

export interface IndexedPage {
  readonly title: string;
  readonly description?: string;
  readonly url: string;
}

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

export const indexedCollections: ReadonlyArray<PackageCollection> =
  packageCollections.filter((collection) => collection.index !== undefined);

export const collectionIndexUrls = (): ReadonlyArray<string> =>
  indexedCollections.map((collection) => collection.route);

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
