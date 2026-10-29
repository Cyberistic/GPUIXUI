import defaultMdxComponents from "fumadocs-ui/mdx";
import { AllBlocks } from "./docs/all-blocks";
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
import { LicenseInventory } from "./docs/license-table";
import { LookPicker } from "./docs/look-picker";
import { Pattern, PatternChoices } from "./docs/patterns";
import { PlatformStyleSource } from "./docs/platform-style-source";
import { SeriesSwatches } from "./docs/series-swatches";
import { SidebarExample } from "./docs/sidebar-examples";
import { StyleReference } from "./docs/style-reference";
import { ThemeEditor } from "./docs/theme-editor";
import { ThemeMatrix } from "./docs/theme-matrix";
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
  AllBlocks,
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
  LicenseInventory,
  LookPicker,
  Pattern,
  PatternChoices,
  PlatformStyleSource,
  SeriesSwatches,
  SidebarExample,
  StyleReference,
  ThemeEditor,
  ThemeMatrix,
  TokenScales,
  TypeScale,
};
