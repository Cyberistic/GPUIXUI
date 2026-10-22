import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import {
  collectDependencies,
  dependencyPackage,
  packagePage,
} from "./page-dependencies";
import { readPageDependencies } from "./page-dependencies-source";

/**
 * The package page template asks every component page for its dependencies
 * (`MISSION.md`, `docs/preview-strategy.md`). The package pages are Markdown
 * the site mounts, so the site reads the component's own module and prints
 * what it imports — this guard holds that reading honest in both directions:
 * every workspace import the module makes is listed, and nothing else is.
 *
 * The page stem names the component (`otp-field` → `OTPField`); the public
 * symbol index resolves it, and a family that publishes no symbol under its own
 * name falls back to the file of the same name. A page that resolves to no
 * source is reported here rather than rendering no strip in silence.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);
const index = readPageDependencies(root);

/** Every URL the four collections serve, so a dependency link is not a 404. */
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

  it("leaves a page that writes its own Dependencies section alone", () => {
    // `tooltip.mdx` is the one package page with a hand-written table; the
    // strip must not print a second, generated one above it.
    const tooltip = readFileSync(
      join(root, "packages/primitives/docs/tooltip.mdx"),
      "utf8",
    );

    expect(tooltip).toMatch(/^## Dependencies$/m);
    expect(index.pages["/docs/primitives/tooltip"]).toBeUndefined();
    expect(index.pages["/docs/primitives/button"]).toBeDefined();
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

  it("leaves a package the site does not document unlinked rather than guessing", () => {
    const [unknown] = collectDependencies(["@gpuixui/unpublished"]);

    expect(unknown?.packageName).toBe("@gpuixui/unpublished");
    expect(unknown?.url).toBeUndefined();
    expect(dependencyPackage("react")).toBeUndefined();
  });

  it("is mounted on the package page frame, not the curated one", () => {
    const view = readFileSync(
      join(root, "apps/docs/src/lib/docs-view.tsx"),
      "utf8",
    );
    const frame = view.indexOf("function PackageContent");
    const strip = view.indexOf("<DependencyStrip");
    const curated = view.indexOf("function SiteContent");

    expect(frame).toBeGreaterThan(-1);
    expect(strip).toBeGreaterThan(frame);
    expect(strip).toBeLessThan(view.indexOf("function DocsView"));
    // The curated page writes its own Dependencies table in MDX.
    expect(view.slice(curated, frame)).not.toContain("<DependencyStrip");
  });
});
