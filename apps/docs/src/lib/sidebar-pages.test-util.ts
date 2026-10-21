import { readFileSync } from "node:fs";

/**
 * A Fumadocs `meta.json`, for the guard tests that check the information
 * architecture. Test-only: it reads a checked-in file, so it is not a runtime
 * module.
 */

/** The `pages` array of a `meta.json`, section separators included. */
export const metaPages = (file: URL): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (typeof value !== "object" || value === null || !("pages" in value)) {
    return [];
  }
  const { pages } = value;
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === "string")
    : [];
};

/** The root docs sidebar. */
export const sidebarPages = (root: URL): ReadonlyArray<string> =>
  metaPages(new URL("content/docs/meta.json", root));
