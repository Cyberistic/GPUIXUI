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

/**
 * The package page template asks every component page for its dependencies
 * (`MISSION.md`, `docs/preview-strategy.md`). The package pages are Markdown
 * the site mounts, so the site reads the component's own module and prints
 * what it imports — this guard holds that reading honest in both directions:
 * every workspace import the module makes is listed, and nothing else is.
 *
 * The page stem names the component (`otp-field` → `OTPField`); the public
 * symbol index resolves it, a page whose stem matches nothing resolves through
 * the part it names in its opening line, a family that publishes no symbol
 * under its own name falls back to the file of the same name, and a family
 * page with neither resolves through the first part its example imports. A page that
 * resolves to no source is reported here rather than rendering no strip in
 * silence.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);
const index = readPageDependencies(root);

/** Every URL the collections serve, so a dependency link is not a 404. */
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
    ...site("apps/docs/content/docs", "/docs"),
    ...packageCollections.flatMap((collection) =>
      readdirSync(join(root, collection.dir))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .map((name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`),
    ),
    // A collection with no `index.mdx` answers at its route with a generated
    // index, so a dependency link may point there.
    ...collectionIndexUrls(),
    "/docs/components",
  ]);
};

/** The workspace specifiers a module quotes, read without the reader's pattern. */
const quotedWorkspaceImports = (text: string): ReadonlySet<string> =>
  new Set(
    [...text.matchAll(/["'](@gpuix(?:ui)?\/[^"']+)["']/g)].flatMap((match) =>
      match[1] === undefined ? [] : [dependencyPackage(match[1]) ?? ""],
    ),
  );

describe("the dependency index", () => {
  it("resolves every mounted package page to the module it documents", () => {
    expect(index.unresolved).toEqual([]);
    expect(Object.keys(index.pages).length).toBeGreaterThanOrEqual(70);
    expect(index.pages["/docs/components/dialog"]?.module).toBe(
      "packages/components/src/dialog.tsx",
    );
    // `Grid` and `Spacer` live in another component's file, so the file stem
    // alone is not enough — the published symbol names the module.
    expect(index.pages["/docs/primitives/grid"]?.module).toBe(
      "packages/primitives/src/components/Stack.tsx",
    );
    // A page whose file name matches neither a published symbol nor a module
    // stem resolves through the part it names in its opening line.
    expect(index.pages["/docs/data-display/expandable-rows"]?.module).toBe(
      "packages/data/src/table/expandable.tsx",
    );
    // A family page names no one subject and matches no stem; the first part
    // its own example imports answers, so the source block shows real code.
    expect(index.pages["/docs/data-display/charts"]?.module).toBe(
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
      index.pages["/docs/components/dialog"]?.dependencies.map(
        (dependency) => dependency.packageName,
      ),
    ).toEqual(["@gpuix/react", "@gpuixui/icons", "@gpuixui/tw"]);
  });

  it("keeps each dependency's subpaths, so a reader sees what is imported", () => {
    const floating = index.pages["/docs/components/dialog"]?.dependencies.find(
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
    expect(packagePage("@gpuixui/tokens")).toBe("/docs/theming");
    expect(
      index.pages["/docs/components/dialog"]?.dependencies.find(
        (dependency) => dependency.packageName === "@gpuixui/icons",
      )?.url,
    ).toBe("/docs/icons/icon");
  });

  it("links every package the site mounts a collection for to that collection", () => {
    // Bug guarded: the map named the four packages whose pages the site writes
    // itself and forgot the six collections mounted since, so a files page
    // printed `@gpuixui/data` as plain text with `/docs/data-display` a click
    // away. The mapping is derived from the collection list, so a new lane is
    // linked without a second edit.
    const unlinked = packageCollections
      .filter((collection) => packagePage(collection.packageName) === undefined)
      .map((collection) => collection.packageName);

    expect(unlinked).toEqual([]);
    expect(packageCollections.length).toBeGreaterThanOrEqual(9);
    // A collection's route documents its package; only the icon set documents
    // itself on a page below the route.
    expect(packagePage("@gpuixui/icons")).toBe("/docs/icons/icon");
    expect(packagePage("@gpuixui/data")).toBe("/docs/data-display");
    expect(packagePage("@gpuixui/media")).toBe("/docs/media");
    expect(
      index.pages["/docs/files/file-tree"]?.dependencies.find(
        (dependency) => dependency.packageName === "@gpuixui/data",
      )?.url,
    ).toBe("/docs/data-display");
  });

  it("leaves a package the site does not document unlinked rather than guessing", () => {
    const [unknown] = collectDependencies(["@gpuixui/unpublished"]);

    expect(unknown?.packageName).toBe("@gpuixui/unpublished");
    expect(unknown?.url).toBeUndefined();
    expect(dependencyPackage("react")).toBeUndefined();
  });

  it("is mounted on both component page frames, so a curated page lists its packages too", () => {
    const view = readFileSync(
      join(root, "apps/docs/src/lib/docs-view.tsx"),
      "utf8",
    );
    const curated = view.slice(
      view.indexOf("function SiteContent"),
      view.indexOf("function PackageContent"),
    );
    const packaged = view.slice(
      view.indexOf("function PackageContent"),
      view.indexOf("function DocsView"),
    );

    expect(curated).toContain("<DependencyStrip url={url} />");
    expect(packaged).toContain("<DependencyStrip url={url} />");
  });

  it("reads a curated page's module from the source block it shows", () => {
    // The page's own `<ComponentSource file>` is what a reader can see, and it
    // can differ from the package page the URL shadows: `button` shows the
    // primitives' action, while the components package's page documents its own
    // wrapper. The dependency list must describe the code on the page.
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
      if (shown === undefined) return [`${page.url}: no source block`];
      return index.pages[page.url]?.module === shown
        ? []
        : [
            `${page.url}: reads ${index.pages[page.url]?.module ?? "nothing"}, shows ${shown}`,
          ];
    });

    expect(mismatched).toEqual([]);
    expect(curated).toHaveLength(39);
    // The two pages the package does not also document at this URL.
    expect(index.pages["/docs/components/button"]?.module).toBe(
      "packages/primitives/src/components/Button.tsx",
    );
    expect(index.pages["/docs/components/table"]?.module).toBe(
      "packages/data/src/table/table.tsx",
    );
  });
});
