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

/**
 * The mounted set, read out of a document's table.
 *
 * Both the policy and the site ledger list one row per collection; a route cell
 * may carry the `<name>` suffix a page mounts under, which is not part of the
 * collection's root.
 */
const documentedCollections = (
  text: string,
  startHeading: string,
  endHeading: string,
): ReadonlyArray<string> => {
  const start = text.indexOf(startHeading);
  const end = text.indexOf(endHeading, start);
  return text
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("| ") && line.includes("`packages/"))
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .slice(1, -1),
    )
    .flatMap((cells) => {
      // The policy names the lane before the source; the ledger names it after
      // the route. The package dir is the one cell both tables share.
      const at = cells.findIndex((cell) => cell.includes("`packages/"));
      const dir = cells[at];
      const route = cells[at + 1];
      const section = cells.at(-1);
      return dir === undefined || route === undefined || section === undefined
        ? []
        : [
            `${dir.replaceAll("`", "")} ${route
              .replaceAll("`", "")
              .replace(/\/<name>$/, "")} ${section}`,
          ];
    })
    .toSorted();
};

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

  it("name every mounted collection in the policy's and the ledger's tables", () => {
    // `docs/preview-strategy.md`'s table is what an author reads before
    // mounting a docs directory, and `apps/docs/README.md`'s table is the
    // ledger's copy of the same set: a collection the site mounts and a table
    // omits leaves a reader describing three of four sections, and a row no
    // collection backs sends them looking for a route that does not exist.
    const policy = readFileSync(
      new URL("docs/preview-strategy.md", root),
      "utf8",
    );
    const ledger = readFileSync(new URL("apps/docs/README.md", root), "utf8");
    const mounted = packageCollections
      .map(
        (collection) =>
          `${collection.dir} ${collection.route} ${collection.section}`,
      )
      .toSorted();

    expect(
      documentedCollections(
        policy,
        "### Pages the package writes",
        "### The dependency line",
      ),
    ).toEqual(mounted);
    expect(
      documentedCollections(
        ledger,
        "## The mounted collections",
        "## Preview honesty",
      ),
    ).toEqual(mounted);
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
    "/docs/components/badge",
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
    "/docs/components/empty-state",
    "/docs/components/field",
    "/docs/components/form",
    "/docs/components/inline-edit",
    "/docs/components/list",
    "/docs/components/navigation-menu",
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
          .filter(
            (line) =>
              /<[A-Za-z/]/.test(line) && !line.includes("<ComponentPreview"),
          )
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

  it("prints the icon count the set ships, not the one it shipped before", () => {
    // The section index called the set "Forty-seven monochrome icons" while
    // `ICON_NAMES` had grown to 76 — the page links the icon page, whose
    // frontmatter prints the real number, so a reader met two counts for one
    // package. The count is derived from the set's own list, which is the
    // single source `registry.ts` is checked against.
    const names = read(new URL("packages/icons/src/", root), "names.ts");
    const listed = /export const ICON_NAMES = \[([\s\S]*?)\]/.exec(names)?.[1];
    const count = (listed?.match(/^\s*"/gm) ?? []).length;

    expect(count, "the set's name list is empty").toBeGreaterThan(40);

    const index = read(new URL("primitives/", docsDir), "index.mdx");
    const row = /^\| \[Icons\]\(\/docs\/icons\/icon\) \| (.+) \|$/m.exec(index);
    expect(row?.[1] ?? "").toContain(`${count} monochrome icons`);

    // The page it links prints the same number in the sentence a search
    // result shows, so the two surfaces cannot disagree.
    const page = read(new URL("packages/icons/docs/", root), "icon.mdx");
    expect(page).toContain(`${count} monochrome icons`);
  });
});
