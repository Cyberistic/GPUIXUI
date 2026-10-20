/**
 * Guards the per-page Markdown representation (plan 596). The bug this catches
 * is a page a reader cannot take away: the site served `/llms-full.txt` (the
 * whole 700 KB manual) but no `/docs/<slug>.md`, so the "Copy Markdown" control
 * had nothing to copy. These tests fail if the URL scheme drops a segment,
 * stops stripping the `.md` suffix, stops folding the root page, or if the
 * rendered document stops being the same `llms()` render the full manual uses.
 */
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { absoluteUrl } from "@/lib/site";
import { source } from "@/lib/source";
import { docsLlms, renderPageMarkdown } from "./llms";
import { decodeMarkdownUrl, getPageMarkdownUrl } from "./page-markdown";

const pages = source.getPages();
const fullManual = await docsLlms.full();

describe("page markdown URLs", () => {
  it("suffixes the last slug with .md", () => {
    expect(getPageMarkdownUrl({ slugs: ["installation"] })).toEqual({
      segments: ["installation.md"],
      url: "/docs/installation.md",
    });
  });

  it("names the root page index.md", () => {
    expect(getPageMarkdownUrl({ slugs: [] }).url).toBe("/docs/index.md");
  });

  it("keeps every nested segment", () => {
    expect(getPageMarkdownUrl({ slugs: ["components", "button"] }).url).toBe(
      "/docs/components/button.md",
    );
  });

  it("decodes a nested path back to its slugs", () => {
    expect(decodeMarkdownUrl(["components", "button.md"])).toEqual([
      "components",
      "button",
    ]);
  });

  it("folds index.md back to the root page", () => {
    expect(decodeMarkdownUrl(["index.md"])).toEqual([]);
  });

  it("round-trips every page in the source", () => {
    const wrong = Arr.filter(pages, (page) => {
      const { segments } = getPageMarkdownUrl(page);
      return source.getPage(decodeMarkdownUrl(segments)) !== page;
    });
    expect(wrong.map((page) => page.url)).toEqual([]);
  });

  it("gives every page a distinct Markdown URL", () => {
    const urls = Arr.map(pages, (page) => getPageMarkdownUrl(page).url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("rendered page markdown", () => {
  it("opens with the page title and names its canonical URL", async () => {
    const page = source.getPage(["installation"]);
    expect(page).toBeDefined();
    if (page === undefined) return;
    const markdown = await renderPageMarkdown(page);
    expect(markdown.startsWith("# Installation\n")).toBe(true);
    expect(markdown).toContain(`Source: ${absoluteUrl(page.url)}\n`);
  });

  it("renders authored prose, not the raw MDX frontmatter", async () => {
    const page = source.getPage(["components", "button"]);
    expect(page).toBeDefined();
    if (page === undefined) return;
    const markdown = await renderPageMarkdown(page);
    expect(markdown).toContain("## Usage");
    expect(markdown).not.toContain("---\ntitle:");
  });

  it("serves the same document the full manual carries", async () => {
    const page = source.getPage(["components", "button"]);
    expect(page).toBeDefined();
    if (page === undefined) return;
    const one = await docsLlms.page(page);
    expect(fullManual).toContain(one);
  });

  it("renders a non-empty document for every page", async () => {
    const documents = await Promise.all(
      Arr.map(pages, (page) => renderPageMarkdown(page)),
    );
    const empty = Arr.filter(
      Arr.map(pages, (page, index) => ({ page, document: documents[index] })),
      (entry) => entry.document === undefined || entry.document.length < 200,
    );
    expect(empty.map((entry) => entry.page.url)).toEqual([]);
  });
});
