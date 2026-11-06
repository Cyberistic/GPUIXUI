import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import { curatedPrimitiveTwins, servedPages } from "./curated-twins";
import { packageDocsFiles, siteDocsFiles } from "./docs-pages.test-util";
import {
  llmsContentType,
  llmsSectionOrder,
  llmsTxt,
  sectionFor,
  type LlmsPage,
} from "./llms";
import { absoluteUrl } from "./site";

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("apps/docs/content/docs/", root);

const entries = (text: string): ReadonlyArray<string> =>
  text.split("\n").filter((line) => line.startsWith("- ["));

const targetOf = (line: string): string | undefined =>
  /\]\((https:\/\/[^)\s]+)\)/.exec(line)?.[1];

describe("the /llms.txt index", () => {
  const site = siteDocsFiles();
  const packaged = packageDocsFiles();
  const text = llmsTxt(site, packaged);
  const listed = entries(text);

  it("lists every page the site serves, once, with its own title and note", () => {
    expect(site.length).toBeGreaterThan(20);
    expect(packaged.length).toBeGreaterThan(100);

    const expected = [...site, ...servedPages(packaged)].reduce(
      (pages, page) =>
        pages.has(page.url) ? pages : pages.set(page.url, page),
      new Map<string, LlmsPage>(),
    );

    expect(listed).toHaveLength(expected.size);
    expect(
      [...expected.values()].filter((page) => {
        const line = listed.find(
          (entry) => targetOf(entry) === absoluteUrl(page.url),
        );
        if (line === undefined) return true;
        return (
          !line.includes(page.title) ||
          (page.description !== undefined && !line.includes(page.description))
        );
      }),
    ).toEqual([]);
  });

  it("lets the curated page win the address it shares with a package page", () => {
    const url = "/components/button";
    const curated: LlmsPage = {
      url,
      title: "Button",
      description: "The site's page",
    };
    const packagedCopy: LlmsPage = {
      url,
      title: "Button",
      description: "The package's page",
    };
    const lines = entries(llmsTxt([curated], [packagedCopy]));

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("The site's page");
    expect(lines[0]).not.toContain("The package's page");

    expect(
      entries(text).filter((line) => line.includes(absoluteUrl(url))),
    ).toHaveLength(1);
  });

  it("prints the curated page instead of the primitive page it replaces", () => {
    expect(curatedPrimitiveTwins.length).toBeGreaterThan(0);

    const targets = new Set(listed.flatMap((line) => targetOf(line) ?? []));
    const wrong = curatedPrimitiveTwins.flatMap((twin) =>
      targets.has(absoluteUrl(twin.curated)) &&
      !targets.has(absoluteUrl(twin.retired))
        ? []
        : [twin.retired],
    );

    expect(wrong).toEqual([]);
  });

  it("prints a page with no description as a bare link", () => {
    const line = entries(llmsTxt([{ url: "/a", title: "A" }], []))[0];

    expect(line).toBe(`- [A](${absoluteUrl("/a")})`);
  });

  it("keeps one line per entry whatever the frontmatter carries", () => {
    const line = entries(
      llmsTxt(
        [
          {
            url: "/a",
            title: "A [beta]",
            description: "one\ntwo   three",
          },
        ],
        [],
      ),
    )[0];

    expect(line).toBe(
      `- [A \\[beta\\]](https://gpuixui.sudokw.com/a): one two three`,
    );
  });

  it("groups the pages the way the sidebar does, in the sidebar's order", () => {
    const samples = [
      "/getting-started",
      "/components/dialog",
      "/primitives/button",
      "/graphics/icons/icon",
      "/data-display/property-panel",
      "/workspace",
      "/dock/split-pane",
      "/editor/code-editor",
      "/blocks/login",
    ].map((url, index) => ({ url, title: `Page ${index}` }));

    const headings = llmsTxt(samples, [])
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3));

    expect(headings).toEqual([
      "Guide",
      "Components",
      "Primitives",
      "Graphics",
      "Data display",
      "Workspace",
      "Blocks",
    ]);
  });

  it("gives every folder the site writes a section of its own", () => {
    const folders = readdirSync(docsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(folders.length).toBeGreaterThan(5);

    expect(folders.filter((name) => sectionFor(`/${name}`) === "Docs")).toEqual(
      [],
    );
    expect(
      packageCollections
        .map((collection) => collection.section)
        .filter((name) => !llmsSectionOrder.includes(name)),
    ).toEqual([]);
  });

  it("is served from the route that reads both collections", () => {
    const route = readFileSync(
      new URL("apps/docs/src/routes/llms[.]txt.ts", root),
      "utf8",
    );

    expect(route).toMatch(
      /llmsTxt\(\s*\[\.\.\.source\.getPages\(\)\.map\(toPage\),\s*\.\.\.collectionIndexPages\(\)\],\s*packageSources\.flatMap\(/,
    );
    expect(route).toContain("llmsContentType");
    expect(llmsContentType).toBe("text/plain; charset=utf-8");
  });
});
