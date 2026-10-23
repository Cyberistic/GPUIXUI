import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import { repoRoot } from "./public-symbols-source";

/**
 * Every TypeScript snippet the site prints is code a reader copies, and the
 * build treats it as prose: a renamed export still renders, and the reader finds
 * out when the import fails.
 *
 * The introduction, getting-started and installation pages had their own guards
 * while the rest of the site's snippets went unchecked, and the pages the
 * packages ship — the other collections the site mounts — were not read at
 * all. This walks every mounted page and resolves every `@gpuixui/*` import
 * against the package source, so the page tests can focus on what makes their
 * page unique.
 *
 * The walk found one package page whose snippet imported a symbol its package
 * does not publish (`primitives/docs/tooltip.mdx` took `Icon` from
 * `@gpuixui/primitives` instead of `@gpuixui/icons`); the primitives workstream
 * fixed the page, so the record that excused it is gone rather than standing
 * empty.
 */

/** Every MDX file under a directory, as absolute paths. */
const mdxPages = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return mdxPages(full);
    return entry.name.endsWith(".mdx") ? [full] : [];
  });

/** Every `packages/<pkg>/docs` directory the site mounts. */
const packageDocs = readdirSync(join(repoRoot, "packages"), {
  withFileTypes: true,
}).flatMap((entry) => {
  if (!entry.isDirectory()) return [];
  const dir = join(repoRoot, "packages", entry.name, "docs");
  return existsSync(dir) ? [dir] : [];
});

/** The site's own pages, then each package's, as repository-relative paths. */
const pages = [join(repoRoot, "apps/docs/content/docs"), ...packageDocs]
  .flatMap(mdxPages)
  .map((path) => path.slice(repoRoot.length + 1));

interface PageImports {
  readonly page: string;
  readonly imports: ReturnType<typeof namedImports>;
}

const perPage: ReadonlyArray<PageImports> = pages.map((page) => ({
  page,
  imports: namedImports(typescriptSnippets(readRepo(page))),
}));

/** `page: problem`, the shape a failure names. */
const findings: ReadonlyArray<string> = perPage.flatMap(({ imports, page }) =>
  unresolvedImports(imports).map((problem) => `${page}: ${problem}`),
);

describe("the site's snippets", () => {
  // The symbol index walks every package and builds a scanner over the source;
  // under a full parallel suite it needs more than the default five seconds.
  it("import only names the packages publish", { timeout: 20_000 }, () => {
    // A silent zero would pass an empty problem list without reading anything:
    // the site's pages plus the 71 the packages ship, and the fences that
    // actually import a workspace package.
    expect(pages.length).toBeGreaterThanOrEqual(90);
    const withImports = perPage.filter(({ imports }) => imports.length > 0);
    expect(withImports.length).toBeGreaterThanOrEqual(60);

    expect(findings).toEqual([]);
  });
});

describe("the snippet parse", () => {
  it("reads a plain TypeScript fence, not only a tsx one", () => {
    // `/docs/runtime` prints its capability calls in a `ts` fence, and the guard
    // read only `tsx` fences, so that import was never resolved.
    const page = '```ts\nimport { Icon } from "@gpuixui/primitives";\n```\n';

    expect(unresolvedImports(namedImports(typescriptSnippets(page)))).toEqual([
      "@gpuixui/primitives does not export Icon",
    ]);
  });

  it("passes a name its package does publish", () => {
    // The other direction: the same fence with a real export is silent, so the
    // case above fails on the name and not on the parse.
    const page = '```ts\nimport { Button } from "@gpuixui/primitives";\n```\n';

    expect(unresolvedImports(namedImports(typescriptSnippets(page)))).toEqual(
      [],
    );
  });
});
