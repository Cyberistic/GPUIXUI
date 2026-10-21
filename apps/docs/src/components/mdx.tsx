import defaultMdxComponents from "fumadocs-ui/mdx";
import { BlockIndex } from "./docs/block-index";
import { BlockPreview } from "./docs/block-preview";
import { ComponentIndex } from "./docs/component-index";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource } from "./docs/component-source";
import { ExamplesIndex } from "./docs/examples-index";
import { Install } from "./docs/install";
import { LaneTable } from "./docs/lane-table";
import { LicenseInventory } from "./docs/license-table";
import { ThemeEditor } from "./docs/theme-editor";
import { TokenScales } from "./docs/token-scales";
import { TypeScale } from "./docs/type-scale";

/**
 * The MDX surface shared by every docs page.
 *
 * A page that needs something heavy imports it itself, so the shared map stays
 * small: `ApiReference` carries the whole public symbol index, and every page
 * would otherwise pay for it.
 */
export const mdxComponents = {
  ...defaultMdxComponents,
  BlockIndex,
  BlockPreview,
  ComponentIndex,
  ComponentPreview,
  ComponentSource,
  ExamplesIndex,
  Install,
  LaneTable,
  LicenseInventory,
  ThemeEditor,
  TokenScales,
  TypeScale,
};
