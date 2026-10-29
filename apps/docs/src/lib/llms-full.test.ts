import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curatedPrimitiveTwins, servedPages } from "./curated-twins";
import {
  packageDocsFiles,
  siteDocsFiles,
  type DocsFile,
} from "./docs-pages.test-util";
import { llmsContentType, llmsFullPath, llmsTxt, type LlmsPage } from "./llms";
import { llmsFullTxt, type LlmsFullPage } from "./llms-full";
import { absoluteUrl } from "./site";

/**
 * `/llms-full.txt`, every page as Markdown in one response.
 *
 * `/llms.txt` is the map and `/llms-full.txt` is the territory, so the failure
 * this guards is a document that is not the site: a page the route stopped
 * reading, a body dropped because the page's collection lost
 * `includeProcessedMarkdown`, a duplicated address, frontmatter printed as
 * prose, or an order that puts a page somewhere the map does not. The guards
 * read both trees on disk, so a page added anywhere reaches the suite in the
 * same commit.
 */

const root = new URL("../../../../", import.meta.url);

/** One page's block, as the document prints it. */
interface Block {
  readonly title: string;
  readonly url: string;
  readonly text: string;
}

const blocks = (text: string): ReadonlyArray<Block> => {
  const starts = [...text.matchAll(/^# (.+)\n\n^Source: (.+)$/gm)];

  return starts.map((match, index) => ({
    title: (match[1] ?? "").trim(),
    url: (match[2] ?? "").trim(),
    // A page may carry a horizontal rule of its own, so the block ends where
    // the next page's heading begins; the separator between them is not prose.
    text: text
      .slice(match.index, starts[index + 1]?.index ?? text.length)
      .replace(/\n\n---\n\n$/, "")
      .trimEnd(),
  }));
};

const page = (
  url: string,
  title: string,
  markdown: string,
  description?: string,
): LlmsFullPage => ({ url, title, markdown, description });

const site = siteDocsFiles();
const packaged = packageDocsFiles();
const document = llmsFullTxt(site, packaged);
const printed = blocks(document);

describe("the /llms-full.txt document", () => {
  it("prints every page the site serves once, under its own title and address", () => {
    // Floors: a walk that stopped matching cannot pass on a near-empty tree.
    expect(site.length).toBeGreaterThan(20);
    expect(packaged.length).toBeGreaterThan(100);

    const expected = [...site, ...servedPages(packaged)].reduce(
      (pages, entry) =>
        pages.has(entry.url) ? pages : pages.set(entry.url, entry),
      new Map<string, DocsFile>(),
    );

    expect(printed).toHaveLength(expected.size);
    expect(
      [...expected.values()].filter((expectedPage) => {
        const found = printed.filter(
          (entry) => entry.url === absoluteUrl(expectedPage.url),
        );
        return (
          found.length !== 1 ||
          found[0]?.title !== expectedPage.title ||
          // One page body per address: the prose the page writes follows its
          // `Source:` line, or the document is a list of headings.
          !found[0].text.includes(
            expectedPage.markdown.trim().split("\n")[0] ?? "",
          )
        );
      }),
    ).toEqual([]);
  });

  it("orders the pages the way the index orders them", () => {
    const indexed = llmsTxt(site, packaged)
      .split("\n")
      .filter((line) => line.startsWith("- ["))
      .flatMap((line) => /\]\((https:\/\/[^)\s]+)\)/.exec(line)?.[1] ?? []);

    expect(indexed.length).toBeGreaterThan(100);
    expect(printed.map((entry) => entry.url)).toEqual(indexed);
  });

  it("keeps the curated page in place of the package page it shadows", () => {
    // The site serves the curated page at `/components/button`; the
    // package ships a second page at the same address, and the document must
    // print the copy a reader lands on.
    const curated = page(
      "/components/button",
      "Button",
      "## Usage\n\nThe site's page.",
      "The site's page",
    );
    const shadowed = page(
      "/components/button",
      "Package button",
      "## Usage\n\nThe package's copy.",
      "The package's copy",
    );
    const printedCopy = blocks(llmsFullTxt([curated], [shadowed]));

    expect(printedCopy).toHaveLength(1);
    expect(printedCopy[0]?.text).toContain("The site's page.");
    expect(printedCopy[0]?.text).not.toContain("The package's copy");
  });

  it("prints the curated page instead of the primitive page it replaces", () => {
    expect(curatedPrimitiveTwins.length).toBeGreaterThan(0);

    const urls = printed.map((entry) => entry.url);
    expect(
      curatedPrimitiveTwins.flatMap((twin) =>
        urls.includes(absoluteUrl(twin.curated)) &&
        !urls.includes(absoluteUrl(twin.retired))
          ? []
          : [twin.retired],
      ),
    ).toEqual([]);
  });

  it("takes the frontmatter off a body that still carries it", () => {
    // A page whose collection lost `includeProcessedMarkdown` hands over the
    // file as written. The title belongs to the block's heading, so a second
    // `title:` line teaches an agent the same thing twice.
    const block = blocks(
      llmsFullTxt(
        [
          page(
            "/a",
            "A",
            "---\ntitle: A\ndescription: A page.\n---\n\n## Usage\n\nThe body.",
          ),
        ],
        [],
      ),
    )[0];

    expect(block?.text).toContain("## Usage\n\nThe body.");
    expect(block?.text).not.toContain("title: A");
    expect(block?.text).not.toContain("description: A page.");
  });

  it("prints no blank block for a page with no body", () => {
    const single = llmsFullTxt([page("/a", "A", "   \n\n", "The note.")], []);
    const block = blocks(single)[0];

    expect(block?.text).toBe(
      ["# A", "", `Source: ${absoluteUrl("/a")}`, "", "The note."].join("\n"),
    );
    // A body that is absent must not leave the separator's blank line doubled.
    expect(single).not.toContain("\n\n\n");
  });

  it("keeps every page's own headings, so an agent can cite a section", () => {
    const block = printed.find((entry) => entry.url.endsWith("/media/qr-code"));

    expect(block).toBeDefined();
    expect(block?.text).toMatch(/^## /m);
  });

  it("leaves the page title as the document's only level-one heading", () => {
    // A page body that opens its own `#` would read as a second document inside
    // this one, and the block parser above would find the wrong title. A `#`
    // inside a fenced block is a shell comment, not a heading.
    const h1OutsideFences = (markdown: string): boolean => {
      let fenced = false;
      return markdown.split("\n").some((line) => {
        if (line.trimStart().startsWith("```")) {
          fenced = !fenced;
          return false;
        }
        return !fenced && line.startsWith("# ");
      });
    };

    expect(site.length + packaged.length).toBeGreaterThan(100);
    expect(
      [...site, ...packaged]
        .filter((entry) => h1OutsideFences(entry.markdown))
        .map((entry) => entry.url),
    ).toEqual([]);
  });

  it("is served from the route that reads both collections", () => {
    const route = readFileSync(
      new URL("apps/docs/src/routes/llms-full[.]txt.ts", root),
      "utf8",
    );

    // The order is the precedence: the site's pages first, so a curated page
    // wins the address it shares; then every mounted package collection. The
    // page text comes from the collection entry that owns it — the sidebar
    // loader hands over a page's frontmatter, so the body is read from the
    // collection's `getText("processed")`, the same string the "Copy page"
    // action hands a reader.
    expect(route).toMatch(
      /llmsFullTxt\(\s*await sitePages\(\),\s*\[\s*\.\.\.\(await packagedPages\(\)\),/,
    );
    expect(route).toContain('getText("processed")');
    expect(route).toContain("docsByOrigin[origin].getPage(path)");
    expect(route).toContain("llmsContentType");
    expect(llmsContentType).toBe("text/plain; charset=utf-8");
    expect(llmsFullPath).toBe("/llms-full.txt");
  });

  it("is named by the index and by the reference page", () => {
    const index: LlmsPage[] = [{ url: "/a", title: "A" }];

    expect(llmsTxt(index, [])).toContain(absoluteUrl(llmsFullPath));

    const reference = readFileSync(
      new URL("apps/docs/content/docs/reference.mdx", root),
      "utf8",
    );
    expect(reference).toContain(llmsFullPath);
  });
});
