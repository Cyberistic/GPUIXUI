import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexedCollections } from "./collection-index";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { docsRoute } from "./shared";
import { sitemapPaths } from "./sitemap";

const dynamicPaths: ReadonlyArray<string> = ["/live"];

export const staticDocumentPaths: ReadonlyArray<string> = [
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
];

const rootPath = (root: string | URL): string =>
  typeof root === "string" ? root : fileURLToPath(root);

const walk = (
  dir: string,
  slugs: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return walk(join(dir, entry.name), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];

    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [`${docsRoute}${path.length === 0 ? "" : `/${path.join("/")}`}`];
  });

export const sitePageUrls = (root: string | URL): ReadonlyArray<string> => [
  ...walk(join(rootPath(root), "apps/docs/content/docs"), []),

  ...indexedCollections
    .filter((collection) => collectionPages(root, collection).length > 0)
    .map((collection) => collection.route),
];

export const packagePageUrls = (root: string | URL): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).map((name) => {
      const page = name.replace(/\.mdx$/, "");
      return page === "index"
        ? collection.route
        : `${collection.route}/${page}`;
    }),
  );

export const prerenderPaths = (root: string | URL): ReadonlyArray<string> =>
  [
    ...sitemapPaths(sitePageUrls(root), packagePageUrls(root)),
    ...staticDocumentPaths,
  ]
    .filter((path) => !dynamicPaths.includes(path))
    .toSorted();
