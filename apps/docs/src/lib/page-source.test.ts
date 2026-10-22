import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPageModules } from "./page-dependencies-source";
import { pageSourceIndex } from "./page-source";
import { pageSources, unresolvedPageSources } from "./page-source-data";

/**
 * `MISSION.md` asks every component page for copyable source. The pages the
 * packages ship are Markdown the site mounts, so the site resolves the module a
 * page documents at build time and prints that file's own text.
 *
 * Before this block existed, a package page showed the component's behaviour,
 * theming and API and never the code a reader would own if they copied it —
 * only the nine curated pages carried a source accordion. The guard holds the
 * generated block in both directions: every package page has a readable module,
 * and the text it prints is the file on disk rather than a second copy.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);

const read = (path: string): string => readFileSync(join(root, path), "utf8");

/** What a page prints, and the file it says it printed. */
const printed = async (
  url: string,
): Promise<{ readonly file: string; readonly source: string }> => {
  const entry = pageSources.sources[url];
  if (entry === undefined) throw new Error(`${url} has no source`);
  return { file: read(entry.module), source: await entry.load() };
};

describe("the source behind a package page", () => {
  it("resolves every package page to a module it can read", () => {
    expect(unresolvedPageSources).toEqual([]);

    const { pages } = readPageModules(root);
    const missing = pages
      .map((page) => page.url)
      .filter((url) => pageSources.sources[url] === undefined);

    expect(missing).toEqual([]);
    // A scan that stopped matching must not pass on an empty index.
    expect(pages.length).toBeGreaterThan(55);
  });

  it("prints the file on disk, not a copy of it", async () => {
    const dialog = await printed("/docs/components/dialog");
    const button = await printed("/docs/primitives/button");

    expect(dialog.file).toContain("export const Dialog =");
    expect(dialog.source).toBe(dialog.file);
    expect(button.file).toContain("export const Button =");
    expect(button.source).toBe(button.file);
  });

  it("reads once, so a re-render does not suspend on a fresh promise", () => {
    const source = pageSources.sources["/docs/primitives/button"];
    expect(source).toBeDefined();
    expect(source?.load()).toBe(source?.load());
  });

  it("reports a module with no loader rather than rendering an empty block", () => {
    const index = pageSourceIndex(
      [
        {
          url: "/docs/components/read",
          module: "packages/components/src/read.tsx",
        },
        {
          url: "/docs/components/lost",
          module: "packages/components/src/lost.tsx",
        },
      ],
      { "packages/components/src/read.tsx": () => Promise.resolve("source") },
    );

    expect(Object.keys(index.sources)).toEqual(["/docs/components/read"]);
    expect(index.unresolved).toEqual(["/docs/components/lost"]);
  });

  it("lists only pages the packages actually ship", () => {
    const shipped = new Set(
      readPageModules(root).pages.map((page) => page.url),
    );
    const invented = Object.keys(pageSources.sources).filter(
      (url) => !shipped.has(url),
    );

    expect(invented).toEqual([]);
  });

  it("names the file it prints instead of a length nobody re-measures", () => {
    // The policy used to say the accordion "prints 9,709 characters of
    // `Switch.tsx`"; the file had grown to 9,943, so a reader was shown a
    // measurement nobody re-ran. The block prints the file whole, so the
    // policy names the file and leaves its length to the file.
    const policy = read("docs/preview-strategy.md");

    expect(policy).not.toMatch(/\d[\d,]* characters of/);
    expect(policy).toContain("prints `Switch.tsx` in full");
    expect(
      read("packages/primitives/src/components/Switch.tsx").length,
    ).toBeGreaterThan(0);
  });

  it("is mounted on the package page frame, after the page it belongs to", () => {
    const view = read("apps/docs/src/lib/docs-view.tsx");
    const frame = view.slice(view.indexOf("function PackageContent"));

    expect(frame).toContain("<PackageSource url={url} />");
    // The curated frame has its own hand-named source; the generated one would
    // print a second accordion with the same file.
    expect(
      view.slice(0, view.indexOf("function PackageContent")),
    ).not.toContain("<PackageSource");
  });
});
