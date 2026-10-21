import { readFileSync } from "node:fs";

/**
 * The root sidebar's `pages` array, for the guard tests that check where a page
 * sits. Test-only: it reads a checked-in file, so it is not a runtime module.
 */
export const sidebarPages = (root: URL): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(
    readFileSync(new URL("content/docs/meta.json", root), "utf8"),
  );
  if (typeof value !== "object" || value === null || !("pages" in value)) {
    return [];
  }
  const { pages } = value;
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === "string")
    : [];
};
