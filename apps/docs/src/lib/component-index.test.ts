import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  filterEntries,
  pageUrl,
  type ComponentEntry,
  type ComponentPage,
} from "./component-index";
import { componentIndex } from "./component-index-data";
import { packageCollections } from "./collection-routes";

/**
 * The component index, and the rows it is allowed to show.
 *
 * The index is generated from the pages' own frontmatter, which makes two
 * failures silent: a page whose URL the mapping does not know simply vanishes
 * from the list, and a curated page that does not win its URL is listed twice.
 * The guards fix the mapping, the shadowing and the filter, then hold the real
 * index to the files on disk.
 */

const page = (
  file: string,
  title?: string,
  description?: string,
): ComponentPage => ({
  file,
  source: [
    "---",
    ...(title === undefined ? [] : [`title: ${title}`]),
    ...(description === undefined ? [] : [`description: ${description}`]),
    "---",
    "",
    "Body.",
  ].join("\n"),
});

const entry = (
  title: string,
  section: string,
  description = "",
): ComponentEntry => ({
  title,
  description,
  section,
  url: `/docs/${section.toLowerCase()}/${title.toLowerCase()}`,
});

const root = new URL("../../../../", import.meta.url);

const packageFiles = (): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    readdirSync(new URL(`${collection.dir}/`, root))
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => `${collection.dir}/${name}`),
  );

describe("the index's URL mapping", () => {
  it("maps a curated page and each package's pages to their route", () => {
    expect(pageUrl("content/docs/components/dialog.mdx")).toBe(
      "/docs/components/dialog",
    );
    expect(pageUrl("packages/components/docs/card.mdx")).toBe(
      "/docs/components/card",
    );
    expect(pageUrl("packages/primitives/docs/slider.mdx")).toBe(
      "/docs/primitives/slider",
    );
    expect(pageUrl("packages/icons/docs/icon.mdx")).toBe("/docs/icons/icon");
  });

  it("drops a section index and a file that is not a component page", () => {
    expect(pageUrl("content/docs/components/index.mdx")).toBeUndefined();
    expect(pageUrl("content/docs/installation.mdx")).toBeUndefined();
    expect(pageUrl("packages/components/README.md")).toBeUndefined();
  });
});

describe("the index built from pages", () => {
  it("keeps the first page for a URL, so a curated page shadows the package's", () => {
    const entries = buildIndex([
      page("content/docs/components/dialog.mdx", "Dialog", "The curated one."),
      page("packages/components/docs/dialog.mdx", "Dialog", "The package one."),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.description).toBe("The curated one.");
  });

  it("orders primitives before components and each section by title", () => {
    const entries = buildIndex([
      page("packages/components/docs/tabs.mdx", "Tabs"),
      page("packages/primitives/docs/button.mdx", "Button"),
      page("packages/components/docs/accordion.mdx", "Accordion"),
      page("packages/icons/docs/icon.mdx", "Icon"),
    ]);

    expect(entries.map((row) => row.title)).toEqual([
      "Button",
      "Icon",
      "Accordion",
      "Tabs",
    ]);
    expect(entries.map((row) => row.section)).toEqual([
      "Primitives",
      "Primitives",
      "Components",
      "Components",
    ]);
  });

  it("drops a page with no title instead of listing a blank row", () => {
    const entries = buildIndex([
      page("packages/components/docs/card.mdx"),
      page("packages/components/docs/badge.mdx", "Badge", "A status label."),
    ]);

    expect(entries.map((row) => row.title)).toEqual(["Badge"]);
  });
});

describe("the filter", () => {
  const entries = [
    entry("Search input", "Components", "A field that queries a list."),
    entry("Input", "Primitives", "A single-line text field."),
    entry("Dialog", "Components", "A modal surface."),
  ];

  it("returns every row for an empty or blank query", () => {
    expect(filterEntries(entries, "")).toEqual(entries);
    expect(filterEntries(entries, "   ")).toEqual(entries);
  });

  it("matches a title, a description or a section, ignoring case", () => {
    expect(filterEntries(entries, "SEARCH")).toHaveLength(1);
    expect(filterEntries(entries, "modal")).toHaveLength(1);
    expect(filterEntries(entries, "primitives")).toEqual([entries[1]]);
  });

  it("requires every term, so a second word narrows rather than widens", () => {
    expect(filterEntries(entries, "input")).toHaveLength(2);
    expect(filterEntries(entries, "search input")).toHaveLength(1);
    expect(filterEntries(entries, "search dialog")).toEqual([]);
  });
});

describe("the real index", () => {
  it("lists every component page once", () => {
    const urls = componentIndex.map((row) => row.url);

    expect(componentIndex.length).toBeGreaterThan(60);
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      componentIndex.filter((row) => row.description.trim() === ""),
    ).toEqual([]);
  });

  it("has a row for every file the packages ship, unless a curated page shadows it", () => {
    const listed = new Set(componentIndex.map((row) => row.url));
    const curated = new Set(
      readdirSync(new URL("apps/docs/content/docs/components/", root))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .map((name) => `/docs/components/${name.replace(/\.mdx$/, "")}`),
    );

    const missing = packageFiles().filter((file) => {
      const url = pageUrl(file);
      if (url === undefined) return true;
      // The curated page owns the URL; the package row is shadowed on purpose.
      return !listed.has(url) && !curated.has(url);
    });

    expect(missing).toEqual([]);
  });

  it("starts with the primitives and ends with the components", () => {
    expect(componentIndex.length).toBeGreaterThan(0);
    expect(componentIndex[0]?.section).toBe("Primitives");
    expect(componentIndex.at(-1)?.section).toBe("Components");
  });
});
