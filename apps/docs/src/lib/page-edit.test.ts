import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import type { PageOrigin } from "./collection-routes";
import { pageEditUrl, pageMarkdownPath } from "./page-edit";
import { gitConfig } from "./shared";

const root = new URL("../../../../", import.meta.url);
const siteDir = "apps/docs/content/docs";

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

const siteUrl = (file: string): string => {
  const slug = file
    .replace(/\.mdx$/, "")
    .replace(/(^|\/)index$/, "")
    .replace(/\/$/, "");
  return slug === "" ? "/" : `/${slug}`;
};

interface Served {
  readonly origin: PageOrigin;

  readonly path: string;
}

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
    expect(pageEditUrl("site", "introduction.mdx")).toBe(
      `https://github.com/${gitConfig.user}/${gitConfig.repo}/edit/${gitConfig.branch}/apps/docs/content/docs/introduction.mdx`,
    );

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

    expect(collisions).toContain("/components/dialog");
    expect(collisions.length).toBeGreaterThanOrEqual(30);
    expect(pages.get("/components/dialog")).toEqual({
      origin: "site",
      path: "components/dialog.mdx",
    });
    expect(
      existsSync(new URL("packages/components/docs/dialog.mdx", root)),
    ).toBe(true);
  });
});
