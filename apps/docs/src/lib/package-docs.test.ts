import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections, packageSections } from "./collection-routes";

/**
 * The package-owned documentation the site mounts.
 *
 * Three defects are silent in a package and fatal on the site, so each is
 * guarded here rather than remembered:
 *
 *   1. a docs directory that no collection mounts, whose pages then simply do
 *      not exist for a reader;
 *   2. a frontmatter value a YAML parser rejects (`description: `@name` …`), or
 *      a raw `<tag>` in prose, which MDX reads as JSX — one file fails the whole
 *      collection at build time;
 *   3. two collections claiming one URL, where the second page is shadowed.
 *
 * The primitives index is also held to the pages the package ships, so adding a
 * page without linking it fails here.
 */

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("content/docs/", new URL("apps/docs/", root));

const mdxFiles = (dir: URL): ReadonlyArray<string> =>
  existsSync(dir)
    ? readdirSync(dir).filter((name) => name.endsWith(".mdx"))
    : [];

const read = (dir: URL, name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

/** Every `.mdx` under `content/docs`, as a URL path (`/docs/foo/bar`). */
const sitePages = (dir: URL, slugs: ReadonlyArray<string> = []): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return sitePages(new URL(`${entry.name}/`, dir), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];
    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [`/docs${path.length === 0 ? "" : `/${path.join("/")}`}`];
  });

