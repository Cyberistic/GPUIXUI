import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageUrl } from "./component-index";
import { examples } from "./examples-data";
import { patternChoices, patterns } from "./patterns";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The patterns page, held to the repository.
 *
 * A pattern is prose about components that live somewhere else, which is the
 * most drift-prone thing on the site: rename a part, move a page and the pattern
 * still reads well while pointing at nothing. The guards below make every
 * reference executable — the page must exist, must actually document the named
 * part, and the example must be a file the registry publishes.
 */

const content = new URL("../../content/docs/", import.meta.url);
const repo = new URL("../../../../", import.meta.url);

/** Every `.mdx` file under a directory, recursively, as URLs. */
const mdxFiles = (dir: URL): ReadonlyArray<URL> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      dir,
    );
    if (entry.isDirectory()) return mdxFiles(child);
    return entry.name.endsWith(".mdx") ? [child] : [];
  });

/** The URL a content page is served at, from its path under `content/docs`. */
const contentUrl = (file: URL): string => {
  const path = file.pathname.split("/content/docs/")[1] ?? "";
  const slug = path.replace(/\.mdx$/, "").replace(/\/index$/, "");
  return slug === "" ? "/docs" : `/docs/${slug}`;
};

/**
 * Every docs page on the site: the site's own pages first, then the ones the
 * packages write. A curated page wins its URL, exactly as `buildIndex` does.
 */
const pages = (): ReadonlyMap<string, string> => {
  const found = new Map<string, string>();
  const packaged = readdirSync(new URL("packages/", repo), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = new URL(`packages/${entry.name}/docs/`, repo);
      return existsSync(dir) ? mdxFiles(dir) : [];
    });

  for (const file of [...packaged, ...mdxFiles(content)]) {
    const relative = file.pathname.slice(repo.pathname.length);
    const url = relative.startsWith("content/")
      ? contentUrl(file)
      : pageUrl(relative);
    if (url !== undefined && !found.has(url)) {
      found.set(url, readFileSync(file, "utf8"));
    }
  }

  return found;
};

const sitePages = pages();

/** A name as a whole word, so `Form` does not match `Format`. */
const mentions = (source: string, name: string): boolean =>
  new RegExp(`\\b${name}\\b`).test(source);

const page = readFileSync(new URL("patterns.mdx", content), "utf8");

describe("the pattern data", () => {
  it("names only parts its page exists and documents", () => {
    const references = [
      ...patterns.flatMap((pattern) =>
        pattern.parts.map((part) => ({ ...part, owner: pattern.id })),
      ),
      ...patternChoices.map((choice) => ({
        ...choice.use,
        owner: choice.need,
      })),
    ];

    const broken = references.filter((reference) => {
      const source = sitePages.get(reference.url);
      return source === undefined || !mentions(source, reference.name);
    });

    expect(
      broken.map((reference) => `${reference.owner}: ${reference.name}`),
    ).toEqual([]);
  });

  it("points every example at a file the registry publishes", () => {
    const published = new Set(examples.map((entry) => entry.file));

    const missing = patterns.filter(
      (pattern) => !published.has(pattern.example),
    );

    expect(missing.map((pattern) => pattern.example)).toEqual([]);
  });

  it("gives every pattern a workflow, not just a list of parts", () => {
    const thin = patterns.filter(
      (pattern) =>
        pattern.parts.length < 2 ||
        pattern.steps.length < 2 ||
        pattern.situation.length === 0 ||
        pattern.state.length === 0 ||
        pattern.prevents.length === 0,
    );

    expect(thin.map((pattern) => pattern.id)).toEqual([]);
  });

  it("uses unique slug ids, so each heading has one anchor", () => {
    const ids = patterns.map((pattern) => pattern.id);

    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual(
      [],
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the patterns page", () => {
  it("has a title and a one-sentence description", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toContain("title: Patterns\n");
    expect(/^description: .+$/m.test(page)).toBe(true);
  });

  it("renders every pattern under its own heading", () => {
    const unruly = patterns.filter(
      (pattern) =>
        !page.includes(`## ${pattern.title}\n\n<Pattern id="${pattern.id}" />`),
    );

    expect(unruly.map((pattern) => pattern.id)).toEqual([]);
  });

  it("mounts the chooser the table is data for", () => {
    expect(page.includes("<PatternChoices />")).toBe(true);
  });

  it("sits in the Composition section of the sidebar", () => {
    const sidebar = sidebarPages(new URL("../../", import.meta.url));
    const position = sidebar.indexOf("patterns");

    expect(position).toBeGreaterThan(sidebar.indexOf("data-display"));
    expect(position).toBeLessThan(sidebar.indexOf("blocks"));
  });

  it("hands off to the block, example and reference pages", () => {
    const links = page.match(/\]\(\/docs\/[a-z0-9/-]+(?:#[a-z-]+)?\)/g) ?? [];

    expect(links.length).toBeGreaterThanOrEqual(3);
  });
});
