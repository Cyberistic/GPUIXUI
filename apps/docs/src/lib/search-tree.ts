import type * as PageTree from "fumadocs-core/page-tree";
import { completeSection, type SectionPage } from "./page-tree";

/**
 * The page tree search reads, with the sidebar's decoration removed.
 *
 * The sidebar fills a package's pages into its section and marks every group
 * with a separator (`---Getting Started---`, `All primitives`). Fumadocs reads
 * a separator as a **breadcrumb** when it builds the search index, so a reader
 * searching "blocks" was shown `Docs › Blocks › Blocks` — the root group and the
 * folder of the same name — and a package page showed none at all, because the
 * search index only ever walked the site's own collection.
 *
 * This tree completes the same sections the sidebar shows, then blanks every
 * separator's name: Fumadocs skips an unnamed separator, so a result reads
 * `Docs › Components` and `Docs › Primitives` — where the page lives, not the
 * heading it happens to sit under.
 */
export interface SearchSection {
  readonly name: string;
  readonly separator: string;
  readonly pages: ReadonlyArray<SectionPage>;
}

/** The same list with every separator unnamed. */
const withoutSeparators = (
  nodes: ReadonlyArray<PageTree.Node>,
): PageTree.Node[] =>
  nodes.map((node): PageTree.Node => {
    if (node.type === "folder") {
      return { ...node, children: withoutSeparators(node.children) };
    }
    return node.type === "separator" ? { ...node, name: "" } : node;
  });

/** The site's tree, every package section filled, and no separator named. */
export const searchPageTree = (
  tree: PageTree.Root,
  sections: ReadonlyArray<SearchSection>,
): PageTree.Root => ({
  ...tree,
  children: withoutSeparators(
    sections.reduce(
      (filled, section) =>
        completeSection(filled, section.name, section.pages, section.separator),
      tree,
    ).children,
  ),
});