/** A plain YAML scalar may not begin with one of these. */
const YAML_RESERVED = /^[`@*&[\]{}>|%#]/;

const frontmatter = (source: string): string => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  return match?.[1] ?? "";
};

/** The prose of a page: no frontmatter, no fenced blocks, no inline code. */
const prose = (source: string): string =>
  source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "");

describe("the package docs collections", () => {
  it("mount every package directory that ships pages", () => {
    const shipped = readdirSync(new URL("packages/", root), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) =>
        existsSync(new URL(`packages/${entry.name}/docs/`, root))
          ? [`packages/${entry.name}/docs`]
          : [],
      );

    expect(shipped.length).toBeGreaterThan(0);
    expect(packageCollections.map((collection) => collection.dir)).toEqual(
      expect.arrayContaining(shipped),
    );
  });

  it("claim one route each, under /docs", () => {
    const routes = packageCollections.map((collection) => collection.route);

    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.every((route) => route.startsWith("/docs/"))).toBe(true);
  });

  it("fill a section that the site defines", () => {
    const sections = new Set(packageSections.map((section) => section.name));

    expect(
      packageCollections.filter(
        (collection) => !sections.has(collection.section),
      ),
    ).toEqual([]);
    // A collection whose package has not shipped a page yet is not empty: it
    // is not written yet. A directory that exists and holds no page is.
    expect(
      packageCollections.flatMap((collection) =>
        existsSync(new URL(`${collection.dir}/`, root)) &&
        collectionPages(root, collection).length === 0
          ? [collection.dir]
          : [],
      ),
    ).toEqual([]);
  });

  it("name every mounted collection in the policy's table", () => {
    // `docs/preview-strategy.md`'s table is what an author reads before
    // mounting a docs directory, so it is the mount list's other copy: a
    // collection the site mounts and the table omits leaves the policy
    // describing three of four sections, and a row no collection backs sends a
    // reader looking for a route that does not exist.
    const policy = readFileSync(
      new URL("docs/preview-strategy.md", root),
      "utf8",
    );
    const start = policy.indexOf("### Pages the package writes");
    const end = policy.indexOf("### The dependency line", start);
    const documented = policy
      .slice(start, end)
      .split("\n")
      .filter((line) => line.startsWith("| ") && line.includes("`packages/"))
      .map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim())
          .slice(1, -1),
      )
      .flatMap(([, dir, route, section]) =>
        dir === undefined || route === undefined || section === undefined
          ? []
          : [
              `${dir.replaceAll("`", "")} ${route.replaceAll("`", "")} ${section}`,
            ],
      )
      .toSorted();

    expect(documented).toEqual(
      packageCollections
        .map(
          (collection) =>
            `${collection.dir} ${collection.route} ${collection.section}`,
        )
        .toSorted(),
    );
  });

  /**
   * The curated pages the site writes in place of the package's page. The site
   * goes deeper on these and owns their URL, so the package file is shadowed by
   * design — and the list must stay true in both directions.
   */
  const curated = new Set([
    "/docs/components/accordion",
    "/docs/components/alert",
    "/docs/components/avatar",
    "/docs/components/breadcrumb",
    "/docs/components/card",
    "/docs/components/carousel",
    "/docs/components/collapsible",
    "/docs/components/color-picker",
    "/docs/components/combobox",
    "/docs/components/command-menu",
    "/docs/components/confirm-dialog",
    "/docs/components/context-menu",
    "/docs/components/date-picker",
    "/docs/components/dialog",
    "/docs/components/drawer",
    "/docs/components/dropdown-menu",
    "/docs/components/field",
    "/docs/components/form",
    "/docs/components/inline-edit",
    "/docs/components/list",
    "/docs/components/pagination",
    "/docs/components/popover",
    "/docs/components/search-input",
    "/docs/components/stepper",
    "/docs/components/tag-input",
    "/docs/components/tabs",
    "/docs/components/time-picker",
    "/docs/components/timeline",
    "/docs/components/toast",
  ]);

  it("never shadow a page outside the curated overrides", () => {
    const taken = new Set(sitePages(docsDir));
    const shadows = packageCollections.flatMap((collection) =>
      mdxFiles(new URL(`${collection.dir}/`, root)).flatMap((name) => {
        const url = `${collection.route}/${name.replace(/\.mdx$/, "")}`;
        return taken.has(url) ? [url] : [];
      }),
    );

    expect(shadows.toSorted()).toEqual([...curated].toSorted());
  });

  it.each(packageCollections)(
    "$dir compiles as MDX: quoted frontmatter, no raw tags in prose",
    (collection) => {
      const dir = new URL(`${collection.dir}/`, root);
      const files = mdxFiles(dir);

      // A collection whose package has not shipped its pages yet has nothing
      // to compile; the case that mounts it is the one below.
      if (!existsSync(dir)) return;

      expect(files.length).toBeGreaterThan(0);

      const bad = files.flatMap((name) => {
        const source = read(dir, name);
        const head = frontmatter(source);

        const missing =
          /^title: .+/m.test(head) && /^description: .+/m.test(head)
            ? []
            : [`${name}: no title or description`];

        const unquoted = head.split("\n").flatMap((line) => {
          const [, value = ""] = /^[a-z]+:\s*(.*)$/.exec(line) ?? [];
          const quoted = value.startsWith('"') || value.startsWith("'");
          return YAML_RESERVED.test(value) && !quoted
            ? [`${name}: ${value}`]
            : [];
        });

        const jsx = prose(source)
          .split("\n")
          .filter((line) => /<[A-Za-z/]/.test(line))
          .map((line) => `${name}: ${line.trim()}`);

        return [...missing, ...unquoted, ...jsx];
      });

      expect(bad).toEqual([]);
    },
  );

  it("list every primitive the package ships on the section index", () => {
    const index = read(new URL("primitives/", docsDir), "index.mdx");
    const linked = new Set(
      [...index.matchAll(/\]\((\/docs\/[a-z0-9/-]+)\)/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    );

    const unlinked = packageCollections
      .filter((collection) => collection.section === "Primitives")
      .flatMap((collection) =>
        mdxFiles(new URL(`${collection.dir}/`, root)).flatMap((name) => {
          const url = `${collection.route}/${name.replace(/\.mdx$/, "")}`;
          return linked.has(url) ? [] : [url];
        }),
      );

    expect(unlinked).toEqual([]);
  });
});
