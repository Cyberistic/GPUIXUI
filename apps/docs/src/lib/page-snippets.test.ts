import { readdirSync } from "node:fs";
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
 * Every TypeScript snippet this site prints is code a reader copies. The build
 * treats it as prose: a renamed export still renders, and the reader finds out
 * when the import fails.
 *
 * The introduction, getting-started and installation pages had their own guards;
 * the rest of the site's snippets were unchecked. This walks the site's pages
 * and resolves every `@gpuixui/*` import against the package source, so the
 * three page tests can focus on what makes their page unique.
 */

const sitePages = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sitePages(full);
    return entry.name.endsWith(".mdx") ? [full] : [];
  });

const pages = sitePages(join(repoRoot, "apps/docs/content/docs")).map((path) =>
  path.slice(repoRoot.length + 1),
);

interface PageImports {
  readonly page: string;
  readonly imports: ReturnType<typeof namedImports>;
}

const perPage: ReadonlyArray<PageImports> = pages.map((page) => ({
  page,
  imports: namedImports(typescriptSnippets(readRepo(page))),
}));

describe("the site's snippets", () => {
  // The symbol index walks every package and builds a scanner over the source;
  // under a full parallel suite it needs more than the default five seconds.
  it("import only names the packages publish", { timeout: 20_000 }, () => {
    // A silent zero would pass an empty problem list without reading anything.
    const withImports = perPage.filter(({ imports }) => imports.length > 0);
    expect(withImports.length).toBeGreaterThanOrEqual(8);

    const problems = perPage.flatMap(({ imports, page }) =>
      unresolvedImports(imports).map((problem) => `${page}: ${problem}`),
    );

    expect(problems).toEqual([]);
  });
});
