import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectionIndexUrls } from "./collection-index";
import { packageCollections } from "./collection-routes";
import {
  collectDependencies,
  dependencyPackage,
  packagePage,
} from "./page-dependencies";
import {
  readPageDependencies,
  readCuratedPages,
} from "./page-dependencies-source";

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);
const index = readPageDependencies(root);

const mountedPages = (): ReadonlySet<string> => {
  const site = (directory: string, prefix: string): string[] =>
    readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
      (entry) => {
        if (entry.isDirectory())
          return site(`${directory}/${entry.name}`, `${prefix}/${entry.name}`);
        if (!entry.name.endsWith(".mdx")) return [];
        const page = entry.name.replace(/\.mdx$/, "");
        return [page === "index" ? prefix : `${prefix}/${page}`];
      },
    );

  return new Set([
    ...site("apps/docs/content/docs", ""),
    ...packageCollections.flatMap((collection) =>
      readdirSync(join(root, collection.dir))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .map((name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`),
    ),

    ...collectionIndexUrls(),
    "/components",
  ]);
};

const quotedWorkspaceImports = (text: string): ReadonlySet<string> =>
  new Set(
    [...text.matchAll(/["'](@gpuix(?:ui)?\/[^"']+)["']/g)].flatMap((match) =>
      match[1] === undefined ? [] : [dependencyPackage(match[1]) ?? ""],
    ),
  );

describe("the dependency index", () => {
  it("resolves every mounted package page to the module it documents", () => {
    const drawingOnly = new Set(
      readdirSync(join(root, "apps/docs/content/docs/components"))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .filter(
          (name) =>
            !readFileSync(
              join(root, "apps/docs/content/docs/components", name),
              "utf8",
            ).includes("<ComponentSource"),
        )
        .map((name) => `/components/${name.replace(/\.mdx$/, "")}`),
    );
    expect(index.unresolved.filter((url) => !drawingOnly.has(url))).toEqual([]);
    expect(Object.keys(index.pages).length).toBeGreaterThanOrEqual(70);
    expect(index.pages["/components/dialog"]?.module).toBe(
      "packages/components/src/dialog.tsx",
    );

    expect(index.pages["/primitives/grid"]?.module).toBe(
      "packages/primitives/src/components/Stack.tsx",
    );

    expect(index.pages["/data-display/expandable-rows"]?.module).toBe(
      "packages/data/src/table/expandable.tsx",
    );

    expect(index.pages["/graphics/charts/charts"]?.module).toBe(
      "packages/data/src/chart/chart.tsx",
    );
  });

  it("reports every workspace import the module makes, and nothing else", () => {
    const mismatched = Object.entries(index.pages).flatMap(([url, entry]) => {
      const text = readFileSync(join(root, entry.module), "utf8");
      const expected = quotedWorkspaceImports(text);
      const reported = new Set(
        entry.dependencies.map((dependency) => dependency.packageName),
      );
      const missing = [...expected].filter(
        (name) => name !== "" && !reported.has(name),
      );
      const invented = [...reported].filter((name) => !expected.has(name));
      return missing.length === 0 && invented.length === 0
        ? []
        : [
            `${url}: missing ${missing.join(", ") || "—"}; invented ${
              invented.join(", ") || "—"
            }`,
          ];
    });

    expect(mismatched).toEqual([]);
    expect(
      index.pages["/components/dialog"]?.dependencies.map(
        (dependency) => dependency.packageName,
      ),
    ).toEqual(["@gpuix/react", "@gpuixui/icons", "@gpuixui/tw"]);
  });

  it("keeps each dependency's subpaths, so a reader sees what is imported", () => {
    const floating = index.pages["/components/dialog"]?.dependencies.find(
      (dependency) => dependency.packageName === "@gpuix/react",
    );

    expect(floating?.specifiers).toEqual(["", "/floating"]);
  });

  it("links a dependency only to a page the site mounts", () => {
    const mounted = mountedPages();
    const dead = Object.entries(index.pages).flatMap(([url, entry]) =>
      entry.dependencies.flatMap((dependency) =>
        dependency.url !== undefined && !mounted.has(dependency.url)
          ? [`${url}: ${dependency.packageName} → ${dependency.url}`]
          : [],
      ),
    );

    expect(dead).toEqual([]);
    expect(packagePage("@gpuixui/tokens")).toBe("/getting-started");
    expect(
      index.pages["/components/dialog"]?.dependencies.find(
        (dependency) => dependency.packageName === "@gpuixui/icons",
      )?.url,
    ).toBe("/graphics/icons/icon");
  });

  it("links every package the site mounts a collection for to that collection", () => {
    const unlinked = packageCollections
      .filter((collection) => packagePage(collection.packageName) === undefined)
      .map((collection) => collection.packageName);

    expect(unlinked).toEqual([]);
    expect(packageCollections.length).toBeGreaterThanOrEqual(9);

    expect(packagePage("@gpuixui/icons")).toBe("/graphics/icons/icon");
    expect(packagePage("@gpuixui/data")).toBe("/data-display");
    expect(packagePage("@gpuixui/media")).toBe("/media");
    expect(
      index.pages["/files/file-tree"]?.dependencies.find(
        (dependency) => dependency.packageName === "@gpuixui/data",
      )?.url,
    ).toBe("/data-display");
  });

  it("leaves a package the site does not document unlinked rather than guessing", () => {
    const [unknown] = collectDependencies(["@gpuixui/unpublished"]);

    expect(unknown?.packageName).toBe("@gpuixui/unpublished");
    expect(unknown?.url).toBeUndefined();
    expect(dependencyPackage("react")).toBeUndefined();
  });

  it("reads a curated page's module from the source block it shows", () => {
    const curated = readCuratedPages(root);
    const mismatched = curated.flatMap((page) => {
      const name = page.url.slice(page.url.lastIndexOf("/") + 1);
      const markdown = readFileSync(
        join(root, "apps/docs/content/docs/components", `${name}.mdx`),
        "utf8",
      );
      const shown = /<ComponentSource\b[^>]*\bfile="([^"]+)"/.exec(
        markdown,
      )?.[1];
      if (shown === undefined) return [];
      return index.pages[page.url]?.module === shown
        ? []
        : [
            `${page.url}: reads ${index.pages[page.url]?.module ?? "nothing"}, shows ${shown}`,
          ];
    });

    expect(mismatched).toEqual([]);
    expect(curated.length).toBeGreaterThanOrEqual(40);

    expect(index.pages["/components/button"]?.module).toBe(
      "packages/primitives/src/components/Button.tsx",
    );
    expect(index.pages["/components/table"]?.module).toBe(
      "packages/data/src/table/table.tsx",
    );
  });
});
