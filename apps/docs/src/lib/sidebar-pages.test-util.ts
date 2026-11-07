import { readFileSync } from "node:fs";

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

export const sidebarPages = (root: URL): ReadonlyArray<string> =>
  metaPages(new URL("content/docs/meta.json", root));
