import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The architecture page is the map of the workspace, so it has to name every
 * package. A package added without a row is a map that sends a reader to a
 * place that does not exist — and nothing else in the build would notice, since
 * the page is prose.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A manifest's `name`, or `undefined` when the JSON has none. */
const manifestName = (json: string): string | undefined => {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null || !("name" in value)) {
    return undefined;
  }
  return typeof value.name === "string" ? value.name : undefined;
};

/** The `pages` array of a Fumadocs `meta.json`, or an empty list. */
const metaPages = (json: string): ReadonlyArray<string> => {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null || !("pages" in value)) {
    return [];
  }
  const { pages } = value;
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === "string")
    : [];
};

const packages = readdirSync(new URL("packages/", root), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const name = manifestName(read(`packages/${entry.name}/package.json`));
    return name === undefined ? [] : [name];
  });

const page = read("apps/docs/content/docs/architecture.mdx");

describe("the architecture page", () => {
  it("names every workspace package, so the map cannot fall behind", () => {
    expect(packages.length).toBeGreaterThanOrEqual(10);

    expect(packages.filter((name) => !page.includes(name))).toEqual([]);
  });

  it("sits in the sidebar after Installation", () => {
    const pages = metaPages(read("apps/docs/content/docs/meta.json"));

    expect(pages).toContain("architecture");
    expect(pages.indexOf("architecture")).toBeGreaterThan(
      pages.indexOf("installation"),
    );
  });
});
