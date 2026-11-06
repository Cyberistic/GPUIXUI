import type * as PageTree from "fumadocs-core/page-tree";
import { completeSection, type SectionPage } from "./page-tree";

export interface SearchSection {
  readonly name: string;
  readonly pages: ReadonlyArray<SectionPage>;
}

const withoutSeparators = (
  nodes: ReadonlyArray<PageTree.Node>,
): PageTree.Node[] =>
  nodes.map((node): PageTree.Node => {
    if (node.type === "folder") {
      return { ...node, children: withoutSeparators(node.children) };
    }
    return node.type === "separator" ? { ...node, name: "" } : node;
  });

export const searchPageTree = (
  tree: PageTree.Root,
  sections: ReadonlyArray<SearchSection>,
): PageTree.Root => ({
  ...tree,
  children: withoutSeparators(
    sections.reduce(
      (filled, section) => completeSection(filled, section.name, section.pages),
      tree,
    ).children,
  ),
});
