import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { AccessibilityIndex } from "./accessibility-index";
import { ApiIndex } from "./api-index";
import { AriaSupportTable } from "./aria-support-table";
import { CapabilityMatrix } from "./capability-matrix";
import { ComponentIndex } from "./component-index";
import { ComponentDependencies } from "./component-dependencies";
import { ComponentState } from "./component-state";
import { IllustrativeApproximation } from "./preview/approximation-banner";
import { ComponentPreview } from "./preview/component-preview";
import { LiveSurface } from "./preview/live-surface";
import { NativePreview } from "./preview/native-preview";
import { IconCatalogue } from "./icon-catalogue";
import { PageTemplateSections } from "./page-template";
import { PartIndex } from "./part-index";
import { PlatformPreviews } from "./preview/platform-previews";
import { PreviewTiers } from "./preview/preview-tiers";
import { PreviewUnavailable } from "./preview/preview-unavailable";
import { ThemeCaptures } from "./preview/theme-captures";
import { RelatedComponents } from "./related-components";
import { ShowcaseComponents } from "./showcase";
import { RoadmapTable } from "./roadmap-table";
import { PlatformValues } from "./platform-values";
import { PlatformStyles } from "./platform-styles";
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
    AriaSupportTable,
    AccessibilityIndex,
    PartIndex,
    PageTemplateSections,
    ComponentState,
    ComponentDependencies,
    RelatedComponents,
    ShowcaseComponents,
    RoadmapTable,
    CapabilityMatrix,
    NativePreview,
    LiveSurface,
    ComponentPreview,
    IllustrativeApproximation,
    PlatformPreviews,
    PreviewTiers,
    PreviewUnavailable,
    TokenColors,
    TypeScale,
    PlatformTypes,
    TokenScales,
    ValueIndex,
    PlatformValues,
    PlatformStyles,
    ThemeCaptures,
    IconCatalogue,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
