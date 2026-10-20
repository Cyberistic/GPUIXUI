import { describe, expect, it } from "vitest";
import { generatedSearchEntries } from "./search";
import { nativeTextSearchEntry } from "./native-text-search";
import {
  mappedFields,
  metricFields,
  syntaxFields,
  themeFields,
} from "./native-text";

/**
 * Guards plan 629's search entry. The page renders three tables React, and
 * generated table rows are dropped from search (plan 479), so without this
 * document `GpuixTheme`, `textFaint` and `codeTextSize` would have no home.
 *
 * The plain syntax capture classes are the regression risk: promoting `label`,
 * `string` or `function` would steal a component or Styling query.
 */
describe("native text search entry", () => {
  it("promotes the type names, the helper and the camelCase fields", () => {
    const missing = [
      "GpuixTheme",
      "SyntaxTheme",
      "GpuixMetrics",
      "nativeTextTheme",
      "textFaint",
      "codeTextSize",
      "diffHunkBg",
      "mdHeadingSizes",
    ].filter((name) => !nativeTextSearchEntry.names.includes(name));
    expect(missing).toEqual([]);
  });

  it("never promotes a plain syntax capture class or a generic word", () => {
    const promoted = [
      "comment",
      "keyword",
      "string",
      "number",
      "function",
      "label",
      "invalid",
      "theme",
      "text",
      "code",
      "diff",
      "markdown",
    ].filter((name) => nativeTextSearchEntry.names.includes(name));
    expect(promoted).toEqual([]);
  });

  it("carries every field and the mapping in its content", () => {
    const content = nativeTextSearchEntry.index.content ?? "";
    const missing = [
      ...themeFields.map((field) => field.name),
      ...syntaxFields.map((field) => field.name),
      ...metricFields.map((field) => field.name),
      ...mappedFields,
    ].filter((name) => !content.includes(name));
    expect(missing).toEqual([]);
  });

  it("is registered in the generated index", () => {
    expect(generatedSearchEntries).toContain(nativeTextSearchEntry);
    expect(nativeTextSearchEntry.index.url).toBe("/docs/native-text-theme");
  });
});
