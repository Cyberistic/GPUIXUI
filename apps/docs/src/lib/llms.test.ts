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

/**
 * `/llms.txt`, the index an agent reads instead of the sidebar.
 *
 * The document is generated, so the failure this guards is not a wrong line —
 * it is a page the generator never saw: a new folder with no section, a
 * collection the route stopped reading, or a curated page whose URL is printed
 * twice because the package page behind it was not deduplicated. The guards
 * below read the same two trees the route reads (the site's `content/docs` and
 * every mounted `packages/<name>/docs`), so "every page is listed" is measured
 * against the disk rather than against a hand-kept list.
 */

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("apps/docs/content/docs/", root);

/** The lines that list a page, as opposed to the document's prose. */
const entries = (text: string): ReadonlyArray<string> =>
  text.split("\n").filter((line) => line.startsWith("- ["));

/** The URL one list line points at. */
const targetOf = (line: string): string | undefined =>
  /\]\((https:\/\/[^)\s]+)\)/.exec(line)?.[1];

describe("the /llms.txt index", () => {
  const site = siteDocsFiles();
  const packaged = packageDocsFiles();
  const text = llmsTxt(site, packaged);
  const listed = entries(text);

  it("lists every page the site serves, once, with its own title and note", () => {
    // Floors: a walk that stopped matching cannot pass on an empty tree.
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
    // `/components/button` is written twice: the site's curated page and
    // the page the package ships. The site serves one page there, so the index
    // must print one line, and the site's copy is the one a reader lands on.
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

    // And the real tree prints that address once, not once per collection.
    expect(
      entries(text).filter((line) => line.includes(absoluteUrl(url))),
    ).toHaveLength(1);
  });

  it("prints the curated page instead of the primitive page it replaces", () => {
    // Five components are documented in the Components section, so the
    // package's second page for the same component must not be listed: an
    // agent reading the index would otherwise learn two addresses for one
    // component and cite the retired one.
    expect(curatedPrimitiveTwins.length).toBeGreaterThan(0);

    // Read whole link targets: `/primitives/button` is a prefix of the
    // real `/primitives/button-group`, so a substring test passes for the
    // wrong reason on two of the five.
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

    // A newline would split the entry, and an unescaped bracket would end the
    // link label early — both are one malformed line an agent cannot parse.
    expect(line).toBe(
      `- [A \\[beta\\]](https://gpuixui.sudokw.com/a): one two three`,
    );
  });

  it("groups the pages the way the sidebar does, in the sidebar's order", () => {
    const samples = [
      "/installation",
      "/components/dialog",
      "/primitives/button",
      "/icons/icon",
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
      "Docs",
      "Components",
      "Primitives",
      "Icons",
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
    // A folder with no rule would file its pages under `Docs` — the right
    // fallback for a root page, and the wrong answer for a lane of its own.
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

    // The order is the precedence: the site's own pages come first, so a
    // curated page wins the URL a package page shares; the indexes a collection
    // route generates follow them. A route that passed only one collection
    // would print half the site.
    expect(route).toMatch(
      /llmsTxt\(\s*\[\.\.\.source\.getPages\(\)\.map\(toPage\),\s*\.\.\.collectionIndexPages\(\)\],\s*packageSources\.flatMap\(/,
    );
    expect(route).toContain("llmsContentType");
    expect(llmsContentType).toBe("text/plain; charset=utf-8");
  });
});
