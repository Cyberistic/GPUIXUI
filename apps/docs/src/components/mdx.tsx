import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { AbsentStylingConcepts } from "./absent-styling-concepts";
import { AccessibilityIndex } from "./accessibility-index";
import { ApiIndex } from "./api-index";
import { AriaSupportTable } from "./aria-support-table";
import { CapabilityMatrix } from "./capability-matrix";
import { ComponentIndex } from "./component-index";
import { ComponentDependencies } from "./component-dependencies";
import { ComponentState } from "./component-state";
import { ContrastColors } from "./contrast-colors";
import { HostPropsTable } from "./host-props-table";
import { ElementInstanceTable } from "./element-instance-table";
import { IllustrativeApproximation } from "./preview/approximation-banner";
import { ComponentPreview } from "./preview/component-preview";
import { LiveSurface } from "./preview/live-surface";
import { LiveSceneIndex } from "./preview/scene-index";
import { NativePreview } from "./preview/native-preview";
import { IconCatalogue } from "./icon-catalogue";
import { PageTemplateSections } from "./page-template";
import { PartIndex } from "./part-index";
import { PartStates } from "./part-states-table";
import { NativePlatforms } from "./native-platforms";
import { AbsentElements, NativeElementsTable } from "./native-elements-table";
import {
  FindRangeFields,
  HighlightFields,
  SelectionAbsences,
  TextSearchFields,
} from "./selection-tables";
import { PlatformPreviews } from "./preview/platform-previews";
import { PreviewTiers } from "./preview/preview-tiers";
import { PreviewUnavailable } from "./preview/preview-unavailable";
import { ThemeCaptures } from "./preview/theme-captures";
import { ThemeEditor } from "./theme-editor";
import { RelatedComponents } from "./related-components";
import { ShowcaseComponents } from "./showcase";
import { RoadmapTable } from "./roadmap-table";
import { SearchReference } from "./search-reference";
import { PlatformValues } from "./platform-values";
import { PlatformStyles } from "./platform-styles";
import { TokenColors } from "./token-colors";
import { TokenScales } from "./token-scales";
import { ValueIndex } from "./value-index";
import {
  LayerShellTable,
  PathPromptTable,
  WindowAbsences,
  WindowInsetsTable,
  WindowMethodsTable,
  WindowOptionsTable,
} from "./window-tables";
import { PlatformTypes, TypeScale } from "./type-scale";
import {
  PortingComponents,
  PortingConcepts,
  PortingGaps,
} from "./porting-tables";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    TypeTable,
    ComponentIndex,
    ApiIndex,
    AriaSupportTable,
    AccessibilityIndex,
    AbsentStylingConcepts,
    HostPropsTable,
    ElementInstanceTable,
    PartIndex,
    PartStates,
    PageTemplateSections,
    ComponentState,
    ComponentDependencies,
    RelatedComponents,
    ShowcaseComponents,
    RoadmapTable,
    SearchReference,
    CapabilityMatrix,
    NativePreview,
    NativePlatforms,
    NativeElementsTable,
    AbsentElements,
    HighlightFields,
    TextSearchFields,
    FindRangeFields,
    SelectionAbsences,
    LiveSurface,
    LiveSceneIndex,
    ComponentPreview,
    IllustrativeApproximation,
    PlatformPreviews,
    PreviewTiers,
    PreviewUnavailable,
    TokenColors,
    ContrastColors,
    TypeScale,
    WindowOptionsTable,
    WindowMethodsTable,
    WindowInsetsTable,
    LayerShellTable,
    PathPromptTable,
    WindowAbsences,
    PlatformTypes,
    TokenScales,
    ValueIndex,
    PlatformValues,
    PlatformStyles,
    ThemeCaptures,
    ThemeEditor,
    IconCatalogue,
    PortingComponents,
    PortingConcepts,
    PortingGaps,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
