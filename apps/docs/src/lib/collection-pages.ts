import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PackageCollection } from "./collection-routes";

/**
 * The pages a mounted collection serves.
 *
 * A collection is mounted **before** its package ships its pages: the package
 * owns the Markdown and the site owns the route, and the package cannot write
 * `packages/<name>/docs` until the site has somewhere to mount it. So a
 * directory that does not exist yet is not an error — the collection serves no
 * page until the package writes one — while a directory that exists and holds
 * no page is: the package shipped a folder with nothing in it.
 *
 * Node-only: this reads the workspace at build time, and the browser bundle
 * never sees it.
 */
export const collectionPages = (
  root: string | URL,
  collection: PackageCollection,
): ReadonlyArray<string> => {
  const dir = join(
    typeof root === "string" ? root : fileURLToPath(root),
    collection.dir,
  );
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".mdx"));
};

/**
 * True when the package has shipped a page for this collection.
 *
 * The site says so where a reader would look: a collection with no pages yet
 * is not a broken link, it is a package that has not written its documentation.
 */
export const collectionHasPages = (
  root: string | URL,
  collection: PackageCollection,
): boolean => collectionPages(root, collection).length > 0;
