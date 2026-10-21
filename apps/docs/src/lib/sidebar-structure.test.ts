import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metaPages, sidebarPages } from "./sidebar-pages.test-util";

/**
 * The sidebar is the site's information architecture, and `meta.json` is the
 * only thing that builds it. A page written but not listed renders at its URL
 * and is unreachable from the navigation — nothing else in the build notices —
 * and a listed page with no file is a dead link. Both directions are checked
 * here, for the root and for every section folder.
 */

const content = new URL("../../content/docs/", import.meta.url);

const mdxFiles = (dir: URL): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name.replace(/\.mdx$/, ""));

/** A sidebar's page slugs, without its `---Section---` separators. */
const pages = (dir: URL): ReadonlyArray<string> =>
  metaPages(new URL("meta.json", dir)).filter(
    (page) => !page.startsWith("---"),
  );

const folders = readdirSync(content, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("the root sidebar", () => {
  const root = new URL("../..", content);
  const listed = sidebarPages(root).filter((page) => !page.startsWith("---"));
  const files = mdxFiles(content);

  it("links every page file, so a new page cannot be invisible", () => {
    expect(files.filter((file) => !listed.includes(file))).toEqual([]);
  });

  it("only lists pages that exist, so the navigation has no dead link", () => {
    expect(
      listed.filter((page) => !files.includes(page) && !folders.includes(page)),
    ).toEqual([]);
  });

  it("reaches every section folder", () => {
    expect(folders.filter((folder) => !listed.includes(folder))).toEqual([]);
  });
});

describe("the section sidebars", () => {
  it.each(folders)("list exactly the pages %s has", (folder) => {
    const dir = new URL(`${folder}/`, content);
    const listed = pages(dir);
    // A folder's `index.mdx` is the folder's own page; Fumadocs may name it or
    // link the folder to it, so it is not held to the child rule.
    const files = mdxFiles(dir);

    expect(
      files.filter((file) => file !== "index" && !listed.includes(file)),
    ).toEqual([]);
    expect(listed.filter((page) => !files.includes(page))).toEqual([]);
  });
});
