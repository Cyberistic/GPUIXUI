import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { isEffect } from "./effects.js";

export interface SectionPage {
  readonly name: string;
  readonly url: string;
}

const label = (name: ReactNode, url: string): string =>
  typeof name === "string" ? name : (url.split("/").at(-1) ?? url);

const pagesIn = (nodes: ReadonlyArray<PageTree.Node>): SectionPage[] =>
  nodes.flatMap((node) =>
    node.type === "page"
      ? [{ name: label(node.name, node.url), url: node.url }]
      : [],
  );

const byName = (left: SectionPage, right: SectionPage): number =>
  left.name.localeCompare(right.name);

const merged = (
  existing: ReadonlyArray<SectionPage>,
  added: ReadonlyArray<SectionPage>,
): ReadonlyArray<SectionPage> =>
  [
    ...new Map(
      [...existing, ...added].map((page) => [page.url, page]),
    ).values(),
  ].toSorted(byName);

const pageNode = (page: SectionPage): PageTree.Node => ({
  type: "page",
  name: page.name,
  url: page.url,
});

export const completeSection = (
  tree: PageTree.Root,
  folderName: string,
  pages: ReadonlyArray<SectionPage>,
): PageTree.Root => {
  const fill = (nodes: ReadonlyArray<PageTree.Node>): PageTree.Node[] =>
    nodes.map((node): PageTree.Node => {
      if (node.type !== "folder") return node;
      if (node.name !== folderName)
        return { ...node, children: fill(node.children) };
      const all = merged(pagesIn(node.children), pages);

      if (node.name !== "Components")
        return { ...node, children: all.map(pageNode) };
      const plain = all.filter((page) => !isEffect(page.url));
      const effects = all.filter((page) => isEffect(page.url));
      return {
        ...node,
        children: [
          ...plain.map(pageNode),
          ...(effects.length === 0
            ? []
            : [
                {
                  type: "folder" as const,
                  name: "Effects",
                  children: effects.map(pageNode),
                },
              ]),
        ],
      };
    });

  return { ...tree, children: fill(tree.children) };
};
