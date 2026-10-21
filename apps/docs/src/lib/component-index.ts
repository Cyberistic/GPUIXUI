import { packageCollections } from "./collection-routes";

/**
 * The component index.
 *
 * The Components section had forty pages and no way to scan them: the sidebar
 * lists names, the search box needs a query, and a reader arriving from the
 * landing page had prose to read before finding a component. The index is built
 * from the same frontmatter the pages render, so its titles and descriptions
 * cannot drift from the pages, and a page added to any collection appears here
 * without a docs change.
 */

/** One docs file, as the glob read it: a repo-relative path and its source. */
export interface ComponentPage {
  /** `content/docs/components/dialog.mdx`, `packages/components/docs/card.mdx`. */
  readonly file: string;
  readonly source: string;
}

/** One row the index renders. */
export interface ComponentEntry {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  /** The sidebar section the page belongs to: `Primitives` or `Components`. */
  readonly section: string;
}

/** The section the site's own component pages belong to. */
const siteSection = "Components";

/** The sidebar order: primitives first, then the composed components. */
const sectionOrder = packageCollections.reduce<ReadonlyArray<string>>(
  (order, collection) =>
    order.includes(collection.section) ? order : [...order, collection.section],
  [],
);

/** Where a docs file is served, or `undefined` when it is not a component page. */
export const pageUrl = (file: string): string | undefined => {
  const site = /^content\/docs\/components\/(.+)\.mdx$/.exec(file);
  if (site !== null) return indexUrl("/docs/components", site[1]);

  const packaged = /^packages\/([^/]+)\/docs\/(.+)\.mdx$/.exec(file);
  if (packaged === null) return undefined;

  const collection = packageCollections.find(
    (candidate) => candidate.dir === `packages/${packaged[1]}/docs`,
  );
  return collection === undefined
    ? undefined
    : indexUrl(collection.route, packaged[2]);
};

/** `index.mdx` is its folder's landing page, not a component. */
const indexUrl = (
  route: string,
  name: string | undefined,
): string | undefined =>
  name === undefined || name === "index" ? undefined : `${route}/${name}`;

/** The sidebar section a docs file belongs to. */
const sectionOf = (file: string): string | undefined => {
  if (file.startsWith("content/docs/components/")) return siteSection;
  return packageCollections.find((collection) =>
    file.startsWith(`${collection.dir}/`),
  )?.section;
};

/** A frontmatter scalar; the packages quote a value a YAML parser would reject. */
const frontmatterValue = (head: string, key: string): string | undefined => {
  const value = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1]?.trim();
  if (value === undefined) return undefined;
  return value.startsWith('"') || value.startsWith("'")
    ? value.slice(1, -1)
    : value;
};

const frontmatter = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

/** One page's row, or `undefined` when it has no title or is not a component. */
const entryOf = (page: ComponentPage): ComponentEntry | undefined => {
  const url = pageUrl(page.file);
  const section = sectionOf(page.file);
  if (url === undefined || section === undefined) return undefined;

  const head = frontmatter(page.source);
  const title = frontmatterValue(head, "title");
  if (title === undefined) return undefined;

  return {
    title,
    description: frontmatterValue(head, "description") ?? "",
    url,
    section,
  };
};

/**
 * Every component page, one row per URL.
 *
 * A curated page shadows the package page that shares its URL, so the first
 * page read wins; the data module reads the site's pages first for that reason.
 */
export const buildIndex = (
  pages: ReadonlyArray<ComponentPage>,
): ReadonlyArray<ComponentEntry> => {
  const seen = new Set<string>();
  const entries = pages.flatMap((page) => {
    const entry = entryOf(page);
    if (entry === undefined || seen.has(entry.url)) return [];
    seen.add(entry.url);
    return [entry];
  });

  return sectionOrder.flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .toSorted((left, right) => left.title.localeCompare(right.title)),
  );
};

/**
 * The rows a reader's query keeps.
 *
 * Every whitespace-separated term must appear in the row, so "search input"
 * finds the search field and not every input, and a term matches the section so
 * "primitives" narrows to that lane.
 */
export const filterEntries = (
  entries: ReadonlyArray<ComponentEntry>,
  query: string,
): ReadonlyArray<ComponentEntry> => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return entries;

  return entries.filter((entry) => {
    const haystack =
      `${entry.title} ${entry.description} ${entry.section}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
};
