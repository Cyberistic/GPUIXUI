import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import type { PageOrigin } from "./collection-routes";
import { pageEditUrl, pageMarkdownPath } from "./page-edit";
import { gitConfig } from "./shared";

/**
 * The file a page's "Edit this page on GitHub" link opens.
 *
 * The link is derived from the collection a page came from, so a wrong prefix
 * does not look wrong on the page — it opens a 404 on GitHub. The guards below
 * hold the derivation to the tree the site actually serves: every page this
 * site and its mounted packages render must resolve to a Markdown file that
 * exists, and a curated page must resolve to the site's file rather than the
 * package page it shadows. The floors keep a walk that stopped matching from
 * passing on an empty set.
 */

const root = new URL("../../../../", import.meta.url);
const siteDir = "apps/docs/content/docs";

/** Every Markdown file under a directory, relative to it (`components/x.mdx`). */
const markdownFiles = (dir: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(join(fileURLToPath(root), dir), {
    withFileTypes: true,
  }).flatMap((entry) =>
    entry.isDirectory()
      ? markdownFiles(`${dir}/${entry.name}`, `${prefix}${entry.name}/`)
      : entry.name.endsWith(".mdx")
        ? [`${prefix}${entry.name}`]
        : [],
  );

/** The URL a site page renders at; `index.mdx` is its folder's page. */
const siteUrl = (file: string): string => {
  const slug = file
    .replace(/\.mdx$/, "")
    .replace(/(^|\/)index$/, "")
    .replace(/\/$/, "");
  return slug === "" ? "/docs" : `/docs/${slug}`;
};

interface Served {
  readonly origin: PageOrigin;
  /** The collection-relative Markdown path the loader hands the frame. */
  readonly path: string;
}

/**
 * Every page the site serves, keyed by URL.
 *
 * The site's own collection is walked first because it wins a URL it shares
 * with a package — the same rule the sidebar, the search index and the sitemap
 * follow.
 */
const served = (): ReadonlyMap<string, Served> => {
  const pages = new Map<string, Served>();

  for (const file of markdownFiles(siteDir)) {
    pages.set(siteUrl(file), { origin: "site", path: file });
  }

  for (const collection of packageCollections) {
    for (const file of collectionPages(root, collection)) {
      const url = `${collection.route}/${file.replace(/\.mdx$/, "")}`;
      if (!pages.has(url)) {
        pages.set(url, { origin: collection.origin, path: file });
      }
    }
  }

  return pages;
};

describe("the file behind a page", () => {
  it("puts a site page in content/docs and a package page in its own directory", () => {
    expect(pageMarkdownPath("site", "components/dialog.mdx")).toBe(
      "apps/docs/content/docs/components/dialog.mdx",
    );

    // Every mounted collection, not just the one that has pages today: a
    // swapped entry in the origin record would send a page to another package.
    for (const collection of packageCollections) {
      expect(pageMarkdownPath(collection.origin, "index.mdx")).toBe(
        `${collection.dir}/index.mdx`,
      );
      expect(collection.dir.startsWith("apps/docs/")).toBe(false);
    }
  });

  it("adds .mdx once, whatever shape the path arrives in", () => {
    const expected = "apps/docs/content/docs/components/dialog.mdx";

    for (const path of [
      "components/dialog",
      "/components/dialog",
      "components/dialog.mdx",
      "components/dialog.MDX",
    ]) {
      expect(pageMarkdownPath("site", path)).toBe(expected);
    }
  });

  it("names the branch and repository the site publishes from", () => {
    expect(pageEditUrl("site", "index.mdx")).toBe(
      `https://github.com/${gitConfig.user}/${gitConfig.repo}/edit/${gitConfig.branch}/apps/docs/content/docs/index.mdx`,
    );

    // The repository is an argument, not a literal beside the branch: a fork
    // that renders the site must edit its own files.
    expect(
      pageEditUrl("components", "button.mdx", {
        user: "acme",
        repo: "demo",
        branch: "trunk",
      }),
    ).toBe(
      "https://github.com/acme/demo/edit/trunk/packages/components/docs/button.mdx",
    );
  });
});

describe("every page the site serves", () => {
  const pages = served();

  it("is a set the walk can reach", () => {
    // Floors, so a scan that stopped matching cannot pass on an empty map, and
    // one URL per site file: an `index.mdx` that collided with its folder would
    // hide one of the two from the link's walk.
    const site = [...pages.values()].filter((page) => page.origin === "site");
    expect(site.length).toBe(markdownFiles(siteDir).length);
    expect(site.length).toBeGreaterThanOrEqual(60);
    expect(pages.size - site.length).toBeGreaterThanOrEqual(60);
  });

  it("resolves to a Markdown file that exists", () => {
    expect(
      [...pages.entries()]
        .filter(
          ([, page]) =>
            !existsSync(
              new URL(pageMarkdownPath(page.origin, page.path), root),
            ),
        )
        .map(([url]) => url),
    ).toEqual([]);
  });

  it("sends a curated page to the site's file, not the package page it shadows", () => {
    const curated = new Set(markdownFiles(siteDir).map(siteUrl));
    const collisions = packageCollections
      .flatMap((collection) =>
        collectionPages(root, collection).map(
          (file) => `${collection.route}/${file.replace(/\.mdx$/, "")}`,
        ),
      )
      .filter((url) => curated.has(url));

    // A curated page shares its URL with a package page only when both files
    // exist; the site wins, so the edit link must name the site's.
    expect(collisions).toContain("/docs/components/dialog");
    expect(collisions.length).toBeGreaterThanOrEqual(30);
    expect(pages.get("/docs/components/dialog")).toEqual({
      origin: "site",
      path: "components/dialog.mdx",
    });
    expect(
      existsSync(new URL("packages/components/docs/dialog.mdx", root)),
    ).toBe(true);
  });
});
