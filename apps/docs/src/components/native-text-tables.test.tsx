import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  mappedFields,
  metricFields,
  nativeTextAbsences,
  syntaxFields,
  themeElements,
  themeFields,
  unmappedFields,
} from "@/lib/native-text";
import {
  GpuixMetricsFields,
  NativeTextAbsences,
  NativeTextElements,
  NativeTextMapping,
  NativeTextThemeFields,
  SyntaxThemeFields,
} from "./native-text-tables";

/**
 * Guards plan 629's tables. A row that silently stops rendering leaves the prose
 * above it claiming a catalogue it no longer shows; every count and label
 * derives from `native-text.ts`, whose own suite checks it against the installed
 * declarations.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appRoot, "content", "docs", "native-text-theme.mdx"),
  "utf8",
);

const elements = renderToStaticMarkup(<NativeTextElements />);
const theme = renderToStaticMarkup(<NativeTextThemeFields />);
const syntax = renderToStaticMarkup(<SyntaxThemeFields />);
const metrics = renderToStaticMarkup(<GpuixMetricsFields />);
const mapping = renderToStaticMarkup(<NativeTextMapping />);
const absences = renderToStaticMarkup(<NativeTextAbsences />);

const renderedRows = (html: string, marker: string): ReadonlyArray<string> =>
  [...html.matchAll(new RegExp(`data-${marker}="([^"]+)"`, "gu"))].map(
    (match) => match[1] ?? "",
  );

describe("native text tables", () => {
  it("renders every element that takes a theme", () => {
    expect(renderedRows(elements, "element")).toEqual(
      themeElements.map((element) => element.tag),
    );
    expect(elements).toContain("TextareaProps → InputProps");
    expect(elements.match(/No component yet/g)).toHaveLength(3);
  });

  it("renders every GpuixTheme field with its group", () => {
    expect(renderedRows(theme, "field")).toEqual(
      themeFields.map((field) => field.name),
    );
    expect(theme).toContain("Text surfaces");
    expect(theme).toContain("The 24 syntax capture colours");
  });

  it("renders every SyntaxTheme capture class", () => {
    expect(renderedRows(syntax, "field")).toEqual(
      syntaxFields.map((field) => field.name),
    );
    expect(syntax).toContain("Special string content");
  });

  it("renders every GpuixMetrics field with its family", () => {
    expect(renderedRows(metrics, "field")).toEqual(
      metricFields.map((field) => field.name),
    );
    expect(metrics).toContain("Markdown");
    expect(metrics).toContain("The coloured bar at a changed row&#x27;s edge");
  });

  it("renders the nine mapped and nine unset fields", () => {
    const rows = renderedRows(mapping, "mapping");
    expect(rows).toEqual([
      ...mappedFields,
      ...unmappedFields.map((field) => field.name),
    ]);
    expect(mapping.match(/data-status="mapped"/gu)).toHaveLength(
      mappedFields.length,
    );
    expect(mapping.match(/data-status="unset"/gu)).toHaveLength(
      unmappedFields.length,
    );
    expect(mapping).toContain("the shared focus ring can replace it");
  });

  it("renders one absence row per gap", () => {
    expect(renderedRows(absences, "absence")).toEqual(
      nativeTextAbsences.map((absence) => absence.subject),
    );
    expect(absences).toContain("the reconciler forwards only its universal");
  });

  it("is mounted on the page", () => {
    const missing = [
      "<NativeTextElements />",
      "<NativeTextThemeFields />",
      "<SyntaxThemeFields />",
      "<GpuixMetricsFields />",
      "<NativeTextMapping />",
      "<NativeTextAbsences />",
    ].filter((block) => !page.includes(block));
    expect(missing).toEqual([]);
  });
});
