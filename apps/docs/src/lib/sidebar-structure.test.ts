import { readFileSync, readdirSync } from "node:fs";
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

/** Whether a folder's `meta.json` asks Fumadocs to open it on arrival. */
const opensByDefault = (file: URL): boolean => {
  const value: unknown = JSON.parse(readFileSync(file, "utf8"));
  return (
    typeof value === "object" &&
    value !== null &&
    "defaultOpen" in value &&
    value.defaultOpen === true
  );
};

describe("the Components group", () => {
  const dir = new URL("components/", content);
  const root = new URL("../..", content);

  it("opens by default, so the lane is visible on arrival", () => {
    expect(opensByDefault(new URL("meta.json", dir))).toBe(true);
  });

  it("is one flat lane instead of the old Actions/Surfaces groups", () => {
    // The curated meta used to carry `---Actions---`, `---Surfaces---` and
    // their siblings; the runtime sorts the folder, but a separator left here
    // would still paint a second group.
    const listed = metaPages(new URL("meta.json", dir));

    expect(listed).toEqual(pages(dir));
    expect(listed.some((page) => page.startsWith("---"))).toBe(false);
    expect(listed).toEqual(
      [...listed].sort((left, right) => left.localeCompare(right)),
    );
  });

  it("sits after the one horizontal separator that ends the guides", () => {
    // Kumo's shape: the guide pages first, a rule, then the component lane.
    const order = sidebarPages(root);
    const separators = order.filter((page) => page.startsWith("---"));

    expect(separators).toEqual(["---"]);
    expect(order.indexOf("components")).toBeGreaterThan(order.indexOf("---"));
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
