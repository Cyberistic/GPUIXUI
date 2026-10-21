import defaultMdxComponents from "fumadocs-ui/mdx";
import { ApiReference } from "./docs/api-reference";
import { BlockIndex } from "./docs/block-index";
import { BlockPreview } from "./docs/block-preview";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource } from "./docs/component-source";
import { Install } from "./docs/install";
import { LaneTable } from "./docs/lane-table";
import { ThemeEditor } from "./docs/theme-editor";

/** The MDX surface shared by every docs page. */
export const mdxComponents = {
  ...defaultMdxComponents,
  ApiReference,
  BlockIndex,
  BlockPreview,
  ComponentPreview,
  ComponentSource,
  Install,
  LaneTable,
  ThemeEditor,
};
