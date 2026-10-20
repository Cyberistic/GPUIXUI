import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { source } from "@/lib/source";

/**
 * The bug guarded (plan 620): the site owned the answers but not the words
 * readers use. `changelog` returned nothing, `release notes` reached the license
 * page, `code of conduct` reached Text variants, `offline` reached Avatar,
 * `environment variables` reached the shadcn porting guide, `command line`
 * reached the Command menu and `faq` reached an Accordion section. Four pages
 * already stated the facts; the alias table never named them.
 *
 * Each claim is checked in both directions: a committed changelog or code of
 * conduct fails until the page names it, deleting the sentence fails the text
 * assertion, a renamed environment variable fails because `site.ts` is read, and
 * an FAQ link to a page the site does not serve fails by URL.
 *
 * `node:fs`/`node:path` are deliberate, as in `license-page.test.ts`,
 * `security-page.test.ts` and `contributing-page.test.ts`: this is a browser app
 * whose tests read the repository directly, and the Effect runtime must not
 * reach its bundle.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const read = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

const introduction = read("apps/docs/content/docs/index.mdx");
const installation = read("apps/docs/content/docs/installation.mdx");
const contributing = read("apps/docs/content/docs/contributing.mdx");
const deployment = read("apps/docs/content/docs/deployment.mdx");
const siteUrlSource = read("apps/docs/src/lib/site.ts");

/** Prose wraps; compare sentences with their line breaks collapsed. */
const prose = (page: string): string => page.replace(/\s+/g, " ");

const committed = (paths: ReadonlyArray<string>): ReadonlyArray<string> =>
  paths.filter((path) => existsSync(join(repoRoot, path)));

const packageDirectories = readdirSync(join(repoRoot, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const CHANGELOGS = committed([
  "CHANGELOG.md",
  ...packageDirectories.map((name) => `packages/${name}/CHANGELOG.md`),
]);

const CODE_OF_CONDUCTS = committed([
  "CODE_OF_CONDUCT.md",
  ".github/CODE_OF_CONDUCT.md",
  "docs/CODE_OF_CONDUCT.md",
]);

/** The top-level section body, from its heading to the next `##` heading. */
const topSection = (document: string, heading: string): string => {
  const start = document.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = document.indexOf("\n## ", start + heading.length);
  return document.slice(start, next === -1 ? undefined : next);
};

const faq = topSection(introduction, "Frequently asked questions");
const faqLinks = [...faq.matchAll(/\]\((\/docs[^)\s]*)\)/g)].map((match) =>
  (match[1] ?? "").replace(/#.*$/, ""),
);
const pageUrls = new Set(source.getPages().map((page) => page.url));

describe("operational vocabulary", () => {
  it("states the changelog absence until a changelog is committed", () => {
    const statesAbsence = prose(installation).includes("no changelog");
    expect(statesAbsence).toBe(CHANGELOGS.length === 0);
    expect(CHANGELOGS.filter((path) => !installation.includes(path))).toEqual(
      [],
    );
  });

  it("states the code-of-conduct absence until one is committed", () => {
    const statesAbsence = prose(contributing).includes(
      "No code of conduct is committed",
    );
    expect(statesAbsence).toBe(CODE_OF_CONDUCTS.length === 0);
    expect(
      CODE_OF_CONDUCTS.filter((path) => !contributing.includes(path)),
    ).toEqual([]);
  });

  it("names the environment variable the site really reads", () => {
    const variable = /\bVITE_[A-Z_]+\b/.exec(siteUrlSource)?.[0] ?? "";
    expect(variable).toBe("VITE_SITE_URL");
    expect(deployment).toContain(variable);
  });

  it("links every FAQ answer to a page the site serves", () => {
    expect(faqLinks.length).toBeGreaterThan(4);
    expect(faqLinks.filter((url) => !pageUrls.has(url))).toEqual([]);
  });

  it("places each new section before the part of the page that follows it", () => {
    expect(contributing.indexOf("## Code of conduct")).toBeGreaterThan(-1);
    expect(contributing.indexOf("## Code of conduct")).toBeLessThan(
      contributing.indexOf("## Gates"),
    );
    expect(installation.indexOf("## Releases and versioning")).toBeGreaterThan(
      -1,
    );
    expect(installation.indexOf("## Releases and versioning")).toBeLessThan(
      installation.indexOf("## The intended install"),
    );
  });
});
