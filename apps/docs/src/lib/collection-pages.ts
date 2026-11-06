import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PackageCollection } from "./collection-routes";

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

export const collectionHasPages = (
  root: string | URL,
  collection: PackageCollection,
): boolean => collectionPages(root, collection).length > 0;
