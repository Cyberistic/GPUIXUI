import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metaPages, sidebarPages } from "./sidebar-pages.test-util";

const content = new URL("../../content/docs/", import.meta.url);

const mdxFiles = (dir: URL): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name.replace(/\.mdx$/, ""));

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
    const listed = metaPages(new URL("meta.json", dir));

    expect(listed).toEqual(pages(dir));
    expect(listed.some((page) => page.startsWith("---"))).toBe(false);
  });

  it("sits after the one horizontal separator that ends the guides", () => {
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

    const files = mdxFiles(dir);

    expect(
      files.filter((file) => file !== "index" && !listed.includes(file)),
    ).toEqual([]);
    expect(listed.filter((page) => !files.includes(page))).toEqual([]);
  });
});
