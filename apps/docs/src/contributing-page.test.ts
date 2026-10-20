import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND_ASSETS } from "./lib/site-head";
import { SITE_OUTPUT_ROUTES } from "./lib/site-output";
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

const topSection = (document: string, heading: string): string => {
  const start = document.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = document.indexOf("\n## ", start + heading.length);
  return document.slice(start, next === -1 ? undefined : next);
};

const siteOutput = section(page, "Site output");
const description = page.match(/^description:\s*(.+)$/m)?.[1] ?? "";

const headAssets = [
  BRAND_ASSETS.mark,
  BRAND_ASSETS.favicon,
  BRAND_ASSETS.touchIcon,
  BRAND_ASSETS.socialCard,
] as const;

describe("Contributing — site output", () => {
  it("documents every discovery route, and only its own routes", () => {
    const documented = [...siteOutput.matchAll(/^\| `([^`]+)` \|/gm)].map(
      (match) => match[1],
    );
    expect(documented).toEqual(SITE_OUTPUT_ROUTES.map(({ route }) => route));

    const missing = SITE_OUTPUT_ROUTES.flatMap(({ module }) =>
      existsSync(join(appRoot, module)) ? [] : [`missing module ${module}`],
    );
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

describe("Contributing — continuous integration", () => {
  const continuousIntegration = topSection(page, "Continuous integration");

  it("names the gate commands the workflow will run", () => {
    const missing = ["nub run check", "nub run lint", "nub run test"].filter(
      (command) => !page.includes(command),
    );
    expect(missing).toEqual([]);
    expect(continuousIntegration).toContain("[Gates](#gates)");
  });

  it("states that no workflow is committed", () => {
    expect(continuousIntegration).toContain(
      "No workflow file is committed yet",
    );
    expect(continuousIntegration).toContain("/docs/native-testing");
    expect(continuousIntegration).toMatch(/exits `2`/);
  });
});
