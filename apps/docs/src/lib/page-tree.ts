import type * as PageTree from "fumadocs-core/page-tree";

/**
 * The component section of the sidebar, completed.
 *
 * The site writes a page for a handful of components; the package writes one for
 * every component it ships. The tree is built from the site's collection, so a
 * curated page keeps its place and its section — the package's pages fill in the
 * rest of the folder instead of replacing it.
 */

/** A page to add to the section: its label and its URL. */
export interface SectionPage {
  readonly name: string;
  readonly url: string;
}

/** Every URL already in a tree. */
const urls = (nodes: ReadonlyArray<PageTree.Node>): ReadonlySet<string> =>
  new Set(
    nodes.flatMap((node) => {
      if (node.type === "page") return [node.url];
      if (node.type === "folder") return [...urls(node.children)];
      return [];
    }),
  );

const byName = (left: SectionPage, right: SectionPage): number =>
  left.name.localeCompare(right.name);

/**
 * Append `pages` to the folder named `folderName`, skipping any URL the tree
 * already links. Appended pages sit under their own separator, alphabetical, so
 * the curated order above them is untouched.
 */
export const completeSection = (
  tree: PageTree.Root,
  folderName: string,
  pages: ReadonlyArray<SectionPage>,
  separator = "All components",
): PageTree.Root => {
  const known = urls(tree.children);
  const missing = pages.filter((page) => !known.has(page.url)).toSorted(byName);

  if (missing.length === 0) return tree;

  const items: ReadonlyArray<PageTree.Node> = [
    { type: "separator", name: separator },
    ...missing.map(
      (page): PageTree.Node => ({
        type: "page",
        name: page.name,
        url: page.url,
      }),
    ),
  ];

  const append = (nodes: ReadonlyArray<PageTree.Node>): PageTree.Node[] =>
    nodes.map((node): PageTree.Node => {
      if (node.type !== "folder") return node;
      return node.name === folderName
        ? { ...node, children: [...node.children, ...items] }
        : { ...node, children: append(node.children) };
    });

  return { ...tree, children: append(tree.children) };
};
