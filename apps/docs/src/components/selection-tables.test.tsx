import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  findRangeFields,
  highlightFields,
  selectionAbsences,
  textSearchFields,
} from "@/lib/selection";
import {
  FindRangeFields,
  HighlightFields,
  SelectionAbsences,
  TextSearchFields,
} from "./selection-tables";

/**
 * Guards plan 627's tables. A row that silently stops rendering leaves the prose
 * above it claiming a catalogue it no longer shows; every expectation derives
 * from `selection.ts`.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appRoot, "content", "docs", "selection.mdx"),
  "utf8",
);

const html = [
  renderToStaticMarkup(<HighlightFields />),
  renderToStaticMarkup(<TextSearchFields />),
  renderToStaticMarkup(<FindRangeFields />),
].join("\n");
const absences = renderToStaticMarkup(<SelectionAbsences />);

const rows = [
  ...highlightFields.map((field) => `data-field="${field.name}"`),
  ...textSearchFields.map((field) => `data-field="${field.name}"`),
  ...findRangeFields.map((field) => `data-field="${field.name}"`),
];

describe("selection tables", () => {
  it("renders every documented field", () => {
    const missing = rows.filter((row) => !html.includes(row));
    expect(missing).toEqual([]);
    expect(html.match(/data-selection="/g)).toHaveLength(3);
  });

  it("renders each frame's explanation", () => {
    expect(html).toContain("How many matches come before this subtree");
    expect(html).toContain(
      "The text to find. An empty query clears the washes.",
    );
    expect(html).toContain(
      "The text to search, exactly as the subtree would render it.",
    );
  });

  it("renders one absence row per gap", () => {
    expect([...absences.matchAll(/data-absence="/g)]).toHaveLength(
      selectionAbsences.length,
    );
    const missing = selectionAbsences
      .filter(
        (absence) => !absences.includes(`data-absence="${absence.subject}"`),
      )
      .map((absence) => absence.subject);
    expect(missing).toEqual([]);
    expect(absences).toContain("No clipboard method is declared");
  });

  it("is mounted on the page", () => {
    const missing = [
      "<HighlightFields />",
      "<TextSearchFields />",
      "<FindRangeFields />",
      "<SelectionAbsences />",
    ].filter((block) => !page.includes(block));
    expect(missing).toEqual([]);
  });
});
