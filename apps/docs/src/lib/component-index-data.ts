import {
  buildIndex,
  type ComponentEntry,
  type ComponentPage,
  type PageIdentity,
  type PageVerdict,
} from "./component-index";
import { inventory } from "./inventory-data";
import { statusForPage } from "./inventory-status";
import { curatedPrimitiveTwins } from "./curated-twins";

/**
 * The component index, read at build time.
 *
 * The site's own component pages come first: a curated page shadows the package
 * page that shares its URL, and `buildIndex` keeps the first row. The packages'
 * files are read as the page count grows, so nothing has to be listed here.
 *
 * Each row carries the `COMPONENTS.md` verdict the page's status strip prints,
 * resolved through the same alias table, so the list can mark a component the
 * runtime supports only in part.
 */
const siteFiles = import.meta.glob("../../content/docs/components/**/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

const packageFiles = import.meta.glob("../../../../packages/*/docs/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** A glob key is relative to this module; the index names repo-relative files. */
const repoRelative = (key: string): string => key.replace(/^(\.\.\/)+/, "");

const pages = (files: Readonly<Record<string, string>>): ComponentPage[] =>
  Object.entries(files).map(([file, source]) => ({
    file: repoRelative(file),
    source,
  }));

const verdictOf = (page: PageIdentity): PageVerdict | undefined => {
  const status = statusForPage(inventory, page);
  return status.kind === "row"
    ? { status: status.row.status, support: status.row.support }
    : undefined;
};

export const componentIndex: ReadonlyArray<ComponentEntry> = buildIndex(
  [...pages(siteFiles), ...pages(packageFiles)],
  verdictOf,
);

/** The composed lane, which is what the Components page's grid lists. */
export const componentPages: ReadonlyArray<ComponentEntry> =
  componentIndex.filter((entry) => entry.section === "Components");

/**
 * The Tier 1 lane, without the pages a curated page replaces.
 *
 * Five primitives are documented in full under `/components` and their package
 * URL redirects there (`curated-twins.ts`), so listing the retired address
 * again would offer a reader a component they cannot reach. Everything else in
 * the lane is its own page.
 */
export const primitivePages: ReadonlyArray<ComponentEntry> =
  componentIndex.filter(
    (entry) =>
      entry.section === "Primitives" &&
      !curatedPrimitiveTwins.some((twin) => twin.retired === entry.url),
  );
