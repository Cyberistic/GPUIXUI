import { readFileSync } from "node:fs";
import type * as PageTree from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { searchPageTree, type SearchSection } from "./search-tree";

/**
 * The tree search reads walks behind every result's breadcrumb.
 *
 * Fumadocs turns a page tree into breadcrumbs and treats a **separator's name**
 * as one, so the sidebar's group headings leaked into the dialog: searching
 * "blocks" read `Docs › Blocks › Blocks` (the root group and the folder of the
 * same name), and a page the package ships had no breadcrumb at all because the
 * index only walked the site's own collection. The tree now completes the
 * package sections and blanks every separator name, so a result names the
 * section it lives in. This file holds both halves of that shape; the served
 * endpoint was read for the result itself.
 */

const page = (name: string, url: string): PageTree.Item => ({
  type: "page",
  name,
  url,
});

const folder = (
  name: string,
  children: ReadonlyArray<PageTree.Node>,
): PageTree.Folder => ({ type: "folder", name, children: [...children] });

const separator = (name: string): PageTree.Separator => ({
  type: "separator",
  name,
});

const tree: PageTree.Root = {
  name: "Docs",
  children: [
    separator("Getting Started"),
    page("Introduction", "/docs"),
    folder("Blocks", [
      page("Blocks", "/docs/blocks"),
      page("Login", "/docs/blocks/login"),
    ]),
    separator("Composition"),
    folder("Primitives", [page("Slider", "/docs/primitives/slider")]),
  ],
};

const section: SearchSection = {
  name: "Primitives",
  separator: "All primitives",
  pages: [
    { name: "Slider", url: "/docs/primitives/slider" },
    { name: "Button", url: "/docs/primitives/button" },
  ],
};

const separators = (
  nodes: ReadonlyArray<PageTree.Node>,
): PageTree.Separator[] =>
  nodes.flatMap((node) =>
    node.type === "folder"
      ? separators(node.children)
      : node.type === "separator"
        ? [node]
        : [],
  );

const urls = (nodes: ReadonlyArray<PageTree.Node>): string[] =>
  nodes.flatMap((node) => {
    if (node.type === "folder") return urls(node.children);
    return node.type === "page" ? [node.url] : [];
  });

/** The URLs inside the folder of that name. */
const urlsIn = (
  nodes: ReadonlyArray<PageTree.Node>,
  folderName: string,
): string[] =>
  nodes.flatMap((node) =>
    node.type !== "folder"
      ? []
      : node.name === folderName
        ? urls(node.children)
        : urlsIn(node.children, folderName),
  );

describe("the search tree", () => {
  it("leaves no separator with a name, at any depth", () => {
    // Fumadocs reads only a non-empty string name as a breadcrumb; a separator
    // that keeps one puts a sidebar heading in the result.
    const named = separators(searchPageTree(tree, [section]).children).filter(
      (node) => typeof node.name === "string" && node.name.length > 0,
    );

    expect(named.map((node) => node.name)).toEqual([]);
  });

  it("adds the package page the site's tree does not carry", () => {
    const result = searchPageTree(tree, [section]);

    // The page lands under the section's own folder, so its breadcrumb is that
    // folder — not the root group it happens to sit after.
    expect(urlsIn(result.children, "Primitives")).toContain(
      "/docs/primitives/button",
    );
  });

  it("keeps one row per URL and the curated pages in place", () => {
    // The Button page is new; Slider is already in the tree. Completing the
    // section must not list it twice.
    const found = urls(searchPageTree(tree, [section]).children);
    const slider = found.filter((url) => url === "/docs/primitives/slider");

    expect(slider).toHaveLength(1);
    expect(found).toContain("/docs/blocks/login");
  });

  it("does not mutate the tree it reads", () => {
    const before = separators(tree.children).map((node) => node.name);

    searchPageTree(tree, [section]);

    expect(separators(tree.children).map((node) => node.name)).toEqual(before);
    expect(urls(tree.children)).not.toContain("/docs/primitives/button");
  });

  it("is the tree the search route indexes with, built once", () => {
    const route = readFileSync(
      new URL("../routes/api/search.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("const searchTree = searchPageTree(");
    expect(route).toContain("getPageTree: () => searchTree");
    expect(route).toContain("packageSections.map(");
    // A fresh tree per call would rebuild Fumadocs' breadcrumb walk for every
    // page it indexes, because the cache is keyed by tree identity.
    expect(route).not.toContain("getPageTree: () =>\n    searchPageTree(");
  });
});
