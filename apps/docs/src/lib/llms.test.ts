/**
 * Guards the machine-readable documentation index (plan 525). The bug this
 * catches is an index that links only part of the page tree, leaves its links
 * relative, or claims to be the full manual while a page is missing.
 */
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { absoluteUrl } from "@/lib/site";
import { source } from "@/lib/source";
import { renderLlmsFull, renderLlmsIndex } from "./llms";

const pages = source.getPages();
const index = await renderLlmsIndex();
const full = await renderLlmsFull();

const occurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

describe("llms discovery", () => {
  it("links every documentation page once, with an absolute URL", () => {
    Arr.forEach(pages, (page) => {
      expect(occurrences(index, `](${absoluteUrl(page.url)})`)).toBe(1);
    });
    expect(index).not.toContain("](/");
  });

  it("opens with the site's name and the tree's summary", () => {
    expect(index.startsWith("# GPUIXUI\n")).toBe(true);
    expect(index).toContain("\n> ");
    expect(index).not.toContain("<!doctype");
  });

  it("renders every page as Markdown in the full document", () => {
    Arr.forEach(pages, (page) => {
      expect(full).toContain(`# ${page.data.title}`);
      expect(occurrences(full, `Source: ${absoluteUrl(page.url)}\n`)).toBe(1);
    });
  });

  it("stays small enough to serve in one response", () => {
    expect(full.length).toBeLessThan(10 * 1024 * 1024);
  });

  it("renders authored prose as Markdown, not the MDX source", () => {
    expect(full).toContain("## Usage");
    expect(full).toContain("Button` is the action primitive");
    expect(full).not.toContain("---\ntitle: Buttons");
  });
});
