import defaultMdxComponents from "fumadocs-ui/mdx";
import { AeroTheme } from "./docs/aero-theme";
import { BlockIndex } from "./docs/block-index";
import { BlockPreview } from "./docs/block-preview";
import { ComponentIndex } from "./docs/component-index";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource } from "./docs/component-source";
import { ExamplesIndex } from "./docs/examples-index";
import { IconGallery } from "./docs/icon-gallery";
import { Install } from "./docs/install";
import { LanePages } from "./docs/lane-pages";
import { LaneTable } from "./docs/lane-table";
import { LookPicker } from "./docs/look-picker";
import { SidebarExample } from "./docs/sidebar-examples";
import { StyleReference } from "./docs/style-reference";
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
  AeroTheme,
  BlockIndex,
  BlockPreview,
  ComponentIndex,
  ComponentPreview,
  ComponentSource,
  ExamplesIndex,
  IconGallery,
  Install,
  LanePages,
  LaneTable,
  LookPicker,
  SidebarExample,
  StyleReference,
  ThemeEditor,
  TokenScales,
  TypeScale,
};
