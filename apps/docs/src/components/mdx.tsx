import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ComponentIndex } from "./component-index";
import { ComponentState } from "./component-state";
import { IllustrativeApproximation } from "./preview/approximation-banner";
import { NativePreview } from "./preview/native-preview";
import { PreviewUnavailable } from "./preview/preview-unavailable";
import { RelatedComponents } from "./related-components";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    TypeTable,
    ComponentIndex,
    ComponentState,
    RelatedComponents,
    NativePreview,
    IllustrativeApproximation,
    PreviewUnavailable,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
