import defaultMdxComponents from "fumadocs-ui/mdx";
import { ComponentPreview } from "./docs/component-preview";
import { ComponentSource } from "./docs/component-source";
import { Install } from "./docs/install";

/** The MDX surface shared by every docs page. */
export const mdxComponents = {
  ...defaultMdxComponents,
  ComponentPreview,
  ComponentSource,
  Install,
};
