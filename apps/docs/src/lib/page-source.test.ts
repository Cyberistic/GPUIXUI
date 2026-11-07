import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPageModules } from "./page-dependencies-source";
import { pageSourceIndex } from "./page-source";
import { pageSources, unresolvedPageSources } from "./page-source-data";

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);

const read = (path: string): string => readFileSync(join(root, path), "utf8");

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

    expect(pages.length).toBeGreaterThan(55);
  });

  it("prints the file on disk, not a copy of it", async () => {
    const dialog = await printed("/components/dialog");
    const button = await printed("/primitives/button");

    expect(dialog.file).toContain("export const Dialog =");
    expect(dialog.source).toBe(dialog.file);
    expect(button.file).toContain("export const Button =");
    expect(button.source).toBe(button.file);
  });

  it("reads once, so a re-render does not suspend on a fresh promise", () => {
    const source = pageSources.sources["/primitives/button"];
    expect(source).toBeDefined();
    expect(source?.load()).toBe(source?.load());
  });

  it("reports a module with no loader rather than rendering an empty block", () => {
    const index = pageSourceIndex(
      [
        {
          url: "/components/read",
          module: "packages/components/src/read.tsx",
        },
        {
          url: "/components/lost",
          module: "packages/components/src/lost.tsx",
        },
      ],
      { "packages/components/src/read.tsx": () => Promise.resolve("source") },
    );

    expect(Object.keys(index.sources)).toEqual(["/components/read"]);
    expect(index.unresolved).toEqual(["/components/lost"]);
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

    expect(
      view.slice(0, view.indexOf("function PackageContent")),
    ).not.toContain("<PackageSource");
  });
});
