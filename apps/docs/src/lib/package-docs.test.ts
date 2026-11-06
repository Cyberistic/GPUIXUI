import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import {
  collectionAt,
  collectionOwns,
  packageCollections,
  packageSections,
} from "./collection-routes";
import { curatedTwinOf } from "./curated-twins";

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("content/docs/", new URL("apps/docs/", root));

const mdxFiles = (dir: URL): ReadonlyArray<string> =>
  existsSync(dir)
    ? readdirSync(dir).filter((name) => name.endsWith(".mdx"))
    : [];

const read = (dir: URL, name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

const sitePages = (dir: URL, slugs: ReadonlyArray<string> = []): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return sitePages(new URL(`${entry.name}/`, dir), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];
    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [`/${path.join("/")}`];
  });

const YAML_RESERVED = /^[`@*&[\]{}>|%#]/;

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

  it("claim one route each, at the root", () => {
    const routes = packageCollections.map((collection) => collection.route);

    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.every((route) => route.startsWith("/"))).toBe(true);
  });

  it("serve each page from the collection that owns its directory", () => {
    expect(collectionOwns("charts", "charts/charts.mdx")).toBe(true);
    expect(collectionOwns("data", "charts/charts.mdx")).toBe(false);

    expect(collectionOwns("data", "advanced-filter.mdx")).toBe(true);

    expect(collectionOwns("components", "dialog.mdx")).toBe(true);
  });

  it("answer a nested collection route, and the pages under it", () => {
    const charts = collectionAt(["graphics", "charts"]);
    expect(charts?.collection.origin).toBe("charts");
    expect(charts?.rest).toEqual([]);

    const page = collectionAt(["graphics", "charts", "charts"]);
    expect(page?.collection.origin).toBe("charts");
    expect(page?.rest).toEqual(["charts"]);

    expect(collectionAt(["graphics", "icons", "icon"])?.collection.origin).toBe(
      "icons",
    );

    expect(collectionAt(["components", "dialog"])?.collection.origin).toBe(
      "components",
    );

    expect(collectionAt(["graphics", "nothing-here"])).toBeUndefined();
  });

  it("fill a section that the site defines", () => {
    const sections = new Set(packageSections.map((section) => section.name));

    expect(
      packageCollections.filter(
        (collection) => !sections.has(collection.section),
      ),
    ).toEqual([]);

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

  const curated = new Set([
    "/components/accordion",
    "/components/alert",
    "/components/avatar",
    "/components/badge",
    "/components/breadcrumb",
    "/components/card",
    "/components/calendar",
    "/components/carousel",
    "/components/collapsible",
    "/components/color-picker",
    "/components/combobox",
    "/components/command-menu",
    "/components/confirm-dialog",
    "/components/context-menu",
    "/components/date-picker",
    "/components/dialog",
    "/components/drawer",
    "/components/dropdown-menu",
    "/components/empty-state",
    "/components/field",
    "/components/form",
    "/components/inline-edit",
    "/components/list",
    "/components/navigation-menu",
    "/components/pagination",
    "/components/popover",
    "/components/search-input",
    "/components/stepper",
    "/components/tag-input",
    "/components/tabs",
    "/components/time-picker",
    "/components/timeline",
    "/components/toast",
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
      [...index.matchAll(/\]\((\/[a-z0-9/-]+)\)/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    );

    const unlinked = packageCollections
      .filter((collection) => collection.section === "Primitives")
      .flatMap((collection) =>
        mdxFiles(new URL(`${collection.dir}/`, root)).flatMap((name) => {
          const url = `${collection.route}/${name.replace(/\.mdx$/, "")}`;
          const curated = curatedTwinOf(url);
          return linked.has(url) ||
            (curated !== undefined && linked.has(curated))
            ? []
            : [url];
        }),
      );

    expect(unlinked).toEqual([]);
  });

  it("prints the icon count the set ships, not the one it shipped before", () => {
    const names = read(new URL("packages/icons/src/", root), "names.ts");
    const listed = /export const ICON_NAMES = \[([\s\S]*?)\]/.exec(names)?.[1];
    const count = (listed?.match(/^\s*"/gm) ?? []).length;

    expect(count, "the set's name list is empty").toBeGreaterThan(40);

    const index = read(new URL("primitives/", docsDir), "index.mdx");
    const row = /^\| \[Icons\]\(\/graphics\/icons\/icon\) \| (.+) \|$/m.exec(
      index,
    );
    expect(row?.[1] ?? "").toContain(`${count} monochrome icons`);

    const page = read(new URL("packages/icons/docs/", root), "icon.mdx");
    expect(page).toContain(`${count} monochrome icons`);
  });
});
