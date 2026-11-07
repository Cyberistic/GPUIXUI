import { readFileSync } from "node:fs";
import type * as PageTree from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { searchPageTree, type SearchSection } from "./search-tree";

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
    page("Introduction", "/"),
    folder("Blocks", [
      page("Blocks", "/blocks"),
      page("Login", "/blocks/login"),
    ]),
    separator("Composition"),
    folder("Primitives", [page("Slider", "/primitives/slider")]),
  ],
};

const section: SearchSection = {
  name: "Primitives",
  pages: [
    { name: "Slider", url: "/primitives/slider" },
    { name: "Button", url: "/primitives/button" },
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
    const named = separators(searchPageTree(tree, [section]).children).filter(
      (node) => typeof node.name === "string" && node.name.length > 0,
    );

    expect(named.map((node) => node.name)).toEqual([]);
  });

  it("adds the package page the site's tree does not carry", () => {
    const result = searchPageTree(tree, [section]);

    expect(urlsIn(result.children, "Primitives")).toContain(
      "/primitives/button",
    );
  });

  it("keeps one row per URL and the curated pages in place", () => {
    const found = urls(searchPageTree(tree, [section]).children);
    const slider = found.filter((url) => url === "/primitives/slider");

    expect(slider).toHaveLength(1);
    expect(found).toContain("/blocks/login");
  });

  it("does not mutate the tree it reads", () => {
    const before = separators(tree.children).map((node) => node.name);

    searchPageTree(tree, [section]);

    expect(separators(tree.children).map((node) => node.name)).toEqual(before);
    expect(urls(tree.children)).not.toContain("/primitives/button");
  });

  it("is the tree the search route indexes with, built once", () => {
    const route = readFileSync(
      new URL("../routes/api/search.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("const searchTree = searchPageTree(");
    expect(route).toContain("getPageTree: () => searchTree");
    expect(route).toContain("packageSections.map(");

    expect(route).not.toContain("getPageTree: () =>\n    searchPageTree(");
  });
});
