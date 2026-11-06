import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import {
  collectionIndexOf,
  collectionIndexPages,
  collectionIndexUrls,
  indexedCollections,
} from "./collection-index";
import { collectionByOrigin, packageCollections } from "./collection-routes";

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("apps/docs/content/docs/", root);

const siteIndexes = (
  dir: URL,
  slugs: ReadonlyArray<string> = [],
): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return siteIndexes(new URL(`${entry.name}/`, dir), [
        ...slugs,
        entry.name,
      ]);
    }
    if (entry.name !== "index.mdx") return [];
    return [`/${slugs.join("/")}`];
  });

interface Frontmatter {
  readonly title: string;
  readonly description: string;
}

const frontmatterOf = (
  collection: (typeof packageCollections)[number],
  file: string,
): Frontmatter => {
  const fileUrl = new URL(`${collection.dir}/${file}`, root);
  const source = readFileSync(fileUrl, "utf8");
  const block = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? "";
  const field = (name: string): string | undefined => {
    const line = block
      .split("\n")
      .find((entry) => entry.startsWith(`${name}:`));
    return line
      ?.slice(name.length + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  };
  const title = field("title");
  const description = field("description");

  if (title === undefined) throw new Error(`${fileUrl.pathname}: no title`);
  if (description === undefined)
    throw new Error(`${fileUrl.pathname}: no description`);
  return { title, description };
};

const rowsOnDisk = (
  collection: (typeof packageCollections)[number],
): ReadonlyArray<Frontmatter & { readonly url: string }> =>
  collectionPages(root, collection)
    .toSorted()
    .map((file) => ({
      ...frontmatterOf(collection, file),
      url: `${collection.route}/${file.replace(/\.mdx$/, "")}`,
    }));

interface Coverage {
  readonly missing: ReadonlyArray<string>;
  readonly unserved: ReadonlyArray<string>;
  readonly mismatched: ReadonlyArray<{
    readonly route: string;
    readonly printed: ReadonlyArray<Frontmatter & { readonly url: string }>;
    readonly expected: ReadonlyArray<Frontmatter & { readonly url: string }>;
  }>;
}

const coverage = (): Coverage => {
  const site = new Set(siteIndexes(docsDir));

  return packageCollections.reduce<Coverage>(
    (state, collection) => {
      const files = collectionPages(root, collection);

      if (files.length === 0) return state;

      if (site.has(collection.route) || files.includes("index.mdx")) {
        return collection.index === undefined
          ? state
          : { ...state, unserved: [...state.unserved, collection.route] };
      }
      if (collection.index === undefined) {
        return { ...state, missing: [...state.missing, collection.route] };
      }

      const expected = rowsOnDisk(collection);
      const printed = collectionIndexOf(collection, expected)?.pages;
      if (printed === undefined) {
        return { ...state, missing: [...state.missing, collection.route] };
      }

      return printed.length === expected.length &&
        printed.every(
          (page, index) =>
            page.title === expected[index]?.title &&
            page.description === expected[index]?.description &&
            page.url === expected[index]?.url,
        )
        ? state
        : {
            ...state,
            mismatched: [
              ...state.mismatched,
              { route: collection.route, printed, expected },
            ],
          };
    },
    { missing: [], unserved: [], mismatched: [] },
  );
};

describe("the index a collection route serves", () => {
  it("covers every mounted collection, in both directions", () => {
    const result = coverage();

    expect(result.missing).toEqual([]);
    expect(result.unserved).toEqual([]);
    expect(result.mismatched).toEqual([]);
  });

  it("lists nothing for a route a site page or a package's own index owns", () => {
    const page = { title: "Probe", description: "A page.", url: "/x" };

    expect(collectionIndexOf(collectionByOrigin.components, [page])).toBe(
      undefined,
    );
    expect(collectionIndexOf(collectionByOrigin.data, [page])).toBe(undefined);

    expect(collectionIndexOf(collectionByOrigin.media, [])).toBe(undefined);
  });

  it("names each list once, as a title and one sentence", () => {
    const titles = indexedCollections.map(
      (collection) => collection.index?.title ?? "",
    );
    const descriptions = indexedCollections.map(
      (collection) => collection.index?.description ?? "",
    );

    expect(indexedCollections.length).toBeGreaterThan(0);
    expect(titles.filter((title) => title.trim() === "")).toEqual([]);
    expect(new Set(titles).size).toBe(titles.length);
    expect(
      descriptions.filter(
        (description) =>
          !description.endsWith(".") || description.split(/\s+/).length > 20,
      ),
    ).toEqual([]);
  });

  it("publishes the same rows to the routes that list pages", () => {
    expect(collectionIndexUrls()).toEqual(
      indexedCollections.map((collection) => collection.route),
    );
    expect(collectionIndexPages()).toEqual(
      indexedCollections.map((collection) => ({
        title: collection.index?.title,
        description: collection.index?.description,
        url: collection.route,
      })),
    );
  });

  it("is the page the docs route renders, and the sitemap and /llms.txt list", () => {
    const view = readFileSync(
      new URL("apps/docs/src/lib/docs-view.tsx", root),
      "utf8",
    );
    const frame = readFileSync(
      new URL("apps/docs/src/components/docs/collection-index.tsx", root),
      "utf8",
    );
    const sitemap = readFileSync(
      new URL("apps/docs/src/routes/sitemap[.]xml.ts", root),
      "utf8",
    );
    const llms = readFileSync(
      new URL("apps/docs/src/routes/llms[.]txt.ts", root),
      "utf8",
    );

    expect(view).toContain("collectionIndexOf(");
    expect(view).toContain('origin: "index"');
    expect(view).toContain("<CollectionIndexPage");
    expect(frame).toContain("<CollectionIndexBody index={index} />");
    expect(sitemap).toContain("collectionIndexUrls()");
    expect(llms).toContain("collectionIndexPages()");
  });
});
