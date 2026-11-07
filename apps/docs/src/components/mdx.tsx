import defaultMdxComponents from "fumadocs-ui/mdx";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { AllBlocks } from "./docs/all-blocks";
import { AeroTheme } from "./docs/aero-theme";
import { BlockIndex } from "./docs/block-index";
import { BlockPreview } from "./docs/block-preview";
import { ComponentIndex } from "./docs/component-index";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource, DesktopStyles } from "./docs/component-source";
import { EditorTabsPreview } from "./docs/editor-tabs-preview";
import { ExamplesIndex } from "./docs/examples-index";
import { IconGallery } from "./docs/icon-gallery";
import { Install } from "./docs/install";
import { LanePages } from "./docs/lane-pages";
import { LaneTable } from "./docs/lane-table";
import { MermaidDiagram } from "./docs/mermaid-diagram";
import { DiagramExample } from "./diagram/DiagramExample";
import { DiagramPlayground } from "./diagram/DiagramPlayground";
import { PromptPage } from "./docs/prompt-page";
import { LookPicker } from "./docs/look-picker";
import { SidebarExample } from "./docs/sidebar-examples";
import { StyleReference } from "./docs/style-reference";
import { ThemeEditor } from "./docs/theme-editor";
import { ThemeStylesheet } from "./docs/theme-stylesheet";
import { TokenScales } from "./docs/token-scales";
import { TypeScale } from "./docs/type-scale";

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

const pre = ({ children, ...rest }: ComponentProps<"pre">) => {
  const code = codeOf(children);
  if (code !== undefined && code.language === "mermaid") {
    return <MermaidDiagram source={code.text.trimEnd()} />;
  }
  return (
    <defaultMdxComponents.pre {...rest}>{children}</defaultMdxComponents.pre>
  );
};

export const mdxComponents = {
  ...defaultMdxComponents,
  AllBlocks,
  AeroTheme,
  BlockIndex,
  BlockPreview,
  ComponentIndex,
  ComponentPreview,
  ComponentSource,
  DesktopStyles,
  EditorTabsPreview,
  ExamplesIndex,
  IconGallery,
  Install,
  LanePages,
  LaneTable,
  MermaidDiagram,
  DiagramExample,
  DiagramPlayground,
  pre,
  PromptPage,
  LookPicker,
  SidebarExample,
  StyleReference,
  ThemeEditor,
  ThemeStylesheet,
  TokenScales,
  TypeScale,
};
