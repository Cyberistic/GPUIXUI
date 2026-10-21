import defaultMdxComponents from "fumadocs-ui/mdx";
import { ApiReference } from "./docs/api-reference";
import { BlockIndex } from "./docs/block-index";
import { BlockPreview } from "./docs/block-preview";
import { ComponentIndex } from "./docs/component-index";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource } from "./docs/component-source";
import { Install } from "./docs/install";
import { LaneTable } from "./docs/lane-table";
import { LicenseInventory } from "./docs/license-table";
import { ThemeEditor } from "./docs/theme-editor";
import { TokenScales } from "./docs/token-scales";
import { TypeScale } from "./docs/type-scale";

/** The MDX surface shared by every docs page. */
export const mdxComponents = {
  ...defaultMdxComponents,
  ApiReference,
  BlockIndex,
  BlockPreview,
  ComponentIndex,
  ComponentPreview,
  ComponentSource,
  Install,
  LaneTable,
  LicenseInventory,
  ThemeEditor,
  TokenScales,
  TypeScale,
};
