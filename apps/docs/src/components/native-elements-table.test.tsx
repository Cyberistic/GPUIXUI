import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { absentElements, nativeElements } from "@/lib/native-elements";
import { AbsentElements, NativeElementsTable } from "./native-elements-table";

/**
 * Guards plan 626's tables. The rows are rendered React from
 * `native-elements.ts`, so the page index cannot see them: a row that silently
 * stops rendering leaves the prose above it claiming a catalogue it no longer
 * shows. Every expectation derives from the module, so a row cannot be added
 * without appearing.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appRoot, "content", "docs", "native-elements.mdx"),
  "utf8",
);

const elements = renderToStaticMarkup(<NativeElementsTable />);
const absences = renderToStaticMarkup(<AbsentElements />);

describe("native elements table", () => {
  it("renders one row per element, with its props", () => {
    expect([...elements.matchAll(/data-element="/g)]).toHaveLength(
      nativeElements.length,
    );
    const missing = nativeElements
      .filter((element) => !elements.includes(`data-element="${element.tag}"`))
      .map((element) => element.tag);
    expect(missing).toEqual([]);
    expect(elements).toContain(
      "position, side, align, gap, anchor, offset, fit, snapMargin, deferred, priority, occlude",
    );
    expect(elements).toContain("shared host props only");
  });

  it("links the roadmap target for every element with no component", () => {
    const uncomposed = nativeElements.filter(
      (element) => element.composedBy.length === 0,
    );
    expect(uncomposed.length).toBeGreaterThan(0);
    expect(elements.match(/href="\/docs\/roadmap"/g)).toHaveLength(
      uncomposed.filter((element) => element.roadmap !== undefined).length,
    );
  });

  it("renders one absence row per replacement", () => {
    expect([...absences.matchAll(/data-absent="/g)]).toHaveLength(
      absentElements.length,
    );
    const missing = absentElements
      .filter((row) => !absences.includes(`data-absent="${row.tag}"`))
      .map((row) => row.tag);
    expect(missing).toEqual([]);
    expect(absences).toContain('href="/docs/components/button"');
  });

  it("is mounted on the page, in both places", () => {
    expect(page).toContain("<NativeElementsTable />");
    expect(page).toContain("<AbsentElements />");
  });
});
