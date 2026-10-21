import {
  buildIndex,
  type ComponentEntry,
  type ComponentPage,
} from "./component-index";

/**
 * The component index, read at build time.
 *
 * The site's own component pages come first: a curated page shadows the package
 * page that shares its URL, and `buildIndex` keeps the first row. The packages'
 * files are read as the page count grows, so nothing has to be listed here.
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

export const componentIndex: ReadonlyArray<ComponentEntry> = buildIndex([
  ...pages(siteFiles),
  ...pages(packageFiles),
]);
