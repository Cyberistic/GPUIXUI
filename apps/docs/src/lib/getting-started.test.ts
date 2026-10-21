import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * The getting-started page is the one page a reader copies from, so its code
 * has to be the library's code.
 *
 * Every snippet is prose as far as the build is concerned: a renamed export, a
 * renamed manifest script or an unlisted state value would still render, and
 * the reader would copy something that does not run. This guard reads the page
 * and holds each claim to the workspace: the imports to the symbols the packages
 * publish, the run command to the root manifest, and every `useState` value to
 * the table that says who owns it.
 */

const read = (path: string): string => readRepo(path);

const page = read("apps/docs/content/docs/getting-started.mdx");

/** The page's fenced TypeScript snippets, in reading order. */
const snippets = typescriptSnippets(page);

/** Every named import the page writes. */
const imports = namedImports(snippets);

describe("the getting-started page", () => {
  it("sits in the Getting Started section, directly after Installation", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toMatch(/^title: Getting started$/m);
    expect(page).toMatch(/^description: \S+/m);

    const meta = JSON.parse(read("apps/docs/content/docs/meta.json")) as {
      pages: ReadonlyArray<string>;
    };

    expect(meta.pages.indexOf("getting-started")).toBe(
      meta.pages.indexOf("installation") + 1,
    );
  });

  it("imports only names the packages publish", () => {
    // The parser must see the snippets; a silent zero would pass every check.
    expect(snippets.length).toBeGreaterThanOrEqual(3);
    expect(imports.length).toBeGreaterThanOrEqual(5);
    expect(unresolvedImports(imports)).toEqual([]);
  });

  it("teaches the run command the root manifest declares", () => {
    const { scripts } = JSON.parse(read("package.json")) as {
      scripts: Readonly<Record<string, string>>;
    };

    expect(scripts["dev:playground"]).toBeDefined();
    expect(page).toContain("nub run dev:playground");
  });

  it("gives every state value an owner in the state table", () => {
    const declared = [
      ...snippets.join("\n").matchAll(/const \[(\w+), set\w+\] = useState/g),
    ].map((match) => match[1] ?? "");
    const explained = [
      ...page.matchAll(/^\| `(\w+)` \| `ProjectSettings` \|/gm),
    ].map((match) => match[1] ?? "");

    expect(declared.length).toBeGreaterThan(0);
    expect(new Set(declared)).toEqual(new Set(explained));
  });

  it("links the page each numbered step depends on", () => {
    const steps = page.split(/^## \d+\. /m).slice(1);

    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(
      steps
        .map((step, index) => ({
          index: index + 1,
          hasLink: step.includes("](/docs/"),
        }))
        .filter((step) => !step.hasLink),
    ).toEqual([]);
  });
});
