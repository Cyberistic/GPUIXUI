import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  cloudflareLimits,
  docsWorker,
  jsoncString,
  jsoncStringArray,
} from "./deployment";
import { source } from "./source";

/**
 * Guards plan 609: the Deployment page states the Worker this repository
 * really declares and the budgets Cloudflare really enforces.
 *
 * The bug being guarded is a deploy page that drifts from the stack it
 * describes — a renamed Worker, a moved app root or a relaxed budget leaves a
 * reader with instructions that no longer match the artifact. The account
 * deploy stays unverified, so the page must say so rather than imply a
 * deployment happened.
 *
 * `node:fs` is deliberate: `apps/docs` has no Effect runtime and its bundle must
 * not import `effect` (`architecture.test.ts`); every docs content guard reads
 * repository files the same way (`installation-page.test.ts`). The measured
 * wasm and file count are the deploy smoke's job, because `dist/` is a build
 * artifact and a unit test must not require one.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const read = (fromApp: string): string =>
  readFileSync(join(appRoot, fromApp), "utf8");
const readRepo = (fromRoot: string): string =>
  readFileSync(join(repoRoot, fromRoot), "utf8");

const pagePath = "content/docs/deployment.mdx";
const page = read(pagePath);
/** Prose is wrapped at 80 columns: compare sentences, not line breaks. */
const prose = page.replace(/\s+/g, " ");

const section = (title: string): string => {
  const start = page.indexOf(`## ${title}\n`);
  if (start === -1) return "";
  const rest = page.slice(start + title.length + 4);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
};

const sections = [
  "What deploys",
  "Build",
  "Verify the artifact without an account",
  "The asset budget",
  "Custom domain and canonical URLs",
  "What is verified, and what is not",
  "Shipping an app built with GPUIXUI",
  "Related",
] as const;

const stack = readRepo("packages/deploy/alchemy.run.docs.ts");
const wrangler = read("wrangler.jsonc");
const site = read("src/lib/site.ts");
const manifest: unknown = JSON.parse(read("package.json"));
const meta: unknown = JSON.parse(read("content/docs/meta.json"));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const scripts =
  isRecord(manifest) && isRecord(manifest.scripts) ? manifest.scripts : {};
const sidebar =
  isRecord(meta) && Array.isArray(meta.pages)
    ? meta.pages.filter((item): item is string => typeof item === "string")
    : [];

/** The first capture of a TypeScript fact in the Alchemy stack. */
const stackFact = (pattern: RegExp): string => pattern.exec(stack)?.[1] ?? "";

const stackName = stackFact(/name:\s*"([^"]+)"/);
const stackDomain = stackFact(/const DOCS_DOMAIN = "([^"]+)"/);
const stackRoot = stackFact(/rootDir:\s*"([^"]+)"/);

const siteOrigin = /const DEFAULT_SITE_URL = "([^"]+)"/.exec(site)?.[1] ?? "";

const pages = source.getPages().map((entry) => entry.url);
const pageTitles = new Map(
  source.getPages().map((entry) => [entry.url, entry.data.title]),
);

const headingId = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const headingIds = (fromApp: string): ReadonlyArray<string> =>
  (read(fromApp).match(/^## .+$/gm) ?? []).map((line) =>
    headingId(line.slice(3)),
  );

const contentFile = (url: string): string =>
  `content/docs/${url.replace(/^\/docs\//, "")}.mdx`;

const linkProblems = (): ReadonlyArray<string> =>
  [...page.matchAll(/\]\((\/docs\/[^)\s]+)\)/g)].flatMap((match) => {
    const href = match[1];
    if (href === undefined) return [];
    const hash = href.indexOf("#");
    const url = hash === -1 ? href : href.slice(0, hash);
    const fragment = hash === -1 ? "" : href.slice(hash + 1);
    const file = contentFile(url);
    if (!pages.includes(url) || !existsSync(join(appRoot, file))) {
      return [`${href} names a page that is not served`];
    }
    return fragment === "" || headingIds(file).includes(fragment)
      ? []
      : [`${href} names a fragment ${url} does not render`];
  });

describe("Deployment page", () => {
  it("is served, titled and ordered in the sidebar", () => {
    expect(pageTitles.get("/docs/deployment")).toBe("Deployment and hosting");
    expect(sidebar.indexOf("deployment")).toBe(
      sidebar.indexOf("contributing") + 1,
    );
  });

  it("carries every section, once", () => {
    const missing = sections.filter(
      (title) => page.split(`## ${title}\n`).length !== 2,
    );
    expect(missing).toEqual([]);
  });

  it("states the Worker the deploy stack really declares", () => {
    expect(docsWorker).toEqual({
      name: stackName,
      domain: stackDomain,
      rootDir: stackRoot,
    });

    const missing = [
      docsWorker.name,
      docsWorker.domain,
      docsWorker.rootDir,
      "packages/deploy/alchemy.run.docs.ts",
    ]
      .map((fact) => `\`${fact}\``)
      .filter((fact) => !prose.includes(fact));
    expect(missing).toEqual([]);
  });

  it("states the compatibility facts wrangler.jsonc really declares", () => {
    const declared = [
      jsoncString(wrangler, "compatibility_date") ?? "",
      ...jsoncStringArray(wrangler, "compatibility_flags"),
      jsoncString(wrangler, "main") ?? "",
    ];
    expect(declared.filter((fact) => fact === "")).toEqual([]);

    const missing = declared
      .map((fact) => `\`${fact}\``)
      .filter((fact) => !prose.includes(fact));
    expect(missing).toEqual([]);
  });

  it("defaults the canonical origin to the Worker's domain", () => {
    expect(siteOrigin).toBe(`https://${docsWorker.domain}`);
    expect(prose).toContain("VITE_SITE_URL");
  });

  it("states Cloudflare's real budget, not a remembered one", () => {
    expect(cloudflareLimits).toEqual({
      bytesPerAsset: 25 * 1024 * 1024,
      assetsPerVersion: 20_000,
      workerBytes: 64 * 1024 * 1024,
    });
    const missing = ["25 MiB", "20,000", "64 MiB"].filter(
      (value) => !prose.includes(value),
    );
    expect(missing).toEqual([]);
  });

  it("names the deploy check and its exit contract", () => {
    expect(scripts["smoke:deploy"]).toBe("nub scripts/smoke-deploy.ts");
    expect(existsSync(join(appRoot, "scripts/smoke-deploy.ts"))).toBe(true);
    expect(prose).toContain("nub run --filter docs smoke:deploy");
    expect(prose).toContain("`2` is never a pass");
  });

  it("does not claim the account deploy is verified", () => {
    const notVerified = section("What is verified, and what is not");
    expect(notVerified).toContain("Cloudflare credentials");
    expect(notVerified).toContain("/gpuix-preview/");
    expect(page).not.toMatch(
      /has been deployed|is deployed|deployed successfully|deploys automatically/i,
    );
  });

  it("links only pages and headings that exist", () => {
    expect(linkProblems()).toEqual([]);
  });
});
