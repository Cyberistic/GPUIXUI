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

const mdxPages = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return mdxPages(full);
    return entry.name.endsWith(".mdx") ? [full] : [];
  });

const packageDocs = readdirSync(join(repoRoot, "packages"), {
  withFileTypes: true,
}).flatMap((entry) => {
  if (!entry.isDirectory()) return [];
  const dir = join(repoRoot, "packages", entry.name, "docs");
  return existsSync(dir) ? [dir] : [];
});

const pages = [join(repoRoot, "apps/docs/content/docs"), ...packageDocs]
  .flatMap(mdxPages)
  .map((path) => path.slice(repoRoot.length + 1));

const siteDir = "apps/docs/content/docs";
const packageDirs = packageDocs.map((dir) =>
  dir.slice(repoRoot.length + 1).replaceAll("\\", "/"),
);

interface PageImports {
  readonly page: string;
  readonly imports: ReturnType<typeof namedImports>;
}

const perPage: ReadonlyArray<PageImports> = pages.map((page) => ({
  page,
  imports: namedImports(typescriptSnippets(readRepo(page))),
}));

const findings: ReadonlyArray<string> = perPage.flatMap(({ imports, page }) =>
  unresolvedImports(imports).map((problem) => `${page}: ${problem}`),
);

describe("the site's snippets", () => {
  it("import only names the packages publish", { timeout: 20_000 }, () => {
    expect(pages.length).toBeGreaterThanOrEqual(90);
    const withImports = perPage.filter(({ imports }) => imports.length > 0);
    expect(withImports.length).toBeGreaterThanOrEqual(60);

    expect(findings).toEqual([]);
  });

  it("reads the site's own pages and every package collection", () => {
    expect(
      pages.filter((page) => page.startsWith(`${siteDir}/`)).length,
    ).toBeGreaterThanOrEqual(40);
    expect(packageDirs.length).toBeGreaterThanOrEqual(8);
    expect(
      packageDirs.filter(
        (dir) => !pages.some((page) => page.startsWith(`${dir}/`)),
      ),
    ).toEqual([]);
  });
});

describe("the snippet parse", () => {
  it("reads a plain TypeScript fence, not only a tsx one", () => {
    const page = '```ts\nimport { Icon } from "@gpuixui/primitives";\n```\n';

    expect(unresolvedImports(namedImports(typescriptSnippets(page)))).toEqual([
      "@gpuixui/primitives does not export Icon",
    ]);
  });

  it("passes a name its package does publish", () => {
    const page = '```ts\nimport { Button } from "@gpuixui/primitives";\n```\n';

    expect(unresolvedImports(namedImports(typescriptSnippets(page)))).toEqual(
      [],
    );
  });
});
