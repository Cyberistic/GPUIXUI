import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import {
  mappedFields,
  metricFields,
  nativeTextAbsences,
  syntaxFields,
  themeElements,
  themeFields,
  unmappedFields,
} from "./native-text";

/**
 * The native text theme's search document (plan 629). The page renders its
 * three tables React, and generated table rows are dropped from search (plan
 * 479), so without this document the API spellings have no home: measured
 * 2026-10-20, `GpuixTheme`, `SyntaxTheme`, `GpuixMetrics`, `textFaint`,
 * `codeTextSize` and `diffHunkBg` returned nothing.
 *
 * Only distinctive spellings are promoted — the three type names, the helper
 * and the camelCase fields. A plain syntax capture class (`comment`, `string`,
 * `label`, `invalid`) stays indexed but is never promoted, so it cannot steal a
 * component page.
 */
const fieldNames = [
  ...themeFields.map((field) => field.name),
  ...syntaxFields.map((field) => field.name),
  ...metricFields.map((field) => field.name),
].filter(isDistinctiveName);

export const nativeTextSearchEntry: GeneratedSearchEntry = {
  names: [
    "GpuixTheme",
    "SyntaxTheme",
    "GpuixMetrics",
    "nativeTextTheme",
    ...fieldNames,
  ],
  index: {
    title: "Native text theme",
    description:
      "The runtime's GpuixTheme: the palette, syntax colours, code/diff/markdown metrics and font families behind native code, diff, markdown, input and textarea elements — how the library maps its tokens onto it and what it leaves unset.",
    content: [
      "The runtime's native text elements take a second theme, separate from @gpuixui/tokens: GpuixTheme, with its SyntaxTheme and GpuixMetrics children.",
      ...themeElements.map(
        (element) =>
          `<${element.tag}>: ${element.interfaceName} takes a theme. ${element.what}`,
      ),
      ...themeFields.map(
        (field) => `GpuixTheme ${field.name}: ${field.summary}`,
      ),
      ...syntaxFields.map(
        (field) => `SyntaxTheme ${field.name}: ${field.summary}`,
      ),
      ...metricFields.map(
        (field) => `GpuixMetrics ${field.name}: ${field.summary}`,
      ),
      `nativeTextTheme maps ${mappedFields.length} fields and leaves ${unmappedFields.length} at the runtime defaults.`,
      "There is no global setter, no CSS variable and no registerFont; a theme is a prop on input, textarea, code, diff and markdown, and div/text drop it.",
      ...nativeTextAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/native-text-theme",
    breadcrumbs: ["Native text theme"],
    keywords: [
      "native text theme",
      "syntax theme",
      "syntax colors",
      "syntax colours",
      "code theme",
      "code metrics",
      "diff theme",
      "diff colors",
      "markdown theme",
      "markdown metrics",
      "gutter",
      "caret color",
      ...fieldNames,
    ].join(" "),
  },
};
