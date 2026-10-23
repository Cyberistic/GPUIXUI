import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";

/**
 * The sidebar sections, completed.
 *
 * The site writes a page for a handful of components; the package writes one for
 * every component it ships. The tree is built from the site's collection, so a
 * curated page keeps its URL — the package's pages fill in the rest of the
 * folder, and the whole folder reads as one alphabetical list.
 */

/** A page to add to the section: its label and its URL. */
export interface SectionPage {
  readonly name: string;
  readonly url: string;
}

/** A page's label as sortable text; a JSX label falls back to its URL slug. */
const label = (name: ReactNode, url: string): string =>
  typeof name === "string" ? name : (url.split("/").at(-1) ?? url);

/** Every page already in the folder, with the folder's separators dropped. */
const pagesIn = (nodes: ReadonlyArray<PageTree.Node>): SectionPage[] =>
  nodes.flatMap((node) =>
    node.type === "page"
      ? [{ name: label(node.name, node.url), url: node.url }]
      : [],
  );

const byName = (left: SectionPage, right: SectionPage): number =>
  left.name.localeCompare(right.name);

/** The folder's pages and the package's, one per URL, alphabetically. */
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

/**
 * Fill every folder named `folderName` with `pages`, sorted by title.
 *
 * A curated page keeps its own label and URL; a package page fills a URL the
 * site does not write. Version history does not matter to a reader scanning a
 * component list, so the folder is one alphabetical lane rather than a curated
 * head followed by a second group.
 */
export const completeSection = (
  tree: PageTree.Root,
  folderName: string,
  pages: ReadonlyArray<SectionPage>,
): PageTree.Root => {
  const fill = (nodes: ReadonlyArray<PageTree.Node>): PageTree.Node[] =>
    nodes.map((node): PageTree.Node => {
      if (node.type !== "folder") return node;
      return node.name === folderName
        ? {
            ...node,
            children: merged(pagesIn(node.children), pages).map(pageNode),
          }
        : { ...node, children: fill(node.children) };
    });

  return { ...tree, children: fill(tree.children) };
};
