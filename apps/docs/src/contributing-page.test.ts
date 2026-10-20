import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND_ASSETS, MANIFEST_PATH } from "./lib/site-head";
import { manifest } from "./lib/site-manifest";

/**
 * The bug guarded (plan 594): the site's discovery routes and generated brand
 * head were documented only in `apps/docs/README.md`, which the page index never
 * sees. `favicon`, `robots`, `llms` and `pwa` returned nothing and `seo`
 * returned the Icons page; Contributing's only mention of any of it was the word
 * "sitemap" inside smoke-check table rows. This guard fails when the page and
 * the real routes, assets or manifest drift apart, or when the frontmatter
 * summary loses the words that make the section a page-level search result.
 *
 * `node:fs`/`node:path` are deliberate, as in `license-page.test.ts` and
 * `content.test.ts`: this is a browser app whose tests read the repository
 * directly, and the Effect runtime must not reach its bundle.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const pagePath = join(appRoot, "content", "docs", "contributing.mdx");
const page = readFileSync(pagePath, "utf8");

const section = (document: string, heading: string): string => {
  const start = document.indexOf(`### ${heading}`);
  if (start === -1) return "";
  const next = document.indexOf("\n### ", start + heading.length);
  return document.slice(start, next === -1 ? undefined : next);
};

const siteOutput = section(page, "Site output");
const description = page.match(/^description:\s*(.+)$/m)?.[1] ?? "";

const routes = [
  ["/sitemap.xml", "src/routes/sitemap[.]xml.ts"],
  ["/robots.txt", "src/routes/robots[.]txt.ts"],
  ["/llms.txt", "src/routes/llms[.]txt.ts"],
  ["/llms-full.txt", "src/routes/llms-full[.]txt.ts"],
  ["/docs/<slug>.md", "src/routes/docs/{$}[.]md.ts"],
  [MANIFEST_PATH, "src/routes/site[.]webmanifest.ts"],
] as const;

const headAssets = [
  BRAND_ASSETS.mark,
  BRAND_ASSETS.favicon,
  BRAND_ASSETS.touchIcon,
  BRAND_ASSETS.socialCard,
] as const;

describe("Contributing — site output", () => {
  it("documents every discovery route that exists", () => {
    const missing = routes.flatMap(([route, module]) => {
      const problems = [
        existsSync(join(appRoot, module)) ? null : `missing module ${module}`,
        siteOutput.includes(`| \`${route}\` |`) ? null : `page omits ${route}`,
      ].filter((problem): problem is string => problem !== null);
      return problems;
    });
    expect(missing).toEqual([]);
  });

  it("names every brand asset the document head links", () => {
    const missing = headAssets.filter((asset) => !siteOutput.includes(asset));
    expect(missing).toEqual([]);
  });

  it("states the install limitation its manifest declares", () => {
    expect(manifest().display).toBe("browser");
    expect(siteOutput).toContain('display: "browser"');
    expect(siteOutput).toMatch(/no service worker/i);
  });

  it("keeps the words that make the section a page-level search result", () => {
    const missing = [
      "sitemap",
      "robots",
      "llms.txt",
      "favicon",
      "SEO",
      "PWA",
    ].filter((word) => !description.includes(word));
    expect(missing).toEqual([]);
  });

  it("points a maintainer at the detail the readers do not need", () => {
    expect(siteOutput).toContain("apps/docs/README.md");
  });
});
