import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ApiIndex } from "./api-index";
import { CapabilityMatrix } from "./capability-matrix";
import { ComponentIndex } from "./component-index";
import { ComponentDependencies } from "./component-dependencies";
import { ComponentState } from "./component-state";
import { IllustrativeApproximation } from "./preview/approximation-banner";
import { ComponentPreview } from "./preview/component-preview";
import { LiveSurface } from "./preview/live-surface";
import { NativePreview } from "./preview/native-preview";
import { PageTemplateSections } from "./page-template";
import { PartIndex } from "./part-index";
import { PlatformPreviews } from "./preview/platform-previews";
import { PreviewUnavailable } from "./preview/preview-unavailable";
import { ThemeCaptures } from "./preview/theme-captures";
import { RelatedComponents } from "./related-components";
import { PlatformValues } from "./platform-values";
import { TokenColors } from "./token-colors";
import { TokenScales } from "./token-scales";
import { ValueIndex } from "./value-index";
import { PlatformTypes, TypeScale } from "./type-scale";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    TypeTable,
    ComponentIndex,
    ApiIndex,
    PartIndex,
    PageTemplateSections,
    ComponentState,
    ComponentDependencies,
    RelatedComponents,
    CapabilityMatrix,
    NativePreview,
    LiveSurface,
    ComponentPreview,
    IllustrativeApproximation,
    PlatformPreviews,
    PreviewUnavailable,
    TokenColors,
    TypeScale,
    PlatformTypes,
    TokenScales,
    ValueIndex,
    PlatformValues,
    ThemeCaptures,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
