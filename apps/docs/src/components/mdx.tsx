import defaultMdxComponents from "fumadocs-ui/mdx";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
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
import { MermaidDiagram } from "./docs/mermaid-diagram";
import { Pattern, PatternChoices } from "./docs/patterns";
import { PlatformStyleSource } from "./docs/platform-style-source";
import { PromptPage } from "./docs/prompt-page";
import { SeriesSwatches } from "./docs/series-swatches";
import { SidebarExample } from "./docs/sidebar-examples";
import { StyleReference } from "./docs/style-reference";
import { ThemeEditor } from "./docs/theme-editor";
import { ThemeMatrix } from "./docs/theme-matrix";
import { TokenScales } from "./docs/token-scales";
import { TypeScale } from "./docs/type-scale";

/** The text a `<code>` element holds, or `undefined` when it is not a fence. */
const codeOf = (
  child: ReactNode,
): { text: string; language: string } | undefined => {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return undefined;
  }
  if (typeof child.type !== "string" || child.type !== "code") return undefined;
  const text = child.props.children;
  if (typeof text !== "string") return undefined;
  const language = /language-(\S+)/.exec(child.props.className ?? "")?.[1];
  return language === undefined ? undefined : { text, language };
};

/**
 * A code fence whose language is `mermaid` is a diagram.
 *
 * The fence stays source: a page that wants the Mermaid text as text wraps it in
 * a plain fence, and a reader who wants to copy the diagram copies the source
 * the page shows. The diagram itself is rendered by Pele at build time, so the
 * prerendered page carries the SVG.
 */
const pre = ({ children, ...rest }: ComponentProps<"pre">) => {
  const code = codeOf(children);
  if (code !== undefined && code.language === "mermaid") {
    return <MermaidDiagram source={code.text.trimEnd()} />;
  }
  return (
    <defaultMdxComponents.pre {...rest}>{children}</defaultMdxComponents.pre>
  );
};

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
  MermaidDiagram,
  Pattern,
  PatternChoices,
  PlatformStyleSource,
  pre,
  PromptPage,
  SeriesSwatches,
  SidebarExample,
  StyleReference,
  ThemeEditor,
  ThemeMatrix,
  TokenScales,
  TypeScale,
};
